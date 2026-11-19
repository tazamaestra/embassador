// Pedido hecho por un cliente desde su cuenta.
//
//   POST /api/mi-cuenta/pedidos  { items: [{ cafe, presentacion, cantidad }], entrega: { linea, ciudad, departamento, notas? } }
//
// Nombre, correo y teléfono salen de su ficha. El precio sale del catálogo
// (nunca del navegador). Con el inventario conectado, el pedido se crea allá
// (POST /pedidos, ver docs/contrato-api-inventario.md); si no está, da
// error (los pedidos solo viven en el inventario).

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { obtenerCafes } from "@/lib/servidor/cafes";
import { leerSesion, respuestaError } from "@/lib/servidor/sesion";
import { aCliente } from "@/lib/clientes";
import { armarLineas, PedidoInvalido, totalDe, validarEntrega } from "@/lib/pedidos";
import { registrarPedido } from "@/lib/servidor/pedidos";
import { generarReferencia } from "@/lib/wompi";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const sesion = await leerSesion(request);
  if (!sesion) return respuestaError("sin_sesion", 401);

  const cuerpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!cuerpo) return respuestaError("cuerpo_invalido", 400);

  const db = crearClienteAdmin();
  const { data: fila } = await db.from("clientes").select("*").eq("id", sesion.id).maybeSingle();
  if (!fila) return respuestaError("sin_ficha", 404);
  const cliente = aCliente(fila);
  if (!cliente.activo) return respuestaError("inactivo", 403);

  let items, entrega;
  try {
    items = armarLineas(cuerpo.items, await obtenerCafes());
    entrega = validarEntrega(cuerpo.entrega);
  } catch (e) {
    if (e instanceof PedidoInvalido) return respuestaError("campo_invalido", 400, { campo: e.campo });
    throw e;
  }

  const registro = await registrarPedido({
    referencia: generarReferencia("PED"),
    origen: "cuenta",
    cliente,
    contacto: {
      nombre: cliente.negocio ? `${cliente.nombre} · ${cliente.negocio}` : cliente.nombre || cliente.email,
      email: cliente.email,
      telefono: cliente.telefono || "—",
    },
    entrega,
    items,
    totalCop: totalDe(items),
  });
  if (!registro.ok) {
    const status = registro.motivo === "validacion" ? 400 : registro.motivo === "cliente_no_encontrado" ? 409 : 502;
    return respuestaError(registro.motivo === "no_disponible" ? "pedido_no_creado" : registro.motivo, status, { mensaje: registro.mensaje });
  }

  return NextResponse.json({ pedido: registro.pedido });
}

// Compra desde el carrito: crea el pedido y, si la pasarela está
// configurada, devuelve los parámetros firmados del Web Checkout de Wompi.
//
//   POST /api/checkout  { items: [{ cafe, presentacion, cantidad }], contacto, locale }
//
// No pide cuenta: compra quien sea. Si viene sesión, el pedido queda ligado
// al cliente. El precio se calcula AQUÍ, desde el catálogo con las
// ediciones del panel; nunca se confía en el monto del navegador.
// Sin Wompi configurado, el pedido queda "pendiente" y el equipo cobra por
// fuera: la tienda funciona igual mientras se conecta la pasarela.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { registrarPedido } from "@/lib/servidor/pedidos";
import { aCliente } from "@/lib/clientes";
import { obtenerCafes } from "@/lib/servidor/cafes";
import { leerSesion, respuestaError } from "@/lib/servidor/sesion";
import { armarLineas, PedidoInvalido, totalDe, validarContacto } from "@/lib/pedidos";
import {
  WOMPI_CHECKOUT_URL, WOMPI_PUBLIC_KEY, aCentavos, firmaIntegridad,
  generarReferencia, wompiConfigurado,
} from "@/lib/wompi";

export const dynamic = "force-dynamic";

const MONEDA = "COP";

export async function POST(request: Request) {
  const cuerpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!cuerpo) return respuestaError("cuerpo_invalido", 400);

  let items, contacto;
  try {
    items = armarLineas(cuerpo.items, await obtenerCafes());
    contacto = validarContacto(cuerpo.contacto);
  } catch (e) {
    if (e instanceof PedidoInvalido) return respuestaError("campo_invalido", 400, { campo: e.campo });
    throw e;
  }

  const db = crearClienteAdmin();
  const sesion = await leerSesion(request);
  const totalCop = totalDe(items);
  const referencia = generarReferencia("PED");
  const conPasarela = wompiConfigurado();

  // Con sesión de un cliente con ficha, el pedido va a su nombre; si no, es
  // un comprador ocasional.
  const { data: fila } = sesion ? await db.from("clientes").select("*").eq("id", sesion.id).maybeSingle() : { data: null };
  const cliente = fila ? aCliente(fila) : null;

  const registro = await registrarPedido(db, {
    referencia,
    origen: "tienda",
    cliente: cliente?.documento ? cliente : null,
    contacto: { nombre: contacto.nombre, email: contacto.email, telefono: contacto.telefono },
    entrega: { linea: contacto.linea, ciudad: contacto.ciudad, departamento: contacto.departamento, notas: contacto.notas },
    items,
    totalCop,
  });
  if (!registro.ok) return respuestaError("pedido_no_creado", registro.motivo === "validacion" ? 400 : 502, { mensaje: registro.mensaje });

  const locale = cuerpo.locale === "en" ? "en" : "es";
  const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const redirectUrl = `${sitio}/${locale}/confirmacion?ref=${referencia}`;

  if (!conPasarela) {
    return NextResponse.json({ referencia, totalCop, sinPasarela: true, redirectUrl });
  }

  const montoEnCentavos = aCentavos(totalCop);
  return NextResponse.json({
    referencia,
    totalCop,
    checkoutUrl: WOMPI_CHECKOUT_URL,
    publicKey: WOMPI_PUBLIC_KEY,
    montoEnCentavos,
    moneda: MONEDA,
    firma: firmaIntegridad({ referencia, montoEnCentavos, moneda: MONEDA }),
    redirectUrl,
  });
}

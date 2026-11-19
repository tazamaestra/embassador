// Dónde viven los pedidos. SOLO SERVIDOR.
//
//   · Con INVENTARIO_API_URL: el inventario es la fuente de verdad. Los
//     pedidos se crean allá (POST /pedidos) y se leen de allá.
//   · Sin ella (mientras se construye la API): respaldo local en la tabla
//     pedidos_tienda, como hasta ahora.
//
// Las rutas (checkout, cuenta del cliente, webhook) solo hablan con este
// archivo; cambiar de uno a otro es configurar la variable.

import type { SupabaseClient } from "@supabase/supabase-js";
import { aPedido } from "@/lib/pedidos";
import {
  aPedidoWeb, crearPedidoEnInventario, informarPagoAlInventario, inventarioConectado, pedidosDeCliente,
} from "@/lib/servidor/inventario";
import type { CrearPedidoInventario } from "@/lib/inventario-contrato";
import type { Cliente, EstadoPedido, LineaPedido, Pedido } from "@/lib/types";

export interface NuevoPedido {
  referencia: string;
  origen: "cuenta" | "tienda";
  /** Cliente con cuenta, o null si es un comprador ocasional de la tienda. */
  cliente: Cliente | null;
  contacto: { nombre: string; email: string; telefono: string };
  entrega: { linea: string; ciudad: string; departamento: string; notas: string };
  items: LineaPedido[];
  totalCop: number;
}

export type ResultadoRegistro =
  | { ok: true; pedido: Pedido }
  | { ok: false; motivo: "validacion" | "cliente_no_encontrado" | "no_disponible"; mensaje?: string };

/** Lo que la web manda al inventario (POST /pedidos). */
export function aPedidoInventario(p: NuevoPedido): CrearPedidoInventario {
  return {
    referencia_web: p.referencia,
    origen: p.origen,
    cliente: p.cliente?.documento ? { tipo: "registrado", documento: p.cliente.documento } : { tipo: "ocasional" },
    contacto: p.contacto,
    entrega: { direccion: p.entrega.linea, ciudad: p.entrega.ciudad, departamento: p.entrega.departamento, notas: p.entrega.notas },
    items: p.items.map((l) => ({
      producto: l.cafe,
      nombre: l.nombre,
      presentacion: l.presentacion === "negocio" ? "cuarteron" : "bolsa",
      gramos: l.pesoG,
      cantidad: l.cantidad,
      precio_unitario: l.precioCop,
    })),
    total: p.totalCop,
    moneda: "COP",
    creado_en: new Date().toISOString(),
  };
}

export async function registrarPedido(db: SupabaseClient, p: NuevoPedido): Promise<ResultadoRegistro> {
  if (inventarioConectado()) {
    const r = await crearPedidoEnInventario(aPedidoInventario(p));
    if (!r.ok) return { ok: false, motivo: r.motivo };
    return { ok: true, pedido: aPedidoWeb(r.pedido, p.cliente?.id ?? null) };
  }

  const { data, error } = await db
    .from("pedidos_tienda")
    .insert({
      cliente_id: p.cliente?.id ?? null,
      ...p.contacto,
      ...p.entrega,
      items: p.items,
      total_cop: p.totalCop,
      estado: "pendiente",
      referencia: p.referencia,
    })
    .select("*")
    .single();
  if (error) return { ok: false, motivo: "no_disponible", mensaje: error.message };
  return { ok: true, pedido: aPedido(data) };
}

/** Los pedidos de un cliente. null = el inventario no respondió. */
export async function pedidosDelCliente(db: SupabaseClient, cliente: Cliente): Promise<Pedido[] | null> {
  if (inventarioConectado()) {
    const lista = await pedidosDeCliente(cliente.documento);
    return lista === null ? null : lista.map((p) => aPedidoWeb(p, cliente.id));
  }
  const { data } = await db
    .from("pedidos_tienda")
    .select("*")
    .eq("cliente_id", cliente.id)
    .order("creado_en", { ascending: false })
    .limit(100);
  return (data ?? []).map(aPedido);
}

/** Resultado de la pasarela de pago para un pedido. */
export async function registrarPago(
  db: SupabaseClient,
  referencia: string,
  pago: { aprobada: boolean; transaccion: string; montoCop: number }
): Promise<void> {
  if (inventarioConectado()) {
    const ok = await informarPagoAlInventario(referencia, {
      estado: pago.aprobada ? "pagado" : "fallido",
      pasarela: "wompi",
      transaccion: pago.transaccion,
      monto: pago.montoCop,
    });
    if (!ok) throw new Error("El inventario no recibió el pago");
    return;
  }
  const estado: EstadoPedido = pago.aprobada ? "pagado" : "fallido";
  const { error } = await db
    .from("pedidos_tienda")
    .update({ estado, wompi_transaccion: pago.transaccion })
    .eq("referencia", referencia)
    .in("estado", ["pendiente", "fallido"]);
  if (error) throw error;
}

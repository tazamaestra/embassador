// Pedidos de la web. SOLO SERVIDOR.
//
// El inventario es la fuente de verdad: los pedidos se crean allá
// (POST /pedidos), se leen de allá y allá se cambian de estado. La web no
// guarda pedidos. Sin INVENTARIO_API_URL no se pueden hacer pedidos.
//
// Las rutas (checkout, cuenta del cliente, webhook) solo hablan con este
// archivo. Contrato: docs/contrato-api-inventario.md.

import {
  aPedidoWeb, claveInventario, crearPedidoEnInventario, informarPagoAlInventario, inventarioConectado, pedidosDeCliente,
} from "@/lib/servidor/inventario";
import type { CrearPedidoInventario } from "@/lib/inventario-contrato";
import type { Cliente, LineaPedido, Pedido } from "@/lib/types";

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
    cliente: p.cliente?.inventarioId
      ? { tipo: "registrado", id: p.cliente.inventarioId, ...(p.cliente.documento ? { documento: p.cliente.documento } : {}) }
      : p.cliente?.documento
        ? { tipo: "registrado", documento: p.cliente.documento }
        : { tipo: "ocasional" },
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

export async function registrarPedido(p: NuevoPedido): Promise<ResultadoRegistro> {
  if (!inventarioConectado()) {
    console.error("[pedidos] Falta INVENTARIO_API_URL: no se puede registrar el pedido.");
    return { ok: false, motivo: "no_disponible", mensaje: "Inventario sin configurar" };
  }
  const r = await crearPedidoEnInventario(aPedidoInventario(p));
  if (!r.ok) return { ok: false, motivo: r.motivo };
  return { ok: true, pedido: aPedidoWeb(r.pedido, p.cliente?.id ?? null) };
}

/** Los pedidos de un cliente. null = el inventario no respondió o no está configurado. */
export async function pedidosDelCliente(cliente: Cliente): Promise<Pedido[] | null> {
  if (!inventarioConectado()) return null;
  const lista = await pedidosDeCliente(claveInventario(cliente));
  return lista === null ? null : lista.map((p) => aPedidoWeb(p, cliente.id));
}

/** Resultado de la pasarela de pago para un pedido. Lanza si el inventario no lo recibe. */
export async function registrarPago(
  referencia: string,
  pago: { aprobada: boolean; transaccion: string; montoCop: number }
): Promise<void> {
  if (!inventarioConectado()) throw new Error("Falta INVENTARIO_API_URL");
  const ok = await informarPagoAlInventario(referencia, {
    estado: pago.aprobada ? "pagado" : "fallido",
    pasarela: "wompi",
    transaccion: pago.transaccion,
    monto: pago.montoCop,
  });
  if (!ok) throw new Error("El inventario no recibió el pago");
}

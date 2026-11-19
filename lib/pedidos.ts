// Pedidos de la tienda (compra única desde el carrito). Funciones puras:
// validan lo que manda el navegador y arman las líneas con el precio del
// catálogo. El monto NUNCA viene del navegador.

import { presentacionDe } from "./presentaciones";
import type { EstadoPedido, LineaPedido, Pedido, Product } from "./types";

/** Los que se manejan en el respaldo local (la tabla pedidos_tienda). */
export const ESTADOS_PEDIDO: EstadoPedido[] = ["pendiente", "pagado", "fallido", "enviado", "cancelado"];

export const ETIQUETA_ESTADO_PEDIDO: Record<EstadoPedido, [string, string]> = {
  pendiente: ["Pendiente de pago", "Awaiting payment"],
  confirmado: ["Confirmado", "Confirmed"],
  entregado: ["Entregado", "Delivered"],
  pagado: ["Pagado", "Paid"],
  fallido: ["Pago fallido", "Payment failed"],
  enviado: ["Enviado", "Shipped"],
  cancelado: ["Cancelado", "Cancelled"],
};

export class PedidoInvalido extends Error {
  constructor(public campo: string) {
    super(campo);
    this.name = "PedidoInvalido";
  }
}

const MAX_LINEAS = 20;
const MAX_CANTIDAD = 50;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Las líneas del carrito → líneas con nombre, peso y precio del catálogo. */
export function armarLineas(crudo: unknown, catalogo: Product[]): LineaPedido[] {
  if (!Array.isArray(crudo) || crudo.length === 0 || crudo.length > MAX_LINEAS) throw new PedidoInvalido("items");
  const porClave = new Map<string, LineaPedido>();
  for (const x of crudo) {
    const r = (x ?? {}) as Record<string, unknown>;
    const cafe = catalogo.find((p) => p.id === r.cafe);
    if (!cafe) throw new PedidoInvalido("items");
    const pres = presentacionDe(cafe, r.presentacion ?? "bolsa");
    if (!pres) throw new PedidoInvalido("items");
    const cantidad = Number(r.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) throw new PedidoInvalido("items");

    // La misma presentación dos veces se suma en una sola línea.
    const clave = `${cafe.id}:${pres.id}`;
    const previa = porClave.get(clave);
    porClave.set(clave, {
      cafe: cafe.id,
      nombre: cafe.name,
      presentacion: pres.id,
      pesoG: pres.pesoG,
      cantidad: Math.min(MAX_CANTIDAD, (previa?.cantidad ?? 0) + cantidad),
      precioCop: pres.precioCop,
    });
  }
  return [...porClave.values()];
}

export function totalDe(lineas: LineaPedido[]): number {
  return lineas.reduce((s, l) => s + l.precioCop * l.cantidad, 0);
}

export interface Contacto {
  nombre: string;
  email: string;
  telefono: string;
  linea: string;
  ciudad: string;
  departamento: string;
  notas: string;
}

export const CONTACTO_VACIO: Contacto = {
  nombre: "", email: "", telefono: "", linea: "", ciudad: "", departamento: "", notas: "",
};

/** Datos de quien compra y a dónde va. Lanza PedidoInvalido con el campo malo. */
export function validarContacto(crudo: unknown): Contacto {
  const r = (crudo ?? {}) as Record<string, unknown>;
  const campo = (k: keyof Contacto, max: number, requerido = true) => {
    const v = typeof r[k] === "string" ? (r[k] as string).trim().replace(/\s+/g, " ") : "";
    if ((requerido && !v) || v.length > max) throw new PedidoInvalido(k);
    return v;
  };
  const c: Contacto = {
    nombre: campo("nombre", 100),
    email: campo("email", 160).toLowerCase(),
    telefono: campo("telefono", 30),
    linea: campo("linea", 200),
    ciudad: campo("ciudad", 80),
    departamento: campo("departamento", 80),
    notas: campo("notas", 300, false),
  };
  if (!EMAIL.test(c.email)) throw new PedidoInvalido("email");
  if (c.telefono.replace(/\D/g, "").length < 7) throw new PedidoInvalido("telefono");
  return c;
}

export function aPedido(f: Record<string, unknown>): Pedido {
  const estado = ESTADOS_PEDIDO.includes(f.estado as EstadoPedido) ? (f.estado as EstadoPedido) : "pendiente";
  const t = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    id: String(f.id),
    creadoEn: String(f.creado_en ?? ""),
    clienteId: typeof f.cliente_id === "string" ? f.cliente_id : null,
    email: t(f.email),
    nombre: t(f.nombre),
    telefono: t(f.telefono),
    linea: t(f.linea),
    ciudad: t(f.ciudad),
    departamento: t(f.departamento),
    notas: t(f.notas),
    items: Array.isArray(f.items) ? (f.items as LineaPedido[]) : [],
    totalCop: Number(f.total_cop ?? 0),
    estado,
    referencia: t(f.referencia),
    cliente: f.clientes && typeof f.clientes === "object"
      ? { negocio: t((f.clientes as Record<string, unknown>).negocio), nombre: t((f.clientes as Record<string, unknown>).nombre) }
      : null,
  };
}

/** Pedidos que cuentan como compra hecha (para las horas mientras no hay inventario). */
export const ESTADOS_CONFIRMADOS: EstadoPedido[] = ["pagado", "enviado", "entregado"];

/** Datos de entrega de un pedido hecho desde la cuenta: el resto sale de la ficha. */
export interface Entrega {
  linea: string;
  ciudad: string;
  departamento: string;
  notas: string;
}

export function validarEntrega(crudo: unknown): Entrega {
  const r = (crudo ?? {}) as Record<string, unknown>;
  const campo = (k: keyof Entrega, max: number, requerido = true) => {
    const v = typeof r[k] === "string" ? (r[k] as string).trim().replace(/\s+/g, " ") : "";
    if ((requerido && !v) || v.length > max) throw new PedidoInvalido(k);
    return v;
  };
  return {
    linea: campo("linea", 200),
    ciudad: campo("ciudad", 80),
    departamento: campo("departamento", 80),
    notas: campo("notas", 300, false),
  };
}

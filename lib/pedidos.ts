// Pedidos de la tienda (compra única desde el carrito). Funciones puras:
// validan lo que manda el navegador y arman las líneas con el precio del
// catálogo. En la tienda el monto NUNCA viene del navegador; solo los
// pedidos desde la cuenta del cliente pueden ajustar el precio unitario.

import { presentacionDe } from "./presentaciones";
import type { EstadoPedido, LineaPedido, Molienda, Product } from "./types";

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

const PRECIO_MIN = 1_000;
const PRECIO_MAX = 10_000_000;

/**
 * Las líneas del carrito → líneas con nombre, peso y precio del catálogo.
 * Con `cuenta` (solo pedidos desde la cuenta del cliente) se usan los
 * precios de cliente, cada línea puede traer su `precioCop` (entero en
 * pesos; si no lo trae, va el del catálogo) y su `molienda` ("grano" por
 * defecto, o "molido").
 */
export function armarLineas(crudo: unknown, catalogo: Product[], opciones: { cuenta?: boolean } = {}): LineaPedido[] {
  if (!Array.isArray(crudo) || crudo.length === 0 || crudo.length > MAX_LINEAS) throw new PedidoInvalido("items");
  const porClave = new Map<string, LineaPedido>();
  for (const x of crudo) {
    const r = (x ?? {}) as Record<string, unknown>;
    const cafe = catalogo.find((p) => p.id === r.cafe);
    if (!cafe) throw new PedidoInvalido("items");
    const pres = presentacionDe(cafe, r.presentacion ?? "bolsa", opciones.cuenta ? "cuenta" : "tienda");
    if (!pres) throw new PedidoInvalido("items");
    const cantidad = Number(r.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) throw new PedidoInvalido("items");

    let precioCop = pres.precioCop;
    if (opciones.cuenta && r.precioCop !== undefined && r.precioCop !== null) {
      precioCop = Number(r.precioCop);
      if (!Number.isInteger(precioCop) || precioCop < PRECIO_MIN || precioCop > PRECIO_MAX) throw new PedidoInvalido("precio");
    }

    let molienda: Molienda | undefined;
    if (opciones.cuenta) {
      if (r.molienda !== undefined && r.molienda !== "grano" && r.molienda !== "molido") throw new PedidoInvalido("items");
      molienda = (r.molienda as Molienda | undefined) ?? "grano";
    }

    // La misma presentación (y molienda) dos veces se suma en una sola línea.
    const clave = `${cafe.id}:${pres.id}:${molienda ?? ""}`;
    const previa = porClave.get(clave);
    porClave.set(clave, {
      cafe: cafe.id,
      nombre: cafe.name,
      presentacion: pres.id,
      pesoG: pres.pesoG,
      cantidad: Math.min(MAX_CANTIDAD, (previa?.cantidad ?? 0) + cantidad),
      precioCop,
      ...(molienda ? { molienda } : {}),
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

/** Indicaciones opcionales de un pedido desde la cuenta (máx. 300 caracteres). */
export function validarNotas(crudo: unknown): string {
  const v = typeof crudo === "string" ? crudo.trim().replace(/\s+/g, " ") : "";
  if (v.length > 300) throw new PedidoInvalido("notas");
  return v;
}

/** Datos de entrega (dirección, ciudad, departamento, notas). */
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

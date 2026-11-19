// Cada café se vende en dos presentaciones: la bolsa normal (los precios de
// arriba del producto, los que edita el panel) y el cuarterón para
// cafeterías o negocios (product.negocio). Funciones puras: las usan la
// tienda, el carrito y el servidor que cobra.

import type { Product } from "./types";

export type PresentacionId = "bolsa" | "negocio";

export interface Presentacion {
  id: PresentacionId;
  pesoG: number;
  precioCop: number;
  precioUsd?: number;
}

export function presentacionesDe(p: Product): Presentacion[] {
  const bolsa: Presentacion = {
    id: "bolsa",
    pesoG: p.pesoG,
    precioCop: p.precioCop,
    precioUsd: p.precioUsd,
  };
  return p.negocio ? [bolsa, { id: "negocio", ...p.negocio }] : [bolsa];
}

/** La presentación pedida; sin id (o uno desconocido) cae en la bolsa normal. */
export function presentacionDe(p: Product, id: unknown): Presentacion | undefined {
  const lista = presentacionesDe(p);
  if (id === undefined || id === null || id === "") return lista[0];
  return lista.find((x) => x.id === id);
}

/** Id de la línea del carrito: la bolsa conserva el id del café de siempre. */
export function idLineaCarrito(cafeId: string, presentacion: PresentacionId): string {
  return presentacion === "bolsa" ? cafeId : `${cafeId}--${presentacion}`;
}

/** 2250 → "2.250 g". */
export function formatPeso(pesoG: number): string {
  return `${pesoG.toLocaleString("es-CO")} g`;
}

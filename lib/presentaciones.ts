// Cada café se vende hasta en tres presentaciones: la bolsa normal (los
// precios de arriba del producto, los que edita el panel), la bolsa pequeña
// (product.pequena) y el cuarterón para cafeterías o negocios
// (product.negocio). Hay dos listas de precios: la de la tienda pública y la
// de los clientes con cuenta (precioClienteCop). Funciones puras: las usan
// la tienda, el carrito, la cuenta y el servidor que cobra.

import type { Product } from "./types";

export type PresentacionId = "bolsa" | "pequena" | "negocio";

/** "tienda" = precios de la tienda pública; "cuenta" = precios de cliente. */
export type Canal = "tienda" | "cuenta";

export interface Presentacion {
  id: PresentacionId;
  pesoG: number;
  precioCop: number;
  precioUsd?: number;
}

export function presentacionesDe(p: Product, canal: Canal = "tienda"): Presentacion[] {
  const cliente = canal === "cuenta";
  const lista: Presentacion[] = [
    {
      id: "bolsa",
      pesoG: p.pesoG,
      precioCop: (cliente && p.precioClienteCop) || p.precioCop,
      precioUsd: p.precioUsd,
    },
  ];
  for (const id of ["pequena", "negocio"] as const) {
    const x = p[id];
    if (x) lista.push({ id, pesoG: x.pesoG, precioCop: (cliente && x.precioClienteCop) || x.precioCop, precioUsd: x.precioUsd });
  }
  // De la más pequeña a la más grande.
  return lista.sort((a, b) => a.pesoG - b.pesoG);
}

/** La presentación pedida; sin id cae en la bolsa normal. Un id desconocido da undefined. */
export function presentacionDe(p: Product, id: unknown, canal: Canal = "tienda"): Presentacion | undefined {
  const lista = presentacionesDe(p, canal);
  if (id === undefined || id === null || id === "") return lista.find((x) => x.id === "bolsa");
  return lista.find((x) => x.id === id);
}

/** Id de la línea del carrito: la bolsa conserva el id del café de siempre. */
export function idLineaCarrito(cafeId: string, presentacion: PresentacionId): string {
  return presentacion === "bolsa" ? cafeId : `${cafeId}--${presentacion}`;
}

/** Nombre corto de la presentación. */
export function nombrePresentacion(id: PresentacionId, es: boolean): string {
  if (id === "negocio") return es ? "Cuarterón" : "Large bag";
  if (id === "pequena") return es ? "Bolsa pequeña" : "Small bag";
  return es ? "Bolsa" : "Bag";
}

/** 2250 → "2.250 g". */
export function formatPeso(pesoG: number): string {
  return `${pesoG.toLocaleString("es-CO")} g`;
}

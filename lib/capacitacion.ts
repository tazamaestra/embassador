// Horas de capacitación. Funciones puras: las usan el servidor (resumen del
// cliente), el panel y las pruebas.
//
//   · Base: 1 hora por cada 3 cuarterones, sumando todas las compras.
//   · Regalo: 1 hora más por cada 8 cuarterones comprados dentro de un
//     mismo mes calendario. Así 8 cuarterones en un mes dan 2 + 1 = 3 horas.

import type { Capacitacion, CompraInventario, HorasCapacitacion } from "./types";

/** Cuántos cuarterones hay que comprar por cada hora de capacitación. */
export const CUARTERONES_POR_HORA = 3;

/** Cuarterones en un mismo mes que dan 1 hora de regalo. */
export const CUARTERONES_MES_REGALO = 8;

/** Gramos del cuarterón (la presentación para cafeterías o negocios). */
export const GRAMOS_CUARTERON = 2250;

/**
 * ¿Esta línea del inventario es de cuarterones? Por gramos si los trae; si
 * no, por el texto del producto ("cuarterón", "2.250 g", "2250g").
 */
export function esLineaCuarteron(gramos: number | null, texto: string): boolean {
  if (gramos !== null) return gramos === GRAMOS_CUARTERON;
  return /cuarter[oó]n|2[.,]?250\s*g/i.test(texto);
}

/** "2026-11-18" → "2026-11". */
const mesDe = (fecha: string) => fecha.slice(0, 7);

export function calcularHoras(
  compras: CompraInventario[],
  capacitaciones: Capacitacion[],
  hoy: Date = new Date()
): HorasCapacitacion {
  // Cuarterones por mes (las líneas sin fecha cuentan para la base, no para el regalo).
  const porMes = new Map<string, number>();
  let cuarterones = 0;
  for (const c of compras) {
    if (!c.esCuarteron) continue;
    const cantidad = Math.max(0, c.cantidad);
    cuarterones += cantidad;
    if (c.fecha) porMes.set(mesDe(c.fecha), (porMes.get(mesDe(c.fecha)) ?? 0) + cantidad);
  }

  const regaloPorMes = [...porMes.entries()]
    .map(([mes, n]) => ({ mes, cuarterones: n, horas: Math.floor(n / CUARTERONES_MES_REGALO) }))
    .filter((m) => m.horas > 0)
    .sort((a, b) => b.mes.localeCompare(a.mes));

  const base = Math.floor(cuarterones / CUARTERONES_POR_HORA);
  const regalo = regaloPorMes.reduce((s, m) => s + m.horas, 0);
  const ganadas = base + regalo;
  const usadas = Math.round(capacitaciones.reduce((s, c) => s + c.horas, 0) * 100) / 100;

  const mesActual = hoy.toISOString().slice(0, 7);
  const delMes = porMes.get(mesActual) ?? 0;

  return {
    cuarterones,
    base,
    regalo,
    ganadas,
    usadas,
    disponibles: Math.round((ganadas - usadas) * 100) / 100,
    faltanParaSiguiente: CUARTERONES_POR_HORA - (cuarterones % CUARTERONES_POR_HORA),
    mesActual: {
      mes: mesActual,
      cuarterones: delMes,
      faltanParaRegalo: CUARTERONES_MES_REGALO - (delMes % CUARTERONES_MES_REGALO),
    },
    regaloPorMes,
  };
}

// Cuentas del club de puntos. Los niveles y premios son texto editorial
// (data/suscripcion.json); aquí solo se hace la aritmética.

import { bolsasDelEnvio } from "./suscripcion";
import type { NivelClub, Plan, ReglasSuscripcion } from "./types";

/** El nivel en que cae el envío número `n` (desde 1). */
export function nivelDelEnvio(n: number, niveles: NivelClub[]): NivelClub {
  const orden = [...niveles].sort((a, b) => a.desdeEnvio - b.desdeEnvio);
  return orden.reduce((actual, nivel) => (n >= nivel.desdeEnvio ? nivel : actual), orden[0]);
}

/** Puntos acumulados tras `envios` envíos seguidos. */
export function puntosTras(envios: number, niveles: NivelClub[]): number {
  let total = 0;
  for (let n = 1; n <= envios; n++) total += nivelDelEnvio(n, niveles).puntosEnvio;
  return total;
}

export interface CuentaAnual {
  envios: number;
  bolsas: number;
  bolsasRegalo: number;
  puntos: number;
  nivel: NivelClub;
}

/** Lo que junta en un año quien no suelta la suscripción. */
export function cuentaAnual(
  plan: Plan,
  diasFrecuencia: number,
  reglas: ReglasSuscripcion,
  niveles: NivelClub[]
): CuentaAnual {
  const envios = Math.floor(365 / diasFrecuencia);
  let bolsas = 0;
  let bolsasRegalo = 0;
  for (let hechos = 0; hechos < envios; hechos++) {
    const envio = bolsasDelEnvio({ enviosHechos: hechos }, plan, reglas);
    bolsas += envio.bolsas;
    bolsasRegalo += envio.bolsas - plan.bolsas;
  }
  return { envios, bolsas, bolsasRegalo, puntos: puntosTras(envios, niveles), nivel: nivelDelEnvio(envios, niveles) };
}

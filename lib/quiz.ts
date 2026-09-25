// Quiz de 60 segundos: de cinco respuestas a un plan, una frecuencia, una
// molienda y un perfil. Función pura: las reglas (gramos por taza, qué
// molienda va con cada método, cómo mueve la leche el perfil) llegan del
// catálogo, que las lee de config_suscripcion.quiz en Supabase.

import type { Frecuencia, Plan, ReglasQuiz } from "./types";

/** sessionStorage: respuestas del quiz camino al checkout, que las guarda en el perfil al pagar. */
export const QUIZ_GUARDADO = "tm-quiz";

export interface RespuestasQuiz {
  metodoId: string;
  conLeche: boolean;
  perfilId: string;
  tazasDia: number;
  personas: number;
}

export interface Recomendacion {
  planId: string;
  frecuenciaId: string;
  moliendaId: string;
  perfilId: string;
  /** Lo que se toma la casa al día. */
  gramosDia: number;
  /** Lo que el plan recomendado entrega al día. */
  gramosDiaPlan: number;
}

export class RespuestasInvalidas extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "RespuestasInvalidas";
  }
}

/** Valida y normaliza lo que llega del navegador. */
export function validarRespuestas(
  crudo: unknown,
  reglas: ReglasQuiz,
  perfilesValidos: string[]
): RespuestasQuiz {
  const r = (crudo ?? {}) as Record<string, unknown>;
  const metodoId = String(r.metodoId ?? "");
  const perfilId = String(r.perfilId ?? "");
  const tazasDia = Number(r.tazasDia);
  const personas = Number(r.personas);

  if (!reglas.metodos.some((m) => m.id === metodoId)) throw new RespuestasInvalidas("metodo");
  if (!perfilesValidos.includes(perfilId)) throw new RespuestasInvalidas("perfil");
  if (!reglas.tazasOpciones.includes(tazasDia)) throw new RespuestasInvalidas("tazas");
  if (!reglas.personasOpciones.includes(personas)) throw new RespuestasInvalidas("personas");

  return { metodoId, conLeche: r.conLeche === true, perfilId, tazasDia, personas };
}

/**
 * Consumo de la casa = tazas × personas × gramos por taza del método.
 *
 * Se prueba cada combinación plan × frecuencia y se queda la que entrega lo
 * justo: la de menor entrega diaria que cubra el consumo (por el
 * factorCobertura). Si ninguna alcanza, la que más entrega. En un empate
 * gana el plan más chico: menos bolsas abiertas a la vez, café más fresco.
 */
export function recomendar(
  respuestas: RespuestasQuiz,
  reglas: ReglasQuiz,
  planes: Plan[],
  frecuencias: Frecuencia[]
): Recomendacion {
  if (planes.length === 0 || frecuencias.length === 0) {
    throw new RespuestasInvalidas("catalogo_vacio");
  }
  const metodo = reglas.metodos.find((m) => m.id === respuestas.metodoId);
  if (!metodo) throw new RespuestasInvalidas("metodo");

  const gramosDia = respuestas.tazasDia * respuestas.personas * metodo.gramosPorTaza;
  const necesario = gramosDia * reglas.factorCobertura;

  const opciones = planes.flatMap((plan) =>
    frecuencias.map((frecuencia) => ({
      plan,
      frecuencia,
      entrega: (plan.bolsas * plan.gramosBolsa) / frecuencia.dias,
    }))
  );

  const porEntrega = (a: (typeof opciones)[number], b: (typeof opciones)[number]) =>
    a.entrega - b.entrega || a.plan.bolsas - b.plan.bolsas;

  const cubren = opciones.filter((o) => o.entrega >= necesario).sort(porEntrega);
  const elegida = cubren[0] ?? [...opciones].sort(porEntrega)[opciones.length - 1];

  const perfilId = respuestas.conLeche
    ? reglas.perfilConLeche[respuestas.perfilId] ?? respuestas.perfilId
    : respuestas.perfilId;

  return {
    planId: elegida.plan.id,
    frecuenciaId: elegida.frecuencia.id,
    moliendaId: metodo.moliendaId,
    perfilId,
    gramosDia,
    gramosDiaPlan: Math.round(elegida.entrega * 10) / 10,
  };
}

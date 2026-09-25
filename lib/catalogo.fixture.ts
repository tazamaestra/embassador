// Catálogo sintético para los tests. Los números son a propósito distintos de
// los de producción: si alguien escribe un precio a mano en el código, los
// tests fallan.

import type { Catalogo, Plan, Suscripcion } from "./types";

const txt = { label_es: "", label_en: "", desc_es: "", desc_en: "" };

export const planUno: Plan = {
  id: "uno", ...txt, bolsas: 1, gramosBolsa: 300, precioEnvioCop: 40000,
  incluye_es: [], incluye_en: [], frecuenciaDefectoId: "quince", orden: 1,
};
export const planDos: Plan = { ...planUno, id: "dos", bolsas: 2, precioEnvioCop: 70000, orden: 2 };

export function catalogoPrueba(): Catalogo {
  return {
    planes: [planUno, planDos],
    frecuencias: [
      { id: "siete", dias: 7, label_es: "", label_en: "", orden: 1 },
      { id: "quince", dias: 15, label_es: "", label_en: "", orden: 2 },
      { id: "treinta", dias: 30, label_es: "", label_en: "", orden: 3 },
    ],
    moliendas: [
      { id: "grano", ...txt, orden: 1 },
      { id: "fina", ...txt, orden: 2 },
    ],
    perfiles: [
      { id: "choco", ...txt, orden: 1 },
      { id: "fruta", ...txt, orden: 2 },
      { id: "medio", ...txt, orden: 3 },
    ],
    prepagos: [
      { id: "uno-a-uno", meses: 1, descuentoPct: 0, label_es: "", label_en: "", orden: 1 },
      { id: "tres", meses: 3, descuentoPct: 10, label_es: "", label_en: "", orden: 2 },
      { id: "seis", meses: 6, descuentoPct: 20, label_es: "", label_en: "", orden: 3 },
    ],
    reglas: {
      diasCobroAntesEnvio: 3,
      diasPreparacion: 4,
      reintentosDias: [2, 4, 7],
      mesesPausa: [1, 2],
      redondeoCop: 100,
      prepagoRenovacion: "mismo",
      regalo: { cadaEnvios: 6, bolsas: 1 },
    },
    quiz: {
      factorCobertura: 1,
      tazasOpciones: [1, 2, 3, 4],
      personasOpciones: [1, 2, 3, 4],
      metodos: [
        { id: "v60", label_es: "", label_en: "", moliendaId: "fina", gramosPorTaza: 10 },
        { id: "molino", label_es: "", label_en: "", moliendaId: "grano", gramosPorTaza: 10 },
        { id: "espresso", label_es: "", label_en: "", moliendaId: "fina", gramosPorTaza: 20 },
      ],
      perfilConLeche: { fruta: "medio" },
    },
    operacion: {
      productoId: "00000000-0000-0000-0000-000000000000",
      productoNombre: "Prueba",
      canal: "prueba",
      prefijoPedido: "TEST",
      gramosPorLibra: 500,
    },
  };
}

export function suscripcionPrueba(cambios: Partial<Suscripcion> = {}): Suscripcion {
  return {
    id: "s1",
    clienteId: "c1",
    planId: "uno",
    frecuenciaId: "quince",
    prepagoId: "uno-a-uno",
    moliendaId: "grano",
    perfilId: "medio",
    estado: "activa",
    proximoEnvio: "2026-10-20",
    pausadaHasta: null,
    cambiosPendientes: {},
    metodoPagoId: "m1",
    enviosPrepagadosRestantes: 0,
    intentosFallidos: 0,
    proximoReintento: null,
    ciclo: 2,
    enviosHechos: 2,
    enviosSaltados: 0,
    direccionId: "d1",
    creadaEn: "2026-09-01",
    pausadaEn: null,
    canceladaEn: null,
    ...cambios,
  };
}

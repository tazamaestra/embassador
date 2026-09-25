// Núcleo de la suscripción: funciones puras sobre objetos planos.
//
// Nada de red y ningún número del negocio en el código: precios, días y
// reglas llegan en el Catalogo que lee lib/catalogo.ts desde Supabase. Los
// route handlers llaman a estas funciones y solo persisten lo que devuelven.
//
// ── Máquina de estados ─────────────────────────────────────────────────────
//
//   (alta) ─────────────► pago_pendiente
//   pago_pendiente ─────► activa          cobro aprobado
//   pago_pendiente ─────► cancelada       reintentos agotados, o el cliente cancela
//   activa ─────────────► pausada         el cliente pausa 1 o 2 meses
//   activa ─────────────► pago_pendiente  cobro de ciclo rechazado
//   activa ─────────────► cancelada       el cliente cancela
//   pausada ────────────► activa          llega la fecha, o el cliente reanuda
//   pausada ────────────► cancelada       el cliente cancela
//   cancelada                             terminal
//
// Saltar un envío y cambiar plan, frecuencia, molienda o perfil no cambian
// el estado.
//
// ── Ciclos ─────────────────────────────────────────────────────────────────
//
// `proximoEnvio` apunta siempre al siguiente envío que NO se ha resuelto.
// Se resuelve `diasCobroAntesEnvio` días antes: se cobra, se descuenta de un
// prepago o, si el cliente lo saltó, se corre. Por eso cualquier cambio hecho
// antes de esa fecha entra en ese envío, y uno hecho después (ya resuelto)
// entra en el siguiente. Cada envío resuelto guarda su propia foto.

import type {
  CambiosPendientes, Catalogo, EstadoSuscripcion, Frecuencia, OrigenCobro,
  Plan, Prepago, Product, ReglasSuscripcion, Suscripcion,
} from "./types";

// ── Fechas ─────────────────────────────────────────────────────────────────
// Cadenas ISO de solo fecha (YYYY-MM-DD) en UTC, para que la zona horaria
// del navegador no corra un envío un día.

export function hoyISO(ahora: Date = new Date()): string {
  return ahora.toISOString().slice(0, 10);
}

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Suma meses de calendario. El 31 de enero + 1 mes es el 28 (o 29) de febrero. */
export function sumarMeses(iso: string, meses: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimo));
  return d.toISOString().slice(0, 10);
}

const maxFecha = (a: string, b: string) => (a > b ? a : b);

/** Día en que se resuelve (cobra) el próximo envío. */
export function fechaCobro(s: Pick<Suscripcion, "proximoEnvio">, reglas: ReglasSuscripcion): string {
  return sumarDias(s.proximoEnvio, -reglas.diasCobroAntesEnvio);
}

/** Primer envío de un alta que se paga hoy. */
export function primerEnvio(reglas: ReglasSuscripcion, hoy: string = hoyISO()): string {
  return sumarDias(hoy, reglas.diasPreparacion);
}

// ── Precios ────────────────────────────────────────────────────────────────

function redondear(valor: number, paso: number): number {
  if (paso <= 0) return Math.round(valor);
  return Math.round(valor / paso) * paso;
}

/**
 * Cuántos envíos cubre un prepago con esa frecuencia: los que caben en los
 * meses pagados, contando meses de 30 días. 3 meses cada semana = 12.
 * Un prepago de 1 mes es "pago por envío": cubre uno solo, sea cual sea la
 * frecuencia.
 */
export function enviosDelPrepago(prepago: Prepago, frecuencia: Frecuencia): number {
  if (prepago.meses <= 1) return 1;
  return Math.max(1, Math.floor((prepago.meses * 30) / frecuencia.dias));
}

export interface MontoCobro {
  /** Lo que se cobra de una. */
  total: number;
  /** Envíos que paga. */
  envios: number;
  /** Lo que sale cada envío, ya con el descuento. */
  porEnvio: number;
  /** Frente a pagar envío por envío. */
  ahorro: number;
}

export function montoCobro(
  plan: Plan,
  frecuencia: Frecuencia,
  prepago: Prepago,
  reglas: ReglasSuscripcion
): MontoCobro {
  const envios = enviosDelPrepago(prepago, frecuencia);
  const sinDescuento = plan.precioEnvioCop * envios;
  const total = redondear(sinDescuento * (1 - prepago.descuentoPct / 100), reglas.redondeoCop);
  return {
    total,
    envios,
    porEnvio: redondear(total / envios, reglas.redondeoCop),
    ahorro: sinDescuento - total,
  };
}

/** Lo que cuesta al mes, para comparar frecuencias en pantalla. */
export function costoMensual(plan: Plan, frecuencia: Frecuencia, reglas: ReglasSuscripcion): number {
  return redondear((plan.precioEnvioCop * 30) / frecuencia.dias, reglas.redondeoCop);
}

// ── Regalo ─────────────────────────────────────────────────────────────────

/** Bolsas del próximo envío: las del plan más las de regalo si toca. */
export function bolsasDelEnvio(
  s: Pick<Suscripcion, "enviosHechos">,
  plan: Plan,
  reglas: ReglasSuscripcion
): { bolsas: number; regalo: boolean } {
  const { cadaEnvios, bolsas } = reglas.regalo;
  const siguiente = s.enviosHechos + 1;
  const regalo = cadaEnvios > 0 && siguiente > cadaEnvios && (siguiente - 1) % cadaEnvios === 0;
  return { bolsas: plan.bolsas + (regalo ? bolsas : 0), regalo };
}

export interface ProgresoRegalo {
  hechos: number;
  meta: number;
  faltan: number;
  /** 0 a 100, para la barra. */
  pct: number;
}

export function progresoRegalo(
  s: Pick<Suscripcion, "enviosHechos" | "estado">,
  reglas: ReglasSuscripcion
): ProgresoRegalo {
  const meta = reglas.regalo.cadaEnvios;
  if (meta <= 0) return { hechos: 0, meta: 0, faltan: 0, pct: 0 };
  const hechos = s.estado === "cancelada" ? 0 : s.enviosHechos % meta;
  return { hechos, meta, faltan: meta - hechos, pct: Math.round((hechos / meta) * 100) };
}

// ── Máquina de estados ─────────────────────────────────────────────────────

export const TRANSICIONES: Record<EstadoSuscripcion, readonly EstadoSuscripcion[]> = {
  pago_pendiente: ["activa", "cancelada"],
  activa: ["pausada", "pago_pendiente", "cancelada"],
  pausada: ["activa", "cancelada"],
  cancelada: [],
};

export function puedeTransitar(de: EstadoSuscripcion, a: EstadoSuscripcion): boolean {
  return TRANSICIONES[de].includes(a);
}

export class TransicionInvalida extends Error {
  constructor(public readonly codigo: string, mensaje: string) {
    super(mensaje);
    this.name = "TransicionInvalida";
  }
}

function cambiarEstado(s: Suscripcion, a: EstadoSuscripcion, accion: string): Suscripcion {
  if (!puedeTransitar(s.estado, a)) {
    throw new TransicionInvalida("estado", `No se puede ${accion} una suscripción ${s.estado}.`);
  }
  return { ...s, estado: a };
}

/** Qué ofrecer en pantalla según el estado. */
export function accionesDisponibles(
  s: Pick<Suscripcion, "estado">,
  cobroEnCurso = false
): { pausar: boolean; reanudar: boolean; saltar: boolean; cambiar: boolean; cancelar: boolean; pagar: boolean } {
  return {
    pausar: s.estado === "activa" && !cobroEnCurso,
    reanudar: s.estado === "pausada",
    saltar: s.estado === "activa" && !cobroEnCurso,
    cambiar: s.estado !== "cancelada",
    cancelar: s.estado !== "cancelada",
    pagar: s.estado === "pago_pendiente" && !cobroEnCurso,
  };
}

// ── Acciones del cliente ───────────────────────────────────────────────────

export function pausar(
  s: Suscripcion,
  meses: number,
  reglas: ReglasSuscripcion,
  cobroEnCurso: boolean,
  hoy: string = hoyISO()
): Suscripcion {
  if (!reglas.mesesPausa.includes(meses)) {
    throw new TransicionInvalida("pausa_invalida", `No se ofrece una pausa de ${meses} meses.`);
  }
  if (cobroEnCurso) {
    throw new TransicionInvalida("cobro_en_curso", "Hay un cobro en curso; se puede pausar cuando termine.");
  }
  return {
    ...cambiarEstado(s, "pausada", "pausar"),
    pausadaEn: hoy,
    pausadaHasta: sumarMeses(hoy, meses),
  };
}

/**
 * Vuelve a activa. Si el envío guardado ya no alcanza a cobrarse con el
 * margen de siempre, se corre para que lo haga.
 */
export function reanudar(s: Suscripcion, reglas: ReglasSuscripcion, hoy: string = hoyISO()): Suscripcion {
  return {
    ...cambiarEstado(s, "activa", "reanudar"),
    pausadaEn: null,
    pausadaHasta: null,
    proximoEnvio: maxFecha(s.proximoEnvio, sumarDias(hoy, reglas.diasCobroAntesEnvio)),
  };
}

export function debeReanudarse(s: Suscripcion, hoy: string = hoyISO()): boolean {
  return s.estado === "pausada" && s.pausadaHasta !== null && s.pausadaHasta <= hoy;
}

export interface ResultadoSalto {
  suscripcion: Suscripcion;
  /** El envío que queda registrado como saltado. */
  envio: { numero: number; fecha: string };
}

/** Salta el próximo envío: no se cobra ni se descuenta del prepago. */
export function saltarEnvio(s: Suscripcion, frecuencia: Frecuencia, cobroEnCurso: boolean): ResultadoSalto {
  if (s.estado !== "activa") {
    throw new TransicionInvalida("estado", `No se puede saltar el envío de una suscripción ${s.estado}.`);
  }
  if (cobroEnCurso) {
    throw new TransicionInvalida("cobro_en_curso", "Ese envío ya se está cobrando; puedes saltar el siguiente cuando termine.");
  }
  return {
    suscripcion: {
      ...s,
      ciclo: s.ciclo + 1,
      enviosSaltados: s.enviosSaltados + 1,
      proximoEnvio: sumarDias(s.proximoEnvio, frecuencia.dias),
    },
    envio: { numero: s.ciclo + 1, fecha: s.proximoEnvio },
  };
}

export interface Cambios {
  planId?: string;
  frecuenciaId?: string;
  prepagoId?: string;
  moliendaId?: string;
  perfilId?: string;
}

/**
 * Molienda y perfil entran de una en el próximo envío sin resolver. Plan,
 * frecuencia y prepago también, salvo que queden envíos prepagados: esos ya
 * se pagaron con un precio, así que el cambio espera a la renovación.
 */
export function cambiar(s: Suscripcion, cambios: Cambios, catalogo: Catalogo): Suscripcion {
  if (s.estado === "cancelada") {
    throw new TransicionInvalida("estado", "No se puede cambiar una suscripción cancelada.");
  }
  const existe = (lista: { id: string }[], id?: string) => id === undefined || lista.some((x) => x.id === id);
  if (
    !existe(catalogo.planes, cambios.planId) ||
    !existe(catalogo.frecuencias, cambios.frecuenciaId) ||
    !existe(catalogo.prepagos, cambios.prepagoId) ||
    !existe(catalogo.moliendas, cambios.moliendaId) ||
    !existe(catalogo.perfiles, cambios.perfilId)
  ) {
    throw new TransicionInvalida("opcion_desconocida", "Esa opción no existe.");
  }

  const siguiente: Suscripcion = {
    ...s,
    moliendaId: cambios.moliendaId ?? s.moliendaId,
    perfilId: cambios.perfilId ?? s.perfilId,
  };

  const deCobro: CambiosPendientes = {};
  if (cambios.planId !== undefined) deCobro.planId = cambios.planId;
  if (cambios.frecuenciaId !== undefined) deCobro.frecuenciaId = cambios.frecuenciaId;
  if (cambios.prepagoId !== undefined) deCobro.prepagoId = cambios.prepagoId;

  if (s.enviosPrepagadosRestantes > 0) {
    return { ...siguiente, cambiosPendientes: { ...s.cambiosPendientes, ...deCobro } };
  }
  return aplicarPendientes({ ...siguiente, cambiosPendientes: { ...s.cambiosPendientes, ...deCobro } });
}

/** Lleva los cambios en espera a la suscripción y vacía la lista. */
export function aplicarPendientes(s: Suscripcion): Suscripcion {
  const p = s.cambiosPendientes;
  return {
    ...s,
    planId: p.planId ?? s.planId,
    frecuenciaId: p.frecuenciaId ?? s.frecuenciaId,
    prepagoId: p.prepagoId ?? s.prepagoId,
    cambiosPendientes: {},
  };
}

export function cancelar(s: Suscripcion, hoy: string = hoyISO()): Suscripcion {
  return {
    ...cambiarEstado(s, "cancelada", "cancelar"),
    canceladaEn: hoy,
    pausadaHasta: null,
    proximoReintento: null,
    cambiosPendientes: {},
    enviosPrepagadosRestantes: 0,
  };
}

/**
 * Envíos ya pagados que se despachan aunque el cliente cancele: el prepago
 * no se pierde. Fechas desde el próximo envío, según la frecuencia.
 */
export function enviosPrepagadosAlCancelar(
  s: Suscripcion,
  frecuencia: Frecuencia
): { numero: number; fecha: string }[] {
  return Array.from({ length: s.enviosPrepagadosRestantes }, (_, i) => ({
    numero: s.ciclo + 1 + i,
    fecha: sumarDias(s.proximoEnvio, frecuencia.dias * i),
  }));
}

// ── Retención ──────────────────────────────────────────────────────────────

export type OfertaRetencion =
  | { tipo: "pausar"; meses: number }
  | { tipo: "frecuencia"; frecuenciaId: string }
  | { tipo: "plan"; planId: string }
  | { tipo: "perfil" };

/**
 * Lo que se muestra antes de confirmar la cancelación. Solo ofertas que
 * cambian algo: si ya está en la frecuencia más espaciada o en el plan más
 * chico, esa oferta no sale.
 */
export function ofertasRetencion(s: Suscripcion, catalogo: Catalogo): OfertaRetencion[] {
  const ofertas: OfertaRetencion[] = [];

  if (s.estado === "activa") {
    for (const meses of catalogo.reglas.mesesPausa) ofertas.push({ tipo: "pausar", meses });
  }

  const actual = catalogo.frecuencias.find((f) => f.id === s.frecuenciaId);
  const masEspaciada = [...catalogo.frecuencias]
    .filter((f) => actual && f.dias > actual.dias)
    .sort((a, b) => a.dias - b.dias)[0];
  if (masEspaciada) ofertas.push({ tipo: "frecuencia", frecuenciaId: masEspaciada.id });

  const plan = catalogo.planes.find((p) => p.id === s.planId);
  const menor = [...catalogo.planes]
    .filter((p) => plan && p.bolsas < plan.bolsas)
    .sort((a, b) => a.bolsas - b.bolsas)[0];
  if (menor) ofertas.push({ tipo: "plan", planId: menor.id });

  if (catalogo.perfiles.length > 1) ofertas.push({ tipo: "perfil" });

  return ofertas;
}

// ── Cobros ─────────────────────────────────────────────────────────────────

export interface CobroPlaneado {
  ciclo: number;
  origen: OrigenCobro;
  montoCop: number;
  enviosCubiertos: number;
  detalle: {
    planId: string;
    frecuenciaId: string;
    prepagoId: string;
    moliendaId: string;
    perfilId: string;
    bolsas: number;
  };
}

function resolver<T extends { id: string }>(lista: T[], id: string, que: string): T {
  const x = lista.find((y) => y.id === id);
  if (!x) throw new TransicionInvalida("catalogo", `El ${que} "${id}" ya no existe en el catálogo.`);
  return x;
}

/** Lo que hay que cobrarle a una suscripción por su siguiente ciclo. */
export function planearCobro(s: Suscripcion, catalogo: Catalogo, origen: OrigenCobro): CobroPlaneado {
  const plan = resolver(catalogo.planes, s.planId, "plan");
  const frecuencia = resolver(catalogo.frecuencias, s.frecuenciaId, "frecuencia");
  const prepago = resolver(catalogo.prepagos, s.prepagoId, "prepago");
  const monto = montoCobro(plan, frecuencia, prepago, catalogo.reglas);
  return {
    ciclo: s.ciclo + 1,
    origen,
    montoCop: monto.total,
    enviosCubiertos: monto.envios,
    detalle: {
      planId: plan.id,
      frecuenciaId: frecuencia.id,
      prepagoId: prepago.id,
      moliendaId: s.moliendaId,
      perfilId: s.perfilId,
      bolsas: plan.bolsas,
    },
  };
}

export type DecisionCiclo =
  | { tipo: "nada" }
  | { tipo: "consumir_prepago"; suscripcion: Suscripcion; envio: EnvioPlaneado }
  | { tipo: "cobrar"; suscripcion: Suscripcion; cobro: CobroPlaneado };

export interface EnvioPlaneado {
  numero: number;
  fecha: string;
  bolsas: number;
  regalo: boolean;
  planId: string;
  moliendaId: string;
  perfilId: string;
}

/**
 * Qué hace el cron hoy con una suscripción activa. Nunca cobra dos veces:
 * con un cobro en vuelo no hace nada, y el índice cobros_uno_en_curso lo
 * respalda en la base.
 */
export function decidirCiclo(
  s: Suscripcion,
  catalogo: Catalogo,
  cobroEnCurso: boolean,
  hoy: string = hoyISO()
): DecisionCiclo {
  if (s.estado !== "activa" || cobroEnCurso) return { tipo: "nada" };
  if (hoy < fechaCobro(s, catalogo.reglas)) return { tipo: "nada" };

  const frecuencia = resolver(catalogo.frecuencias, s.frecuenciaId, "frecuencia");

  if (s.enviosPrepagadosRestantes > 0) {
    const plan = resolver(catalogo.planes, s.planId, "plan");
    const { bolsas, regalo } = bolsasDelEnvio(s, plan, catalogo.reglas);
    return {
      tipo: "consumir_prepago",
      suscripcion: {
        ...s,
        ciclo: s.ciclo + 1,
        enviosHechos: s.enviosHechos + 1,
        enviosPrepagadosRestantes: s.enviosPrepagadosRestantes - 1,
        proximoEnvio: sumarDias(s.proximoEnvio, frecuencia.dias),
      },
      envio: {
        numero: s.ciclo + 1,
        fecha: s.proximoEnvio,
        bolsas,
        regalo,
        planId: plan.id,
        moliendaId: s.moliendaId,
        perfilId: s.perfilId,
      },
    };
  }

  // Sin prepago vigente: es una renovación. Entran los cambios en espera y,
  // si la regla lo dice, un prepago acabado pasa a cobro por envío.
  let renovada = aplicarPendientes(s);
  if (catalogo.reglas.prepagoRenovacion === "ciclo") {
    const porEnvio = catalogo.prepagos.find((p) => p.meses === 1);
    if (porEnvio) renovada = { ...renovada, prepagoId: porEnvio.id };
  }

  return { tipo: "cobrar", suscripcion: renovada, cobro: planearCobro(renovada, catalogo, "automatico") };
}

/** ¿Toca reintentar hoy un cobro fallido? Sin medio de pago, no hay con qué. */
export function debeReintentar(s: Suscripcion, cobroEnCurso: boolean, hoy: string = hoyISO()): boolean {
  return (
    s.estado === "pago_pendiente" &&
    !cobroEnCurso &&
    s.metodoPagoId !== null &&
    s.proximoReintento !== null &&
    s.proximoReintento <= hoy
  );
}

export interface ResultadoAprobado {
  suscripcion: Suscripcion;
  envio: EnvioPlaneado;
}

/**
 * Cobro aprobado: arranca o reanuda la suscripción y deja el envío listo.
 * Devuelve null si ese ciclo ya estaba resuelto (evento repetido) o si la
 * suscripción se canceló mientras el cobro estaba en vuelo: eso lo revisa
 * una persona, no el código.
 */
export function aplicarCobroAprobado(
  s: Suscripcion,
  cobro: Pick<CobroPlaneado, "ciclo" | "enviosCubiertos" | "detalle">,
  catalogo: Catalogo,
  hoy: string = hoyISO()
): ResultadoAprobado | null {
  if (cobro.ciclo <= s.ciclo || s.estado === "cancelada") return null;

  const frecuencia = resolver(catalogo.frecuencias, s.frecuenciaId, "frecuencia");
  const plan = catalogo.planes.find((p) => p.id === cobro.detalle.planId) ?? resolver(catalogo.planes, s.planId, "plan");

  // Si el pago llegó tarde (reintentos), el envío no puede salir antes de
  // lo que toma tostarlo.
  const fecha = maxFecha(s.proximoEnvio, sumarDias(hoy, catalogo.reglas.diasPreparacion));
  const { bolsas, regalo } = bolsasDelEnvio(s, plan, catalogo.reglas);

  const base = s.estado === "activa" ? s : cambiarEstado(s, "activa", "activar");
  return {
    suscripcion: {
      ...base,
      ciclo: cobro.ciclo,
      enviosHechos: s.enviosHechos + 1,
      enviosPrepagadosRestantes: cobro.enviosCubiertos - 1,
      intentosFallidos: 0,
      proximoReintento: null,
      proximoEnvio: sumarDias(fecha, frecuencia.dias),
    },
    envio: {
      numero: cobro.ciclo,
      fecha,
      bolsas,
      regalo,
      planId: plan.id,
      moliendaId: cobro.detalle.moliendaId,
      perfilId: cobro.detalle.perfilId,
    },
  };
}

/**
 * Cobro rechazado. Los automáticos cuentan contra `reintentosDias`: con
 * [2, 4, 7] se reintenta a los 2, 4 y 7 días de cada fallo, y si el tercer
 * reintento también falla, se cancela. Un intento manual (el cliente puso
 * otra tarjeta) no gasta reintentos: fallar ahí no debe acercarlo a perder
 * la suscripción.
 */
export function aplicarCobroRechazado(
  s: Suscripcion,
  origen: OrigenCobro,
  reglas: ReglasSuscripcion,
  hoy: string = hoyISO()
): { suscripcion: Suscripcion; cancelada: boolean } {
  if (s.estado === "cancelada") return { suscripcion: s, cancelada: false };

  const pendiente = s.estado === "pago_pendiente" ? s : cambiarEstado(s, "pago_pendiente", "marcar sin pago");
  if (origen === "manual") return { suscripcion: pendiente, cancelada: false };

  const intentos = s.intentosFallidos + 1;
  if (intentos > reglas.reintentosDias.length) {
    return { suscripcion: { ...cancelar(pendiente, hoy), intentosFallidos: intentos }, cancelada: true };
  }
  return {
    suscripcion: {
      ...pendiente,
      intentosFallidos: intentos,
      proximoReintento: sumarDias(hoy, reglas.reintentosDias[intentos - 1]),
    },
    cancelada: false,
  };
}

// ── Precio de la tienda ────────────────────────────────────────────────────
// La tienda vende bolsas sueltas de origen: otra oferta, distinta de los
// planes. Cada bolsa trae su propio precio de suscriptor en el catálogo.

export interface ComparacionBolsa {
  unico: number;
  suscriptor: number;
  ahorro: number;
  ahorroPct: number;
}

export function compararPrecios(producto: Product, cantidad = 1): ComparacionBolsa {
  const unico = producto.precioCop * cantidad;
  const suscriptor = producto.precioSuscriptorCop * cantidad;
  const ahorro = unico - suscriptor;
  return {
    unico,
    suscriptor,
    ahorro,
    ahorroPct: unico > 0 ? Math.round((ahorro / unico) * 100) : 0,
  };
}

/** Alias para las fichas, que solo muestran una bolsa. */
export function mejorAhorro(producto: Product): ComparacionBolsa {
  return compararPrecios(producto, 1);
}

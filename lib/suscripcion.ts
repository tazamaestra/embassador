// Núcleo de la suscripción: funciones puras sobre objetos planos.
//
// Nada de red y nada de precios en el código: todo sale de
// data/suscripcion.json. lib/suscripcion-db.ts se limita a persistir lo que
// estas funciones devuelven.
//
// El plan tiene dos ejes: el nivel (cuánto café) y la frecuencia (cada
// cuánto). El prepago es un tercero, opcional, que solo descuenta.

import type {
  EstadoSuscripcion, Frecuencia, Nivel, Prepago, Product, Suscripcion,
  SuscripcionConfig,
} from "./types";

// ── Fechas ─────────────────────────────────────────────────────────────────
// Se trabaja con cadenas ISO de solo fecha (YYYY-MM-DD) en UTC, para que la
// zona horaria del navegador no corra un envío un día.

export function hoyISO(ahora: Date = new Date()): string {
  return ahora.toISOString().slice(0, 10);
}

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Meses completos entre dos fechas. */
export function mesesEntre(desde: string, hasta: string): number {
  const a = new Date(`${desde}T00:00:00Z`);
  const b = new Date(`${hasta}T00:00:00Z`);
  let meses =
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) meses -= 1;
  return meses;
}

/** El próximo día `dia` del mes, contando desde hoy. */
export function proximoDiaDelMes(dia: number, hoy: string = hoyISO()): string {
  const d = new Date(`${hoy}T00:00:00Z`);
  if (d.getUTCDate() >= dia) d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(dia);
  return d.toISOString().slice(0, 10);
}

/** Se cobra el día 1 y se despacha el día 5 del mismo ciclo. */
export function proximoCobro(config: SuscripcionConfig, hoy: string = hoyISO()): string {
  return proximoDiaDelMes(config.cobroDia, hoy);
}

export function proximoDespacho(config: SuscripcionConfig, hoy: string = hoyISO()): string {
  const cobro = proximoCobro(config, hoy);
  return sumarDias(cobro, config.despachoDia - config.cobroDia);
}

// ── Consumo ────────────────────────────────────────────────────────────────
// La calculadora responde una sola pregunta: cuánto café se toma al mes.

export function gramosPorTaza(metodoId: string, config: SuscripcionConfig): number {
  return config.metodos.find((m) => m.id === metodoId)?.gramosPorTaza ?? 0;
}

/** Tazas al día × gramos del método × días del mes. */
export function consumoMensual(
  tazasDia: number,
  metodoId: string,
  config: SuscripcionConfig
): number {
  const gramos = gramosPorTaza(metodoId, config);
  if (tazasDia <= 0 || gramos <= 0) return 0;
  return tazasDia * gramos * config.consumo.diasMes;
}

/**
 * El nivel más pequeño que cubre el consumo. Si se pasa del más grande,
 * se sugiere ese: no hay nivel por encima.
 */
export function nivelSugerido(gramosAlMes: number, config: SuscripcionConfig): Nivel {
  const porTamano = [...config.niveles].sort((a, b) => a.gramos - b.gramos);
  return porTamano.find((n) => gramosAlMes <= n.gramos) ?? porTamano[porTamano.length - 1];
}

/** Para cuántas tazas alcanza un nivel con ese método. */
export function tazasQueRinde(
  nivel: Nivel,
  metodoId: string,
  config: SuscripcionConfig
): number {
  const gramos = gramosPorTaza(metodoId, config);
  if (gramos <= 0) return 0;
  return Math.floor(nivel.gramos / gramos);
}

// ── Precios ────────────────────────────────────────────────────────────────

function redondear(valor: number, paso: number): number {
  if (paso <= 0) return Math.round(valor);
  return Math.round(valor / paso) * paso;
}

export interface CobroPrepago {
  /** Lo que se cobra de una. */
  total: number;
  /** Lo que sale cada mes, ya con el descuento repartido. */
  porMes: number;
  meses: number;
  ahorro: number;
}

/** Lo que se cobra según cuántos meses se paguen por adelantado. */
export function cobroPrepago(
  nivel: Nivel,
  prepago: Prepago,
  config: SuscripcionConfig
): CobroPrepago {
  const sinDescuento = nivel.precioCop * prepago.meses;
  const total = redondear(
    sinDescuento * (1 - prepago.descuentoPct / 100),
    config.redondeoCop
  );
  return {
    total,
    porMes: redondear(total / prepago.meses, config.redondeoCop),
    meses: prepago.meses,
    ahorro: sinDescuento - total,
  };
}

export interface ComparacionSuelta {
  /** Comprar las mismas libras sueltas, más el envío. */
  suelta: number;
  suscrito: number;
  ahorro: number;
  ahorroPct: number;
}

/** Cuánto se ahorra frente a comprar esas mismas libras sueltas. */
export function compararConSuelta(
  nivel: Nivel,
  config: SuscripcionConfig
): ComparacionSuelta {
  const suelta = nivel.libras * config.suelta.precioLibraCop + config.suelta.envioCop;
  const ahorro = suelta - nivel.precioCop;
  return {
    suelta,
    suscrito: nivel.precioCop,
    ahorro,
    ahorroPct: suelta > 0 ? Math.round((ahorro / suelta) * 100) : 0,
  };
}

/** El mayor ahorro entre todos los niveles, para el "ahorras hasta X". */
export function mejorAhorroSuelta(config: SuscripcionConfig): ComparacionSuelta {
  return config.niveles
    .map((n) => compararConSuelta(n, config))
    .reduce((mejor, actual) => (actual.ahorro > mejor.ahorro ? actual : mejor));
}

// ── Precio de la tienda ────────────────────────────────────────────────────
// La tienda vende bolsas sueltas de origen: otra oferta, distinta de los
// planes mensuales. Cada bolsa trae su propio precio de suscriptor en el
// catálogo, sin descuentos encima.

export interface ComparacionBolsa {
  unico: number;
  suscriptor: number;
  ahorro: number;
  ahorroPct: number;
}

export function compararPrecios(
  producto: Product,
  cantidad = 1
): ComparacionBolsa {
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

// ── Racha y regalo ─────────────────────────────────────────────────────────

export interface ProgresoRegalo {
  enviosHechos: number;
  meta: number;
  faltan: number;
  /** 0 a 100, para la barra. */
  pct: number;
  ganado: boolean;
}

/**
 * Cuánto falta para la libra de regalo. Saltar un envío no rompe la racha
 * —el cliente sigue suscrito— pero tampoco la adelanta.
 */
export function progresoRegalo(
  suscripcion: Suscripcion,
  config: SuscripcionConfig
): ProgresoRegalo {
  const meta = config.regalo.mesesSeguidos;
  const hechos = suscripcion.estado === "cancelada" ? 0 : suscripcion.enviosHechos;
  const dentroDelCiclo = meta > 0 ? hechos % meta : 0;
  const ganado = meta > 0 && hechos > 0 && dentroDelCiclo === 0;

  return {
    enviosHechos: hechos,
    meta,
    faltan: ganado ? 0 : meta - dentroDelCiclo,
    pct: meta > 0 ? Math.round(((ganado ? meta : dentroDelCiclo) / meta) * 100) : 0,
    ganado,
  };
}

/** Libras que van en un envío: las del nivel más la de regalo si toca. */
export function librasDelEnvio(
  suscripcion: Suscripcion,
  nivel: Nivel,
  config: SuscripcionConfig
): number {
  const meta = config.regalo.mesesSeguidos;
  const siguiente = suscripcion.enviosHechos + 1;
  const tocaRegalo = meta > 0 && siguiente > meta && (siguiente - 1) % meta === 0;
  return nivel.libras + (tocaRegalo ? config.regalo.libras : 0);
}

/** Tazas que han acompañado a alguien, para el contador del panel. */
export function tazasAcompanadas(
  suscripcion: Suscripcion,
  nivel: Nivel | undefined,
  config: SuscripcionConfig
): number {
  const gramos = gramosPorTaza(suscripcion.metodo, config);
  if (!nivel || gramos <= 0) return 0;
  return Math.floor((suscripcion.enviosHechos * nivel.gramos) / gramos);
}

// ── Transiciones de estado ─────────────────────────────────────────────────
// Reciben una suscripción y devuelven la siguiente. No tocan la red.
// Cancelar no pide pasos intermedios: cancela.

class TransicionInvalida extends Error {
  constructor(accion: string, estado: EstadoSuscripcion) {
    super(`No se puede ${accion} una suscripción ${estado}.`);
    this.name = "TransicionInvalida";
  }
}

export function pausar(
  suscripcion: Suscripcion,
  hoy: string = hoyISO()
): Suscripcion {
  if (suscripcion.estado !== "activa") {
    throw new TransicionInvalida("pausar", suscripcion.estado);
  }
  return { ...suscripcion, estado: "pausada", pausadaEn: hoy };
}

export function reanudar(
  suscripcion: Suscripcion,
  config: SuscripcionConfig,
  hoy: string = hoyISO()
): Suscripcion {
  if (suscripcion.estado !== "pausada") {
    throw new TransicionInvalida("reanudar", suscripcion.estado);
  }
  // Si la fecha guardada ya pasó mientras estuvo en pausa, se reprograma
  // dejando margen para tostar y despachar.
  const proximoEnvio =
    suscripcion.proximoEnvio > hoy
      ? suscripcion.proximoEnvio
      : sumarDias(hoy, config.diasPreparacion);
  return { ...suscripcion, estado: "activa", pausadaEn: null, proximoEnvio };
}

export function saltarEnvio(
  suscripcion: Suscripcion,
  frecuencia: Frecuencia
): Suscripcion {
  if (suscripcion.estado !== "activa") {
    throw new TransicionInvalida("saltar el envío de", suscripcion.estado);
  }
  return {
    ...suscripcion,
    proximoEnvio: sumarDias(suscripcion.proximoEnvio, frecuencia.cadaDias),
    enviosSaltados: suscripcion.enviosSaltados + 1,
  };
}

/** Cambiar de nivel: aplica desde el siguiente envío, sin recalcular fechas. */
export function cambiarNivel(
  suscripcion: Suscripcion,
  nivel: Nivel
): Suscripcion {
  if (suscripcion.estado === "cancelada") {
    throw new TransicionInvalida("cambiar el plan de", suscripcion.estado);
  }
  return { ...suscripcion, nivelId: nivel.id };
}

export function cambiarFrecuencia(
  suscripcion: Suscripcion,
  frecuencia: Frecuencia,
  hoy: string = hoyISO()
): Suscripcion {
  if (suscripcion.estado === "cancelada") {
    throw new TransicionInvalida("cambiar la frecuencia de", suscripcion.estado);
  }
  // El próximo envío se recalcula desde el último, con la nueva frecuencia.
  const ultimo = suscripcion.proximoEnvio > hoy ? hoy : suscripcion.proximoEnvio;
  return {
    ...suscripcion,
    frecuenciaId: frecuencia.id,
    proximoEnvio: sumarDias(ultimo, frecuencia.cadaDias),
  };
}

/** Grano o molido, método y perfil. No mueven fechas ni precio. */
export function cambiarPreferencias(
  suscripcion: Suscripcion,
  cambios: Partial<Pick<Suscripcion, "molienda" | "metodo" | "perfil">>
): Suscripcion {
  if (suscripcion.estado === "cancelada") {
    throw new TransicionInvalida("cambiar las preferencias de", suscripcion.estado);
  }
  return { ...suscripcion, ...cambios };
}

export function cancelar(
  suscripcion: Suscripcion,
  hoy: string = hoyISO()
): Suscripcion {
  if (suscripcion.estado === "cancelada") {
    throw new TransicionInvalida("cancelar", suscripcion.estado);
  }
  return { ...suscripcion, estado: "cancelada", canceladaEn: hoy };
}

/** Primer cobro confirmado: la suscripción arranca y cuenta su primer envío. */
export function activar(
  suscripcion: Suscripcion,
  frecuencia: Frecuencia,
  hoy: string = hoyISO()
): Suscripcion {
  return {
    ...suscripcion,
    estado: "activa",
    enviosHechos: 1,
    proximoEnvio: sumarDias(hoy, frecuencia.cadaDias),
  };
}

/** Tras despachar un envío. Lo usa el proceso de cobro, no la interfaz. */
export function registrarEnvio(
  suscripcion: Suscripcion,
  frecuencia: Frecuencia
): Suscripcion {
  return {
    ...suscripcion,
    enviosHechos: suscripcion.enviosHechos + 1,
    proximoEnvio: sumarDias(suscripcion.proximoEnvio, frecuencia.cadaDias),
  };
}

/** Acciones que tiene sentido ofrecer en pantalla, según el estado. */
export function accionesDisponibles(suscripcion: Suscripcion): {
  pausar: boolean;
  reanudar: boolean;
  saltar: boolean;
  cambiar: boolean;
  cancelar: boolean;
} {
  const activa = suscripcion.estado === "activa";
  const pausada = suscripcion.estado === "pausada";
  return {
    pausar: activa,
    reanudar: pausada,
    saltar: activa,
    cambiar: activa || pausada,
    cancelar: activa || pausada,
  };
}

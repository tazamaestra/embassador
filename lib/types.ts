// ── Catálogo ───────────────────────────────────────────────────────────────

/** El momento del día que acompaña un café. Conecta quiz, tienda y blog. */
export type MomentoId = "tres-pm" | "antes-del-deploy" | "madrugada" | "domingo-tranquilo";

export interface Momento {
  id: MomentoId;
  label_es: string;
  label_en: string;
  /** La pregunta del quiz se responde con esto. */
  opcion_es: string;
  opcion_en: string;
  historia_es: string;
  historia_en: string;
}

export interface Product {
  id: string;
  name: string;
  productor: string;
  finca: string;
  region: string;
  altura: string;
  proceso_es: string;
  proceso_en: string;
  variedad: string;
  notas_es: string;
  notas_en: string;
  /** Por qué existe este café. Opcional: no todos la tienen. */
  historia_es?: string;
  historia_en?: string;
  tueste_es: string;
  tueste_en: string;
  /** Peso de la bolsa en gramos. */
  pesoG: number;
  precioCop: number;
  precioUsd?: number;
  precioSuscriptorCop: number;
  precioSuscriptorUsd?: number;
  momento: MomentoId;
  img: string | null;
  swatch: string;
  /** Dormido con FEATURE_AMBASSADORS. No se usa con el flag apagado. */
  wholesale?: number;
  wholesale_usd?: number;
}

export interface ProductFilter {
  id: string;
  label_es: string;
  label_en: string;
}

// ── Suscripción ────────────────────────────────────────────────────────────
// Precios, frecuencias, moliendas, perfiles, prepagos y reglas viven en
// Supabase (supabase/sql/fase1_suscripciones.sql). lib/catalogo.ts los lee y
// los entrega con estos tipos. Aquí no hay un solo número del negocio.

/** Lo que llega en cada envío. Precio por envío, envío incluido. */
export interface Plan {
  id: string;
  label_es: string;
  label_en: string;
  desc_es: string;
  desc_en: string;
  bolsas: number;
  gramosBolsa: number;
  precioEnvioCop: number;
  incluye_es: string[];
  incluye_en: string[];
  frecuenciaDefectoId: string | null;
  orden: number;
}

/** Cada cuánto se repite el envío. */
export interface Frecuencia {
  id: string;
  dias: number;
  label_es: string;
  label_en: string;
  orden: number;
}

/** Molienda o perfil de sabor: una opción con nombre y descripción. */
export interface OpcionCatalogo {
  id: string;
  label_es: string;
  label_en: string;
  desc_es: string;
  desc_en: string;
  orden: number;
}

/** Pagar varios meses de una a cambio de un descuento. */
export interface Prepago {
  id: string;
  meses: number;
  descuentoPct: number;
  label_es: string;
  label_en: string;
  orden: number;
}

export interface ReglasSuscripcion {
  /** Días antes del envío en que se cobra. Es también el corte de cambios. */
  diasCobroAntesEnvio: number;
  /** Días entre el alta pagada y el primer envío. */
  diasPreparacion: number;
  /** Reintentos tras un fallo, en días desde el fallo anterior. */
  reintentosDias: number[];
  /** Pausas que se ofrecen, en meses. */
  mesesPausa: number[];
  redondeoCop: number;
  /** Qué pasa al acabarse un prepago. */
  prepagoRenovacion: "mismo" | "ciclo";
  /** Cada `cadaEnvios` envíos seguidos, el siguiente lleva `bolsas` de regalo. */
  regalo: { cadaEnvios: number; bolsas: number };
}

/** Puente con el software de gestión, que lee la tabla `pedidos`. */
export interface Operacion {
  productoId: string;
  productoNombre: string;
  canal: string;
  prefijoPedido: string;
  gramosPorLibra: number;
}

export interface MetodoQuiz {
  id: string;
  label_es: string;
  label_en: string;
  moliendaId: string;
  gramosPorTaza: number;
}

export interface ReglasQuiz {
  /** 1 = el plan debe cubrir todo el consumo; 0.9 acepta quedarse un 10% corto. */
  factorCobertura: number;
  tazasOpciones: number[];
  personasOpciones: number[];
  metodos: MetodoQuiz[];
  /** Perfil elegido → perfil recomendado cuando se toma con leche. */
  perfilConLeche: Record<string, string>;
}

export interface Catalogo {
  planes: Plan[];
  frecuencias: Frecuencia[];
  moliendas: OpcionCatalogo[];
  perfiles: OpcionCatalogo[];
  prepagos: Prepago[];
  reglas: ReglasSuscripcion;
  quiz: ReglasQuiz;
  operacion: Operacion;
}

export type EstadoSuscripcion = "activa" | "pausada" | "pago_pendiente" | "cancelada";

/** Cambios que esperan a que se acabe el prepago para aplicarse. */
export interface CambiosPendientes {
  planId?: string;
  frecuenciaId?: string;
  prepagoId?: string;
}

export interface Suscripcion {
  id: string;
  clienteId: string;
  planId: string;
  frecuenciaId: string;
  prepagoId: string;
  moliendaId: string;
  perfilId: string;
  estado: EstadoSuscripcion;
  /** Fecha ISO (YYYY-MM-DD) del próximo envío que todavía no se ha resuelto. */
  proximoEnvio: string;
  /** Con pausa, el día en que se reanuda sola. */
  pausadaHasta: string | null;
  cambiosPendientes: CambiosPendientes;
  metodoPagoId: string | null;
  /** Envíos ya pagados por un prepago que faltan por despachar. */
  enviosPrepagadosRestantes: number;
  intentosFallidos: number;
  proximoReintento: string | null;
  /** Último ciclo resuelto: pagado, prepagado o saltado. */
  ciclo: number;
  enviosHechos: number;
  enviosSaltados: number;
  direccionId: string | null;
  creadaEn: string;
  pausadaEn: string | null;
  canceladaEn: string | null;
}

export type EstadoCobro = "CREANDO" | "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";
export type OrigenCobro = "alta" | "automatico" | "reintento" | "manual";

export interface Cobro {
  id: string;
  suscripcionId: string;
  referencia: string;
  ciclo: number;
  origen: OrigenCobro;
  enviosCubiertos: number;
  montoCop: number;
  estado: EstadoCobro;
  motivo: string | null;
  creadoEn: string;
}

export interface EnvioSuscripcion {
  id: string;
  suscripcionId: string;
  numero: number;
  fechaProgramada: string;
  estado: "programado" | "saltado" | "enviado" | "cobrado";
  planId: string | null;
  bolsas: number;
  molienda: string;
  regalo: boolean;
  origen: string;
  totalCop: number;
}

export interface Direccion {
  id: string;
  clienteId: string;
  nombre: string;
  telefono: string;
  linea: string;
  ciudad: string;
  departamento: string;
  notas: string;
  esPrincipal: boolean;
}

export interface MetodoPago {
  id: string;
  tipo: "CARD" | "NEQUI";
  marca: string;
  ultimos4: string;
  telefono: string;
}

export const MOTIVOS_CANCELACION = [
  "precio", "mucho_cafe", "sabor", "envios", "otra_marca", "temporal", "otro",
  "prefiero_no_decir",
] as const;
export type MotivoCancelacion = (typeof MOTIVOS_CANCELACION)[number] | "pago_fallido";

// ── Contenido editorial de la suscripción ──────────────────────────────────
// Textos que no mueven dinero: siguen en data/suscripcion.json.

export interface BeneficioSuscriptor {
  id: string;
  label_es: string;
  label_en: string;
  desc_es: string;
  desc_en: string;
}

/** El café invitado que entra en el plan Jornada. */
export interface OrigenDelMes {
  mes_es: string;
  mes_en: string;
  productor: string;
  finca: string;
  region: string;
  altura: string;
  variedad: string;
  proceso_es: string;
  proceso_en: string;
  notas_es: string;
  notas_en: string;
  foto: string | null;
  swatch: string;
}

export interface SuscripcionEditorial {
  beneficios: BeneficioSuscriptor[];
  origenDelMes: OrigenDelMes;
  ciudades: string[];
  faqs: Faq[];
}

// ── Blog ───────────────────────────────────────────────────────────────────

/** Lo que hay en data/content.json, con los campos de video ya dormidos. */
export interface BlogPostRaw {
  slug: string;
  cat: string;
  t_es: string;
  t_en: string;
  d_es: string;
  d_en: string;
  cuerpo_es: string[];
  cuerpo_en: string[];
  foto: string | null;
  sw: string;
  /** Café que acompaña la historia. */
  cafeSlug?: string;
  /** @deprecated El blog es texto y foto. lib/content.ts no lo expone. */
  videoId?: string;
  /** @deprecated El blog es texto y foto. lib/content.ts no lo expone. */
  isVideo?: boolean;
}

/** Lo que llega a los componentes: sin rastro de video. */
export type BlogPost = Omit<BlogPostRaw, "videoId" | "isVideo">;

export interface BlogFilter {
  id: string;
  label_es: string;
  label_en: string;
}

// ── Contenido editorial ────────────────────────────────────────────────────

export interface Method {
  code: string;
  big: string;
  tag: string;
  name: string;
  desc_es: string;
  desc_en: string;
  steps_es: string[];
  steps_en: string[];
  ratio: string;
  time: string;
  body_es: string;
  body_en: string;
}

export interface Step {
  n: string;
  t_es: string;
  t_en: string;
  d_es: string;
  d_en: string;
}

export interface Benefit {
  icon: string;
  t_es: string;
  t_en: string;
  d_es: string;
  d_en: string;
}

export interface Testimonial {
  quote_es: string;
  quote_en: string;
  name: string;
  role_es: string;
  role_en: string;
  initial: string;
}

export interface OriginFact {
  k_es: string;
  k_en: string;
  v?: string;
  v_es?: string;
  v_en?: string;
}

export interface Faq {
  q_es: string;
  q_en: string;
  a_es: string;
  a_en: string;
}

export interface HeroStat {
  num: string;
  label_es: string;
  label_en: string;
}

/** Dormida con FEATURE_AMBASSADORS. */
export interface CalculatorConfig {
  precioVenta: number;
  precioVenta_usd?: number;
  utilLibra: number;
  utilLibra_usd?: number;
  libras: { min: number; max: number; step: number; default: number };
  formula: Record<string, string>;
}

export type Mode = "cliente" | "embajador";
export type Locale = "es" | "en";

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
// El plan tiene dos ejes independientes: cuánto café (nivel) y cada cuánto
// (frecuencia). El prepago es un tercero, opcional, que solo descuenta.

/** Cuánto café llega en cada envío. Precio fijo, envío incluido. */
export interface Nivel {
  id: string;
  libras: number;
  gramos: number;
  precioCop: number;
  orden: number;
  label_es: string;
  label_en: string;
  /** Qué trae la caja, línea por línea. */
  incluye_es: string[];
  incluye_en: string[];
  nota_es: string;
  nota_en: string;
}

/** Cada cuánto se repite el envío. */
export interface Frecuencia {
  id: string;
  cadaDias: number;
  orden: number;
  label_es: string;
  label_en: string;
  nota_es: string;
  nota_en: string;
}

/** Pagar varios meses por adelantado a cambio de un descuento. */
export interface Prepago {
  id: string;
  meses: number;
  descuentoPct: number;
  orden: number;
  label_es: string;
  label_en: string;
  nota_es: string;
  nota_en: string;
}

/** Método de preparación. Define los gramos por taza de la calculadora. */
export interface MetodoPreparacion {
  id: string;
  gramosPorTaza: number;
  label_es: string;
  label_en: string;
  nota_es: string;
  nota_en: string;
}

export interface OpcionSimple {
  id: string;
  label_es: string;
  label_en: string;
  nota_es?: string;
  nota_en?: string;
  desc_es?: string;
  desc_en?: string;
}

export interface BeneficioSuscriptor {
  id: string;
  label_es: string;
  label_en: string;
  desc_es: string;
  desc_en: string;
}

/** El café de otro productor que entra desde el plan de 2 libras. */
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

export interface SuscripcionConfig {
  moneda: string;
  redondeoCop: number;
  /** Días entre reanudar y el siguiente envío, para tostar y despachar. */
  diasPreparacion: number;
  /** Día del mes en que se cobra y día en que sale el despacho. */
  cobroDia: number;
  despachoDia: number;
  gramosPorLibra: number;
  /** Puente con el software de gestión que lee la tabla `pedidos`. */
  operacion: {
    /** UUID de la fila en `productos` a la que se cargan las libras. */
    productoId: string;
    productoNombre: string;
    canal: string;
    prefijoPedido: string;
  };
  /** Referencia para la comparativa contra comprar suelto. */
  suelta: { precioLibraCop: number; envioCop: number };
  consumo: { diasMes: number };
  metodos: MetodoPreparacion[];
  niveles: Nivel[];
  frecuencias: Frecuencia[];
  prepagos: Prepago[];
  moliendas: OpcionSimple[];
  perfiles: OpcionSimple[];
  regalo: {
    mesesSeguidos: number;
    libras: number;
    label_es: string;
    label_en: string;
    desc_es: string;
    desc_en: string;
  };
  beneficios: BeneficioSuscriptor[];
  origenDelMes: OrigenDelMes;
  ciudades: string[];
  faqs: Faq[];
}

export type EstadoSuscripcion = "pendiente" | "activa" | "pausada" | "cancelada";

export interface Suscripcion {
  id: string;
  clienteId: string;
  /** Cuánto café: 1, 2 o 3 libras. */
  nivelId: string;
  /** Cada cuánto llega. */
  frecuenciaId: string;
  /** Cuántos meses se pagaron por adelantado. */
  prepagoId: string;
  molienda: string;
  metodo: string;
  perfil: string;
  estado: EstadoSuscripcion;
  /** Fecha ISO (YYYY-MM-DD) del próximo envío. */
  proximoEnvio: string;
  enviosHechos: number;
  enviosSaltados: number;
  creadaEn: string;
  pausadaEn: string | null;
  canceladaEn: string | null;
  direccionId: string | null;
}

export interface EnvioSuscripcion {
  id: string;
  suscripcionId: string;
  numero: number;
  fechaProgramada: string;
  estado: "programado" | "saltado" | "enviado" | "cobrado";
  /** Qué café llegó ese mes, para el historial del panel. */
  cafe: string;
  /** Si ese envío llevó la libra de regalo. */
  regalo: boolean;
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

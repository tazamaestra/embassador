// ── Catálogo ───────────────────────────────────────────────────────────────

/** El momento del día que acompaña un café. Conecta quiz, tienda y blog. */
export type MomentoId = "tres-pm" | "madrugada" | "domingo-tranquilo";

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

/** Una presentación extra del café (el cuarterón o la bolsa pequeña). */
export interface PresentacionNegocio {
  pesoG: number;
  /** Precio en la tienda pública. */
  precioCop: number;
  precioUsd?: number;
  /** Precio para clientes con cuenta. Sin él, el de la tienda. */
  precioClienteCop?: number;
}

export interface Product {
  id: string;
  name: string;
  productor: string;
  finca: string;
  /** La finca en inglés, si el nombre se traduce. */
  finca_en?: string;
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
  /** Precio de la bolsa en la tienda pública. */
  precioCop: number;
  precioUsd?: number;
  /** Precio de la bolsa para clientes con cuenta. Sin él, el de la tienda. */
  precioClienteCop?: number;
  /** Bolsa pequeña (220 g), con precio propio. */
  pequena?: PresentacionNegocio;
  /**
   * Presentación para cafeterías o negocios (el cuarterón), con precio
   * propio. Los campos de arriba son los de la bolsa normal.
   */
  negocio?: PresentacionNegocio;
  momento: MomentoId;
  img: string | null;
  swatch: string;
  /** Mockup de la bolsa: se dibuja mientras el café no tenga foto en img. */
  bolsa: BolsaCafe;
}

export interface ProductFilter {
  id: string;
  label_es: string;
  label_en: string;
}

// ── Clientes y capacitación ────────────────────────────────────────────────
// Los clientes son cafeterías o personas a quienes el equipo les crea la
// cuenta. Sus compras viven en el software de inventario (se consultan por
// API con su NIT o cédula); aquí solo quedan sus datos y las horas de
// capacitación que ya usaron.

export interface Cliente {
  id: string;
  email: string;
  nombre: string;
  telefono: string;
  /** Nombre de la cafetería o negocio, si aplica. */
  negocio: string;
  /** NIT o cédula. Si está vinculado, se copia del inventario al abrir la ficha. */
  documento: string;
  /** ID del cliente en el inventario: con esto se leen sus compras y pedidos. */
  inventarioId: string | null;
  ciudad: string;
  notas: string;
  activo: boolean;
  creadoEn: string;
}

export interface Capacitacion {
  id: string;
  clienteId: string;
  /** ISO de solo día. */
  fecha: string;
  horas: number;
  tema: string;
  notas: string;
}

/** Una línea de compra tal como la entrega el inventario, ya normalizada. */
export interface CompraInventario {
  id: string;
  /** ISO de solo día. */
  fecha: string;
  producto: string;
  /** Gramos por unidad, si el inventario lo dice. */
  gramos: number | null;
  cantidad: number;
  totalCop: number | null;
  /** true si la línea es de cuarterones (2.250 g). */
  esCuarteron: boolean;
}

export interface HorasCapacitacion {
  cuarterones: number;
  /** 1 por cada 3 cuarterones, en total. */
  base: number;
  /** 1 por cada 8 cuarterones dentro de un mismo mes. */
  regalo: number;
  /** base + regalo. */
  ganadas: number;
  usadas: number;
  disponibles: number;
  /** Cuarterones que faltan para la próxima hora. */
  faltanParaSiguiente: number;
  /** Cómo va el mes en curso hacia la hora de regalo. */
  mesActual: { mes: string; cuarterones: number; faltanParaRegalo: number };
  /** Meses que ya dieron horas de regalo, del más reciente al más viejo. */
  regaloPorMes: { mes: string; cuarterones: number; horas: number }[];
}

/** Lo que ve el cliente en su cuenta (y el equipo en su ficha). */
export interface ResumenCliente {
  cliente: Cliente;
  compras: CompraInventario[];
  /** Por qué no hay compras, si no se pudieron leer. */
  inventario: "ok" | "sin_configurar" | "sin_documento" | "no_registrado" | "error";
  /** true mientras no hay API de inventario: las compras son de ejemplo. */
  comprasSimuladas: boolean;
  /** Su cliente en el inventario, leído en vivo (null si no está vinculado o no existe). */
  clienteInventario: import("./inventario-contrato").ClienteInventario | null;
  /** Pedidos del cliente, leídos del inventario. */
  pedidos: Pedido[];
  capacitaciones: Capacitacion[];
  horas: HorasCapacitacion;
}

// ── Pedidos de la tienda ──────────────────────────────────────────────────

/** "confirmado" y "entregado" solo llegan desde el inventario. */
export type EstadoPedido = "pendiente" | "confirmado" | "pagado" | "fallido" | "enviado" | "entregado" | "cancelado";

export interface LineaPedido {
  cafe: string;
  nombre: string;
  presentacion: "bolsa" | "pequena" | "negocio";
  pesoG: number;
  cantidad: number;
  precioCop: number;
  /** Solo en pedidos desde la cuenta. */
  molienda?: Molienda;
}

export type Molienda = "grano" | "molido";

export interface Pedido {
  id: string;
  creadoEn: string;
  clienteId: string | null;
  email: string;
  nombre: string;
  telefono: string;
  linea: string;
  ciudad: string;
  departamento: string;
  notas: string;
  items: LineaPedido[];
  totalCop: number;
  estado: EstadoPedido;
  referencia: string;
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

export type Locale = "es" | "en";

/** Dibujo de la bolsa mientras no hay foto real de cada café. */
export type PatronBolsa = "puntos" | "ondas" | "rayas" | "hojas" | "montanas";

export interface BolsaCafe {
  fondo: string;
  acento: string;
  patron: PatronBolsa;
}

/** Un slide del carrusel del hero: un café y su historia corta. */
export interface HeroSlide {
  cafeId: string;
  titulo_es: string;
  titulo_en: string;
  destacado_es: string;
  destacado_en: string;
  relato_es: string;
  relato_en: string;
  /** Datos del proceso, en pastillas bajo el relato. */
  sellos_es: string[];
  sellos_en: string[];
  /** Sabores que flotan alrededor de la bolsa. */
  sabores_es: string[];
  sabores_en: string[];
  /** El dato grande pegado a la bolsa, ej. 30 · días de secado. */
  insignia: { num: string; txt_es: string; txt_en: string };
  /** Fondo del hero mientras se ve este café (gradiente CSS). */
  fondo: string;
}

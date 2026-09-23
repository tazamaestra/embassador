import rawContent from "../data/content.json";
import rawSuscripcion from "../data/suscripcion.json";
import type {
  Product, ProductFilter, Method, Step, OriginFact, Faq,
  BlogFilter, BlogPost, BlogPostRaw, HeroStat, Momento, MomentoId,
  SuscripcionConfig, Nivel, Frecuencia, Prepago, MetodoPreparacion,
} from "./types";

const c = rawContent as unknown as {
  brand: { name: string; tagline_es: string; tagline_en: string; country: string; currency: string; locale: string };
  heroStats: HeroStat[];
  momentos: Momento[];
  products: (Product & { _disabled?: boolean })[];
  productFilters: ProductFilter[];
  steps: Step[];
  originFacts: OriginFact[];
  faqs: Faq[];
  methods: (Method & { _disabled?: boolean })[];
  blogFilters: BlogFilter[];
  blogFeatured: { slug: string };
  blogPosts: BlogPostRaw[];
};

export const { brand, heroStats, momentos, productFilters, steps,
  originFacts, faqs, blogFilters } = c;

export const products = c.products.filter((p) => !p._disabled);
export const methods = c.methods.filter((m) => !m._disabled);

// El blog es texto y foto. Los campos de video siguen en el JSON —no se borran
// datos— pero no salen de este módulo: ningún componente puede renderizarlos
// aunque quisiera.
export const blogPosts: BlogPost[] = c.blogPosts.map(
  ({ videoId, isVideo, ...post }) => post // eslint-disable-line @typescript-eslint/no-unused-vars
);

export const blogFeatured: BlogPost =
  blogPosts.find((p) => p.slug === c.blogFeatured.slug) ?? blogPosts[0];

export function findProduct(slug: string): Product | undefined {
  return products.find((p) => p.id === slug);
}

export function findPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

/** La historia del blog que acompaña a un café, si la hay. */
export function findPostByCafe(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.cafeSlug === slug);
}

export function findMomento(id: string): Momento | undefined {
  return momentos.find((m) => m.id === id);
}

/** Cafés que acompañan un momento del día. */
export function productsByMomento(id: MomentoId): Product[] {
  return products.filter((p) => p.momento === id);
}

// ── Suscripción ────────────────────────────────────────────────────────────

export const suscripcionConfig = rawSuscripcion as unknown as SuscripcionConfig;

const porOrden = <T extends { orden: number }>(lista: T[]): T[] =>
  [...lista].sort((a, b) => a.orden - b.orden);

export const niveles: Nivel[] = porOrden(suscripcionConfig.niveles);
export const frecuencias: Frecuencia[] = porOrden(suscripcionConfig.frecuencias);
export const prepagos: Prepago[] = porOrden(suscripcionConfig.prepagos);

export const {
  metodos: metodosPreparacion,
  moliendas,
  perfiles,
  beneficios,
  origenDelMes,
  ciudades,
  regalo,
  faqs: faqsSuscripcion,
} = suscripcionConfig;

export function findNivel(id: string): Nivel | undefined {
  return niveles.find((n) => n.id === id);
}

export function findFrecuencia(id: string): Frecuencia | undefined {
  return frecuencias.find((f) => f.id === id);
}

export function findPrepago(id: string): Prepago | undefined {
  return prepagos.find((p) => p.id === id);
}

export function findMetodo(id: string): MetodoPreparacion | undefined {
  return metodosPreparacion.find((m) => m.id === id);
}

/** Lo que trae marcado el formulario si el cliente no toca nada. */
export const nivelPorDefecto: Nivel = niveles[0];
export const frecuenciaPorDefecto: Frecuencia = frecuencias[0];
export const prepagoPorDefecto: Prepago = prepagos[0];

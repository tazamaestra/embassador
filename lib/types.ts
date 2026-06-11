export interface Product {
  id: string;
  name: string;
  origin: string;
  roast_es: string;
  roast_en: string;
  cat: "origen" | "espresso" | "especial";
  notes_es: string;
  notes_en: string;
  retail: number;
  wholesale: number;
  img: string | null;
  swatch: string;
  altitude: string;
  process_es: string;
  process_en: string;
}

export interface ProductFilter {
  id: string;
  label_es: string;
  label_en: string;
}

export interface Method {
  code: string;
  big: string;
  tag: string;
  name: string;
  desc_es: string;
  desc_en: string;
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

export interface AiFeature {
  t_es: string;
  t_en: string;
  d_es: string;
  d_en: string;
}

export interface AiChat {
  from: "bot" | "user";
  text_es: string;
  text_en: string;
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

export interface BlogFilter {
  id: string;
  label_es: string;
  label_en: string;
}

export interface BlogPost {
  tag: string;
  cat: string;
  isVideo: boolean;
  t_es: string;
  t_en: string;
  d_es: string;
  d_en: string;
  sw: string;
}

export interface BlogFeatured {
  kicker_es: string;
  kicker_en: string;
  badge_es: string;
  badge_en: string;
  t_es: string;
  t_en: string;
  d_es: string;
  d_en: string;
  cta_es: string;
  cta_en: string;
}

export interface HeroStat {
  num: string;
  label_es: string;
  label_en: string;
}

export interface CalculatorConfig {
  costoEmbajador: number;
  libras: { min: number; max: number; step: number; default: number };
  precio: { min: number; max: number; step: number; default: number };
  formula: Record<string, string>;
}

export type Mode = "cliente" | "embajador";
export type Locale = "es" | "en";

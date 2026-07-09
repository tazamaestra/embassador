import rawContent from "../data/content.json";
import type {
  Product, ProductFilter, Method, Step, Benefit,
  Testimonial, OriginFact, Faq, BlogFilter, BlogPost, BlogFeatured,
  HeroStat, CalculatorConfig
} from "./types";

const c = rawContent as {
  brand: { name: string; tagline_es: string; tagline_en: string; country: string; currency: string; locale: string };
  heroStats: HeroStat[];
  products: Product[];
  productFilters: ProductFilter[];
  methods: Method[];
  steps: Step[];
  benefits: Benefit[];
  testimonials: Testimonial[];
  originFacts: OriginFact[];
  faqs: Faq[];
  blogFilters: BlogFilter[];
  blogFeatured: BlogFeatured;
  blogPosts: BlogPost[];
  calculator: CalculatorConfig;
};

export const { brand, heroStats, productFilters, steps,
  benefits, testimonials, originFacts, faqs,
  blogFilters, blogFeatured, blogPosts, calculator } = c;

export const products = c.products.filter((p: Product & { _disabled?: boolean }) => !p._disabled);
export const methods = c.methods.filter((m: Method & { _disabled?: boolean }) => !m._disabled);

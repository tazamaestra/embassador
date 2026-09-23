// Contenido del programa de embajadores, DORMIDO detrás de FEATURE_AMBASSADORS.
//
// Solo lo importan los componentes de /embajadores y el panel de embajador,
// que no se montan con el flag apagado. Se mantiene separado de lib/content.ts
// para que el contenido del sitio no tenga rastro del programa.

import raw from "../data/embajadores.json";
import type {
  Benefit, Testimonial, Faq, Step, HeroStat, CalculatorConfig,
} from "./types";

const e = raw as unknown as {
  heroStats: HeroStat[];
  steps: Step[];
  benefits: Benefit[];
  testimonials: Testimonial[];
  faqs: Faq[];
  calculator: CalculatorConfig;
};

export const {
  heroStats: ambHeroStats,
  steps: ambSteps,
  benefits,
  testimonials,
  faqs: ambFaqs,
  calculator,
} = e;

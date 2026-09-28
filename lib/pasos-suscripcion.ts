// Los tres pasos de la suscripción, en un solo lugar: los muestran el home
// (HowItWorks) y la página de suscripción (ComoFunciona), y no deben decir
// cosas distintas. Los días de cobro vienen de las reglas en Supabase; donde
// no se lee el catálogo (el home es estático) el paso lo dice sin el número.

export interface PasoSuscripcion {
  n: string;
  t: string;
  d: string;
}

export function pasosSuscripcion(es: boolean, diasCobro?: number): PasoSuscripcion[] {
  const cuando = diasCobro === undefined
    ? { es: "Cobramos antes de cada envío", en: "We charge before each shipment" }
    : { es: `Cobramos ${diasCobro} días antes`, en: `We charge ${diasCobro} days before` };

  return es
    ? [
        { n: "01", t: "Eliges plan y ritmo", d: "Miras los planes y escoges, o haces el quiz de cinco preguntas y te sale el plan, la frecuencia y la molienda." },
        { n: "02", t: cuando.es, d: "Cada envío se cobra unos días antes de salir. Hasta ese momento lo saltas o lo pausas con un clic." },
        { n: "03", t: "Tostamos y despachamos", d: "Se tuesta en esos días y sale para tu ciudad, molido para tu método o en grano." },
      ]
    : [
        { n: "01", t: "Pick a plan and a pace", d: "Browse the plans and choose, or take the five-question quiz for the plan, frequency and grind." },
        { n: "02", t: cuando.en, d: "Each shipment is charged a few days before it leaves. Until then, skip or pause it with one click." },
        { n: "03", t: "We roast and ship", d: "Roasted in those days and sent to your city, ground for your method or whole bean." },
      ];
}

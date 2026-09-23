import { suscripcionConfig } from "@/lib/content";
import Revelar from "@/components/shared/Revelar";
import type { Locale } from "@/lib/types";

export default function ComoFunciona({ locale }: { locale: Locale }) {
  const es = locale !== "en";
  const { cobroDia, despachoDia } = suscripcionConfig;

  const pasos = es
    ? [
        { n: "01", t: "Eliges cuánto", d: "La calculadora te dice cuántos gramos gastas al mes. De ahí sale el plan." },
        { n: "02", t: `Te cobramos el día ${cobroDia}`, d: "El mismo día cada mes. Puedes saltar o pausar antes de esa fecha." },
        { n: "03", t: `Despachamos el día ${despachoDia}`, d: "Se tuesta esa misma semana y sale para tu ciudad." },
      ]
    : [
        { n: "01", t: "Pick how much", d: "The calculator tells you how many grams you use a month. The plan follows from that." },
        { n: "02", t: `We charge on the ${cobroDia}st`, d: "Same day every month. You can skip or pause before that date." },
        { n: "03", t: `We ship on the ${despachoDia}th`, d: "Roasted that same week and on its way to your city." },
      ];

  return (
    <section className="py-20 bg-arena">
      <div className="max-w-[1240px] mx-auto px-[22px]">
        <Revelar>
          <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">
            {es ? "CÓMO FUNCIONA" : "HOW IT WORKS"}
          </p>
          <h2
            className="font-display font-bold text-tinta mb-10"
            style={{ fontSize: "clamp(28px,4vw,44px)" }}
          >
            {es ? "Tres pasos y ya" : "Three steps, done"}
          </h2>
        </Revelar>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pasos.map((paso, i) => (
            <Revelar as="li" key={paso.n} retrasoMs={i * 90}>
              <div className="border-t-2 border-vino pt-5">
                <span
                  className="font-display font-bold text-vino/25 leading-none block mb-2"
                  style={{ fontSize: "clamp(40px,5vw,56px)" }}
                  aria-hidden="true"
                >
                  {paso.n}
                </span>
                <h3 className="font-display font-bold text-tinta text-2xl mb-2">{paso.t}</h3>
                <p className="font-body text-tinta-suave text-sm leading-relaxed">{paso.d}</p>
              </div>
            </Revelar>
          ))}
        </ol>
      </div>
    </section>
  );
}

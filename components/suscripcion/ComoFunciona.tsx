import Revelar from "@/components/shared/Revelar";
import type { Locale, ReglasSuscripcion } from "@/lib/types";

export default function ComoFunciona({ locale, reglas }: { locale: Locale; reglas: ReglasSuscripcion }) {
  const es = locale !== "en";
  const dias = reglas.diasCobroAntesEnvio;

  const pasos = es
    ? [
        { n: "01", t: "Eliges plan y ritmo", d: "Cinco preguntas en el quiz y sale el plan, la frecuencia y la molienda. Lo ajustas si quieres." },
        { n: "02", t: `Cobramos ${dias} días antes`, d: "Cada envío se cobra unos días antes de salir. Hasta ese momento lo saltas o lo pausas con un clic." },
        { n: "03", t: "Tostamos y despachamos", d: "Se tuesta en esos días y sale para tu ciudad, molido para tu método o en grano." },
      ]
    : [
        { n: "01", t: "Pick a plan and a pace", d: "Five quiz questions give you the plan, frequency and grind. Adjust them if you like." },
        { n: "02", t: `We charge ${dias} days before`, d: "Each shipment is charged a few days before it leaves. Until then, skip or pause it with one click." },
        { n: "03", t: "We roast and ship", d: "Roasted in those days and sent to your city, ground for your method or whole bean." },
      ];

  return (
    <section className="py-20 bg-arena">
      <div className="max-w-[1240px] mx-auto px-[22px]">
        <Revelar>
          <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">
            {es ? "CÓMO FUNCIONA" : "HOW IT WORKS"}
          </p>
          <h2 className="font-display font-bold text-tinta mb-10" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
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

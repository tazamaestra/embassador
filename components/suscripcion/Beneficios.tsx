import { beneficios } from "@/lib/content";
import Revelar from "@/components/shared/Revelar";
import type { Locale } from "@/lib/types";

// Lista numerada en dos columnas, no ocho tarjetas con ícono de stock. El
// número ordena y deja que el dato pese más que la decoración.
export default function Beneficios({ locale }: { locale: Locale }) {
  const es = locale !== "en";

  return (
    <section id="beneficios" className="py-20 bg-fondo scroll-mt-20">
      <div className="max-w-[1240px] mx-auto px-[22px]">
        <Revelar>
          <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">
            {es ? "QUÉ INCLUYE" : "WHAT'S INCLUDED"}
          </p>
          <h2
            className="font-display font-bold text-tinta mb-10"
            style={{ fontSize: "clamp(28px,4vw,44px)" }}
          >
            {es ? "Ocho cosas concretas" : "Eight concrete things"}
          </h2>
        </Revelar>

        <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-7">
          {beneficios.map((b, i) => (
            <Revelar as="li" key={b.id} retrasoMs={(i % 2) * 60}>
              <div className="flex gap-5 border-t border-borde pt-5">
                <span
                  className="font-mono text-[11px] text-dorado tracking-[.1em] pt-1 shrink-0"
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display font-bold text-tinta text-xl mb-1.5">
                    {es ? b.label_es : b.label_en}
                  </h3>
                  <p className="font-body text-tinta-suave text-sm leading-relaxed">
                    {es ? b.desc_es : b.desc_en}
                  </p>
                </div>
              </div>
            </Revelar>
          ))}
        </ol>
      </div>
    </section>
  );
}

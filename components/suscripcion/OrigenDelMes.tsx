import Image from "next/image";
import { origenDelMes } from "@/lib/content";
import Revelar from "@/components/shared/Revelar";
import type { Locale } from "@/lib/types";

// Datos de la finca antes que adjetivos: productor, altura, proceso, variedad.
export default function OrigenDelMes({ locale }: { locale: Locale }) {
  const es = locale !== "en";
  const o = origenDelMes;

  const ficha = es
    ? [
        { k: "PRODUCTOR", v: o.productor },
        { k: "FINCA", v: o.finca },
        { k: "REGIÓN", v: o.region },
        { k: "ALTURA", v: o.altura },
        { k: "VARIEDAD", v: o.variedad },
        { k: "PROCESO", v: o.proceso_es },
      ]
    : [
        { k: "PRODUCER", v: o.productor },
        { k: "FARM", v: o.finca },
        { k: "REGION", v: o.region },
        { k: "ALTITUDE", v: o.altura },
        { k: "VARIETY", v: o.variedad },
        { k: "PROCESS", v: o.proceso_en },
      ];

  return (
    <section className="py-20 bg-fondo">
      <div className="max-w-[1240px] mx-auto px-[22px]">
        <Revelar>
          <div className="rounded-card-lg border border-borde overflow-hidden grid grid-cols-1 md:grid-cols-2">
            {/* Foto de la finca. Placeholder hasta que entre la real. */}
            <div
              className="relative min-h-[260px] md:min-h-[420px]"
              style={{ background: o.swatch }}
            >
              {o.foto ? (
                <Image
                  src={o.foto}
                  alt={
                    es
                      ? `Finca ${o.finca}, de ${o.productor}`
                      : `${o.finca} farm, ${o.productor}'s`
                  }
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <span className="font-mono text-[10px] text-white/50 tracking-[.15em] text-center uppercase">
                    {es
                      ? `[ foto de la finca ${o.finca} ]`
                      : `[ photo of ${o.finca} farm ]`}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-white p-8 md:p-10 flex flex-col justify-center">
              <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">
                {es ? o.mes_es : o.mes_en}
              </p>
              <h2 className="font-display font-bold text-tinta text-3xl md:text-4xl mb-2">
                {o.finca}
              </h2>
              <p className="font-body text-tinta text-base leading-relaxed mb-6">
                {es ? o.notas_es : o.notas_en}
              </p>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-borde pt-6">
                {ficha.map(({ k, v }) => (
                  <div key={k}>
                    <dt className="font-mono text-[9px] tracking-[.18em] text-tinta-suave uppercase mb-0.5">
                      {k}
                    </dt>
                    <dd className="font-body font-600 text-tinta text-sm">{v}</dd>
                  </div>
                ))}
              </dl>

              <p className="font-body text-tinta-suave text-sm mt-6">
                {es
                  ? "Entra en los planes de 2 y 3 libras. Cambia cada mes."
                  : "Included in the 2 and 3 pound plans. Changes every month."}
              </p>
            </div>
          </div>
        </Revelar>
      </div>
    </section>
  );
}

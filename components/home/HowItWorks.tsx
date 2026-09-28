import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/nav";
import { pasosSuscripcion } from "@/lib/pasos-suscripcion";
import type { Locale } from "@/lib/types";

// Los mismos tres pasos de /suscripcion. Componente de servidor.
export default async function HowItWorks({ locale }: { locale: Locale }) {
  const t = await getTranslations("how");
  const es = locale !== "en";
  const pasos = pasosSuscripcion(es);

  return (
    <section className="py-20" style={{ background: "linear-gradient(150deg,#7E181C,#4A0B0F)" }}>
      <div className="max-w-[1240px] mx-auto px-[22px]">
        <div className="mb-12">
          <p className="font-mono text-[11px] tracking-[.2em] text-dorado-claro uppercase mb-2">
            {t("kicker")}
          </p>
          <h2
            className="font-display font-bold text-crema-papel"
            style={{ fontSize: "clamp(28px,4vw,44px)" }}
          >
            {t("h2")}
          </h2>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pasos.map((step) => (
            <li
              key={step.n}
              className="rounded-card border border-white/10 p-6"
              style={{ background: "rgba(255,255,255,.06)" }}
            >
              <span className="font-display font-bold text-dorado-claro text-4xl leading-none block mb-4">
                {step.n}
              </span>
              <h3 className="font-display font-bold text-crema-papel text-xl mb-2">
                {step.t}
              </h3>
              <p className="font-body text-crema/70 text-sm leading-relaxed">
                {step.d}
              </p>
            </li>
          ))}
        </ol>

        <Link
          href="/suscripcion"
          className="inline-block mt-10 border border-crema/50 text-crema hover:bg-white/10 font-body font-700 text-base px-6 py-3 rounded-btn transition-colors duration-150"
        >
          {t("cta")} →
        </Link>
      </div>
    </section>
  );
}

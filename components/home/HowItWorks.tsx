import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/nav";
import { steps } from "@/lib/content";
import type { Locale } from "@/lib/types";

// Tres pasos hasta pagar. Componente de servidor.
export default async function HowItWorks({ locale }: { locale: Locale }) {
  const t = await getTranslations("how");
  const es = locale !== "en";

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
          {steps.map((step) => (
            <li
              key={step.n}
              className="rounded-card border border-white/10 p-6"
              style={{ background: "rgba(255,255,255,.06)" }}
            >
              <span className="font-display font-bold text-dorado-claro text-4xl leading-none block mb-4">
                {step.n}
              </span>
              <h3 className="font-display font-bold text-crema-papel text-xl mb-2">
                {es ? step.t_es : step.t_en}
              </h3>
              <p className="font-body text-crema/70 text-sm leading-relaxed">
                {es ? step.d_es : step.d_en}
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

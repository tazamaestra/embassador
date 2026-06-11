"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/nav";
import { steps } from "@/lib/content";
import type { Locale } from "@/lib/types";

export default function HowItWorks({ locale }: { locale: Locale }) {
  const t = useTranslations("how");

  return (
    <section className="py-20" style={{ background: "#2A1410" }}>
      <div className="max-w-[1240px] mx-auto px-[22px]">
        <div className="text-center mb-12">
          <p className="font-mono text-[11px] tracking-[.2em] text-naranja uppercase mb-2">{t("kicker")}</p>
          <h2
            className="font-display font-bold text-crema-papel"
            style={{ fontSize: "clamp(30px,4vw,46px)" }}
          >
            {t("h2")}
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
          {steps.map((step) => (
            <div
              key={step.n}
              className="rounded-card border border-white/10 p-6"
              style={{ background: "rgba(255,255,255,.04)" }}
            >
              <div className="font-display font-bold text-naranja text-5xl leading-none mb-4">
                {step.n}
              </div>
              <h3 className="font-display font-bold text-crema-papel text-xl mb-2">
                {locale === "en" ? step.t_en : step.t_es}
              </h3>
              <p className="font-body text-crema/60 text-sm leading-relaxed">
                {locale === "en" ? step.d_en : step.d_es}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/embajadores"
            className="inline-flex items-center gap-2 bg-naranja hover:bg-naranja-700 text-white font-body font-700 text-base px-7 py-3.5 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5"
          >
            {t("cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}

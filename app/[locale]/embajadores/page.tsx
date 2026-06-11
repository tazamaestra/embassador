"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link } from "@/lib/nav";
import { benefits } from "@/lib/content";
import ProfitCalculator from "@/components/ambassador/ProfitCalculator";
import WhatsAppMock from "@/components/ambassador/WhatsAppMock";
import FaqAccordion from "@/components/ambassador/FaqAccordion";
import type { Locale } from "@/lib/types";

export default function EmbajadoresPage() {
  const t = useTranslations("ambassador");
  const locale = useLocale() as Locale;

  return (
    <>
      {/* Hero */}
      <section
        className="py-20 md:py-28"
        style={{ background: "radial-gradient(120% 130% at 80% 0%, #7E181C, #5E0F13 55%, #4A0B0F)" }}
      >
        <div className="max-w-[1240px] mx-auto px-[22px] grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="font-mono text-[11px] tracking-[.22em] text-dorado-claro uppercase mb-4">{t("kicker")}</p>
            <h1
              className="font-display font-bold text-crema-papel leading-[1.02] mb-4"
              style={{ fontSize: "clamp(36px,5vw,62px)" }}
            >
              {t("h1a")} <em className="text-naranja-claro not-italic">{t("h1b")}</em>
            </h1>
            <p className="font-body text-crema/75 text-base md:text-lg leading-relaxed mb-8 max-w-[480px]">{t("sub")}</p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#tm-calc"
                className="bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5"
              >
                {t("ctaCalc")}
              </a>
              <Link
                href="/tienda"
                className="border border-crema/50 text-crema hover:bg-white/10 font-body font-700 text-base px-6 py-3 rounded-btn transition-all duration-150"
              >
                {t("ctaCatalog")}
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <Image
              src="/bag-green.png"
              alt="Bolsa de café verde — programa de embajadores"
              width={300}
              height={370}
              className="drop-shadow-2xl w-[200px] md:w-[280px]"
            />
          </div>
        </div>
      </section>

      {/* Benefits grid */}
      <section className="py-20 bg-fondo">
        <div className="max-w-[1240px] mx-auto px-[22px]">
          <div className="text-center mb-12">
            <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">{t("benefitsKicker")}</p>
            <h2 className="font-display font-bold text-tinta" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
              {t("benefitsH2")}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <div key={i} className="bg-white rounded-card border border-borde p-6 flex gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover">
                <div
                  className="w-11 h-11 rounded-[10px] bg-vino flex items-center justify-center text-xl shrink-0"
                  aria-hidden="true"
                >
                  {b.icon}
                </div>
                <div>
                  <h3 className="font-display font-bold text-tinta text-xl mb-1">
                    {locale === "en" ? b.t_en : b.t_es}
                  </h3>
                  <p className="font-body text-tinta-suave text-sm leading-relaxed">
                    {locale === "en" ? b.d_en : b.d_es}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProfitCalculator />
      <WhatsAppMock locale={locale} />
      <FaqAccordion locale={locale} />
    </>
  );
}

"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/nav";
import { heroStats } from "@/lib/content";
import type { Locale } from "@/lib/types";

export default function Hero({ locale }: { locale: Locale }) {
  const t = useTranslations("hero");

  return (
    <section
      aria-label="Hero"
      style={{
        background:
          "radial-gradient(120% 130% at 80% 0%, #7E181C, #5E0F13 55%, #4A0B0F)",
      }}
    >
      {/* Main hero */}
      <div className="max-w-[1240px] mx-auto px-[22px] py-20 md:py-28 grid grid-cols-1 md:grid-cols-[1.05fr_.95fr] gap-10 items-center">
        {/* Left: copy */}
        <div>
          {/* Kicker */}
          <div className="inline-flex items-center gap-2 bg-white/10 text-naranja-claro font-mono text-[11px] tracking-[.2em] px-3 py-1.5 rounded-pill mb-6">
            {t("kicker")}
          </div>

          {/* H1 */}
          <h1
            className="font-display font-bold text-crema-papel leading-[1.02] tracking-[-0.01em] mb-5"
            style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
          >
            {t("h1a")}{" "}
            <em className="text-naranja-claro not-italic">{t("h1b")}</em>{" "}
            {t("h1c")}
          </h1>

          <p className="font-body text-crema/80 text-base md:text-lg leading-relaxed mb-8 max-w-[500px]">
            {t("sub")}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mb-10">
            <Link
              href="/tienda"
              className="bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5"
            >
              {t("ctaBuy")}
            </Link>
            <Link
              href="/embajadores"
              className="border border-crema/50 text-crema hover:bg-white/10 font-body font-700 text-base px-6 py-3 rounded-btn transition-all duration-150"
            >
              {t("ctaAmb")}
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-8">
            {heroStats.map((stat, i) => (
              <div key={i}>
                <div className="font-display font-bold text-dorado-claro text-4xl leading-none">
                  {stat.num}
                </div>
                <div className="font-mono text-[10px] tracking-[.15em] text-crema/60 uppercase mt-1">
                  {locale === "en" ? stat.label_en : stat.label_es}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: bag + steam */}
        <div className="flex items-center justify-center relative">
          <div
            className="absolute inset-0 rounded-full opacity-20"
            style={{
              background:
                "radial-gradient(circle, #F0C14B 0%, transparent 70%)",
              transform: "scale(0.8)",
            }}
            aria-hidden="true"
          />
          {/* Steam columns */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-6" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1 h-10 rounded-full bg-white/30"
                style={{
                  animation: `steam 3.2s ease-in-out ${[0, 0.9, 1.7][i]}s infinite`,
                }}
              />
            ))}
          </div>
          <Image
            src="/bag-maroon.png"
            alt="Café Taza Maestra — bolsa de café de especialidad colombiano"
            width={340}
            height={420}
            className="relative z-10 w-[240px] md:w-[320px] drop-shadow-2xl"
            priority
          />
        </div>
      </div>

      {/* Double-path strip */}
      <div
        className="border-t border-white/10"
        style={{ background: "rgba(0,0,0,.16)" }}
      >
        <div className="max-w-[1240px] mx-auto px-[22px] py-5 grid grid-cols-1 sm:grid-cols-2 gap-0">
          <Link
            href="/tienda"
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-4 rounded-btn hover:bg-white/10 transition-colors duration-150 sm:border-r sm:border-white/10"
          >
            <div>
              <div className="font-display font-bold text-crema-papel text-xl">{t("pathBuyTitle")}</div>
              <div className="font-body text-crema/60 text-sm mt-0.5">{t("pathBuyDesc")}</div>
            </div>
            <svg className="w-5 h-5 text-naranja-claro ml-auto shrink-0" fill="none" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/embajadores"
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-4 rounded-btn hover:bg-white/10 transition-colors duration-150"
          >
            <div>
              <div className="font-display font-bold text-crema-papel text-xl">{t("pathAmbTitle")}</div>
              <div className="font-body text-crema/60 text-sm mt-0.5">{t("pathAmbDesc")}</div>
            </div>
            <svg className="w-5 h-5 text-naranja-claro ml-auto shrink-0" fill="none" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

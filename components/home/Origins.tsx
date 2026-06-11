"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { originFacts } from "@/lib/content";
import type { Locale } from "@/lib/types";

export default function Origins({ locale }: { locale: Locale }) {
  const t = useTranslations("origin");

  return (
    <section className="py-20 bg-fondo">
      <div className="max-w-[1240px] mx-auto px-[22px] grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left: image with bag overlay */}
        <div className="relative rounded-card-lg overflow-hidden bg-arena min-h-[300px] flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-full h-full"
              aria-label="[ foto: finca cafetera colombiana ]"
              style={{ background: "repeating-linear-gradient(45deg, #EFE3C8, #EFE3C8 10px, #E5D5B5 10px, #E5D5B5 20px)" }}
            />
            <span className="absolute font-mono text-[11px] tracking-[.12em] text-tinta-suave text-center p-4">
              [ foto: finca cafetera colombiana ]
            </span>
          </div>
          <Image
            src="/bag-green.png"
            alt="Café Nariño Altura — bolsa verde"
            width={180}
            height={220}
            className="relative z-10 drop-shadow-xl"
          />
        </div>

        {/* Right: text + facts */}
        <div>
          <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-3">{t("kicker")}</p>
          <h2 className="font-display font-bold text-tinta mb-4" style={{ fontSize: "clamp(30px,4vw,46px)" }}>
            {t("h2a")} <span className="text-vino">{t("h2b")}</span>
          </h2>
          <p className="font-body text-tinta-suave text-base leading-relaxed mb-8">{t("p")}</p>

          <div className="grid grid-cols-2 gap-4">
            {originFacts.map((fact, i) => (
              <div key={i} className="bg-arena rounded-card p-4">
                <div className="font-mono text-[10px] tracking-[.18em] text-dorado uppercase mb-1">
                  {locale === "en" ? fact.k_en : fact.k_es}
                </div>
                <div className="font-display font-bold text-tinta text-lg leading-tight">
                  {fact.v ?? (locale === "en" ? fact.v_en : fact.v_es)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

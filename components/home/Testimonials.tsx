"use client";

import { useTranslations } from "next-intl";
import { testimonials } from "@/lib/content";
import type { Locale } from "@/lib/types";

export default function Testimonials({ locale }: { locale: Locale }) {
  const t = useTranslations("testimonials");

  return (
    <section className="py-20 bg-arena">
      <div className="max-w-[1240px] mx-auto px-[22px]">
        <div className="text-center mb-10">
          <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">{t("kicker")}</p>
          <h2 className="font-display font-bold text-tinta" style={{ fontSize: "clamp(30px,4vw,46px)" }}>
            {t("h2")}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((test, i) => (
            <div
              key={i}
              className="bg-white rounded-card p-7 border border-borde transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div className="flex gap-0.5 mb-4 text-naranja text-base">★★★★★</div>
              <blockquote className="font-display italic font-500 text-tinta-cafe text-lg leading-snug mb-5">
                "{locale === "en" ? test.quote_en : test.quote_es}"
              </blockquote>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full bg-vino flex items-center justify-center font-display font-bold text-crema text-sm shrink-0"
                  aria-hidden="true"
                >
                  {test.initial}
                </div>
                <div>
                  <div className="font-body font-700 text-tinta text-sm">{test.name}</div>
                  <div className="font-mono text-[10px] tracking-[.12em] text-tinta-suave">
                    {locale === "en" ? test.role_en : test.role_es}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

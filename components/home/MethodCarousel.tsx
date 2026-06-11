"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { methods } from "@/lib/content";
import type { Locale } from "@/lib/types";

export default function MethodCarousel({ locale }: { locale: Locale }) {
  const t = useTranslations("methods");
  const tA11y = useTranslations("a11y");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = methods.length;

  const goTo = useCallback((i: number) => {
    setIndex(((i % total) + total) % total);
  }, [total]);

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => goTo(index + 1), 6000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [index, paused, goTo]);

  const m = methods[index];

  return (
    <section className="py-20 bg-fondo" aria-label="Carrusel de métodos de preparación">
      <div className="max-w-[1240px] mx-auto px-[22px]">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">{t("kicker")}</p>
          <h2 className="font-display font-bold text-tinta" style={{ fontSize: "clamp(30px,4vw,46px)" }}>
            {t("h2")}
          </h2>
          <p className="font-body text-tinta-suave text-base mt-3 max-w-[540px] mx-auto">{t("sub")}</p>
        </div>

        {/* Arrows + slide container */}
        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div
            aria-roledescription="carrusel"
            aria-label={t("h2")}
            className="overflow-hidden rounded-card-lg"
          >
            <div
              className="flex"
              style={{ transform: `translateX(-${index * 100}%)`, transition: "transform .55s cubic-bezier(.4,0,.2,1)" }}
            >
              {methods.map((method, i) => (
                <div
                  key={method.code}
                  role="group"
                  aria-roledescription="diapositiva"
                  aria-label={`${i + 1} de ${total}: ${method.name}`}
                  aria-hidden={i !== index}
                  className="min-w-full grid grid-cols-1 md:grid-cols-2 rounded-card-lg overflow-hidden border border-borde"
                >
                  {/* Left: visual */}
                  <div className="bg-arena flex items-center justify-center min-h-[220px] md:min-h-[300px] relative">
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <span
                        className="font-display font-bold text-tinta/8 select-none"
                        style={{ fontSize: "clamp(120px, 22vw, 200px)", lineHeight: 1 }}
                      >
                        {method.big}
                      </span>
                    </div>
                    <div className="relative z-10 text-center">
                      <p className="font-mono text-[11px] tracking-[.2em] text-tinta-suave uppercase mb-2">{method.code}</p>
                      <p className="font-display font-bold text-tinta text-3xl">{method.name}</p>
                      <p className="font-mono text-[10px] tracking-[.15em] text-dorado uppercase mt-1">{method.tag}</p>
                    </div>
                  </div>

                  {/* Right: info card */}
                  <div className="bg-vino text-crema-papel p-8 flex flex-col justify-center">
                    <span className="font-mono text-[10px] tracking-[.2em] text-dorado-claro/80 uppercase mb-3">{method.tag}</span>
                    <h3 className="font-display font-bold text-crema-papel text-2xl mb-3">{method.name}</h3>
                    <p className="font-body text-crema/80 text-sm leading-relaxed mb-6">
                      {locale === "en" ? method.desc_en : method.desc_es}
                    </p>
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                      {[
                        { label: t("ratio"), value: method.ratio },
                        { label: t("time"), value: method.time },
                        { label: t("body"), value: locale === "en" ? method.body_en : method.body_es },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center">
                          <div className="font-display font-bold text-dorado-claro text-xl">{value}</div>
                          <div className="font-mono text-[9px] tracking-[.18em] text-crema/50 uppercase mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prev/Next arrows */}
          <button
            onClick={() => goTo(index - 1)}
            aria-label={tA11y("prevMethod")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-white border border-borde shadow-sm flex items-center justify-center text-vino hover:bg-arena transition-colors z-10 hidden sm:flex"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => goTo(index + 1)}
            aria-label={tA11y("nextMethod")}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-white border border-borde shadow-sm flex items-center justify-center text-vino hover:bg-arena transition-colors z-10 hidden sm:flex"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Dots (tablist) */}
        <div role="tablist" aria-label="Seleccionar método" className="flex justify-center gap-2 mt-6">
          {methods.map((method, i) => (
            <button
              key={method.code}
              role="tab"
              aria-selected={i === index}
              aria-label={method.name}
              onClick={() => goTo(i)}
              className={`rounded-pill transition-all duration-300 ${
                i === index ? "w-8 h-2 bg-vino" : "w-2 h-2 bg-borde-2 hover:bg-dorado"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

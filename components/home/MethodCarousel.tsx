"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { methods } from "@/lib/content";
import type { Locale } from "@/lib/types";

const svgProps = {
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

function IconV60({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 52" className={className} {...svgProps}>
      {/* rim ellipse */}
      <ellipse cx="22" cy="7" rx="17" ry="4" />
      {/* cone left & right */}
      <path d="M5 7 L22 46 L39 7" />
      {/* drip spout */}
      <path d="M22 46 v5" />
      {/* inner spiral ridges */}
      <path d="M13 18 L22 40" strokeWidth="1.1" strokeOpacity={0.45} />
      <path d="M31 18 L22 40" strokeWidth="1.1" strokeOpacity={0.45} />
      <path d="M22 12 v8" strokeWidth="1.1" strokeOpacity={0.45} />
    </svg>
  );
}

function IconFrenchPress({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 52" className={className} {...svgProps}>
      {/* glass body */}
      <rect x="8" y="14" width="28" height="30" rx="2" />
      {/* lid (slightly wider) */}
      <rect x="6" y="11" width="32" height="5" rx="2.5" />
      {/* plunger knob */}
      <circle cx="22" cy="5" r="4" />
      {/* plunger rod */}
      <line x1="22" y1="9" x2="22" y2="26" />
      {/* plunger disc */}
      <rect x="9" y="26" width="26" height="3" rx="1.5" />
      {/* base plate */}
      <rect x="5" y="44" width="34" height="4" rx="2" />
      {/* subtle glass highlight */}
      <line x1="13" y1="17" x2="13" y2="41" strokeWidth="1" strokeOpacity={0.35} />
    </svg>
  );
}

function IconChemex({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 54" className={className} {...svgProps}>
      {/* top funnel/cone */}
      <path d="M4 4 L22 26 L40 4" />
      {/* wooden collar — two parallel bands */}
      <path d="M14 26 h16" />
      <path d="M14 29 h16" />
      {/* bottom round flask */}
      <path d="M14 29 Q5 29 5 38 Q5 50 22 50 Q39 50 39 38 Q39 29 30 29" />
      {/* side handle/loop */}
      <path d="M30 29 Q42 29 42 38 Q42 47 30 47" />
    </svg>
  );
}

function IconMoka({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 54" className={className} {...svgProps}>
      {/* top chamber — narrower dome */}
      <path d="M15 27 L15 15 Q15 4 22 4 Q29 4 29 15 L29 27" />
      {/* dome cap detail */}
      <path d="M16 8 Q22 5 28 8" strokeWidth="1.1" strokeOpacity={0.5} />
      {/* spout on top chamber */}
      <path d="M29 14 Q36 11 36 18" />
      {/* valve nozzle at top */}
      <circle cx="22" cy="4" r="2.5" />
      {/* waist / filter connector */}
      <path d="M15 27 h14" />
      {/* bottom chamber — wider trapezoid */}
      <path d="M10 50 L10 33 Q10 29 15 29 L29 29 Q34 29 34 33 L34 50 Z" />
      {/* base ring */}
      <path d="M8 50 h28" />
      {/* octagonal base detail */}
      <path d="M8 50 L10 46" strokeWidth="1.1" strokeOpacity={0.4} />
      <path d="M36 50 L34 46" strokeWidth="1.1" strokeOpacity={0.4} />
    </svg>
  );
}

const BREW_ICONS: Record<string, (p: { className?: string }) => JSX.Element> = {
  V60: IconV60,
  FP:  IconFrenchPress,
  CX:  IconChemex,
  MK:  IconMoka,
};

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
    intervalRef.current = setInterval(() => goTo(index + 1), 7000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [index, paused, goTo]);

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
              {methods.map((method, i) => {
                const steps = locale === "en" ? method.steps_en : method.steps_es;
                const BrewIcon = BREW_ICONS[method.big];

                return (
                  <div
                    key={method.code}
                    role="group"
                    aria-roledescription="diapositiva"
                    aria-label={`${i + 1} de ${total}: ${method.name}`}
                    aria-hidden={i !== index}
                    className="min-w-full grid grid-cols-1 md:grid-cols-2 rounded-card-lg overflow-hidden border border-borde"
                  >
                    {/* Left: visual panel */}
                    <div className="bg-arena flex items-center justify-center min-h-[220px] md:min-h-[360px] relative">
                      {/* Large code watermark */}
                      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                        <span
                          className="font-display font-bold text-tinta/8 select-none"
                          style={{ fontSize: "clamp(120px, 22vw, 200px)", lineHeight: 1 }}
                        >
                          {method.big}
                        </span>
                      </div>

                      {/* Icon + name centered */}
                      <div className="relative z-10 text-center flex flex-col items-center gap-3">
                        {BrewIcon ? (
                          <BrewIcon className="w-16 h-16 text-vino" />
                        ) : (
                          <span className="font-display font-bold text-vino text-5xl">{method.big}</span>
                        )}
                        <div>
                          <p className="font-mono text-[11px] tracking-[.2em] text-tinta-suave uppercase">{method.code}</p>
                          <p className="font-display font-bold text-tinta text-2xl mt-0.5">{method.name}</p>
                          <p className="font-mono text-[10px] tracking-[.15em] text-dorado uppercase mt-1">{method.tag}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right: recipe card */}
                    <div className="bg-vino text-crema-papel p-8 flex flex-col justify-between">
                      <div>
                        {/* Header with icon */}
                        <div className="flex items-center gap-3 mb-5">
                          {BrewIcon && <BrewIcon className="w-8 h-8 text-dorado-claro shrink-0" />}
                          <div>
                            <h3 className="font-display font-bold text-crema-papel text-xl leading-tight">{method.name}</h3>
                            <p className="font-body text-crema/65 text-xs mt-0.5">
                              {locale === "en" ? method.desc_en : method.desc_es}
                            </p>
                          </div>
                        </div>

                        {/* Step-by-step */}
                        <ol className="space-y-2.5" aria-label={locale === "en" ? "Recipe steps" : "Pasos de la receta"}>
                          {steps.map((step, si) => (
                            <li key={si} className="flex items-start gap-3">
                              <span
                                className="shrink-0 w-5 h-5 rounded-full bg-dorado/20 border border-dorado/30 flex items-center justify-center font-mono text-[9px] font-bold text-dorado-claro mt-0.5"
                                aria-hidden="true"
                              >
                                {si + 1}
                              </span>
                              <span className="font-body text-crema/85 text-sm leading-snug">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Stats bar */}
                      <div className="grid grid-cols-3 gap-4 pt-5 mt-5 border-t border-white/10">
                        {[
                          { label: t("ratio"), value: method.ratio },
                          { label: t("time"),  value: method.time },
                          { label: t("body"),  value: locale === "en" ? method.body_en : method.body_es },
                        ].map(({ label, value }) => (
                          <div key={label} className="text-center">
                            <div className="font-display font-bold text-dorado-claro text-xl">{value}</div>
                            <div className="font-mono text-[9px] tracking-[.18em] text-crema/50 uppercase mt-0.5">{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prev arrow */}
          <button
            onClick={() => goTo(index - 1)}
            aria-label={tA11y("prevMethod")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-white border border-borde shadow-sm flex items-center justify-center text-vino hover:bg-arena transition-colors z-10 hidden sm:flex"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Next arrow */}
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

        {/* Dots */}
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

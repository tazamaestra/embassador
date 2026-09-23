import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { heroStats } from "@/lib/content";
import type { Locale } from "@/lib/types";

// Componente de servidor: el home solo manda al navegador la isla del quiz.
export default async function Hero({ locale }: { locale: Locale }) {
  const t = await getTranslations("hero");

  return (
    <section
      aria-label="Hero"
      style={{
        background:
          "radial-gradient(120% 130% at 80% 0%, #7E181C, #5E0F13 55%, #4A0B0F)",
      }}
    >
      <div className="max-w-310 mx-auto px-5.5 py-16 md:py-24 grid grid-cols-1 md:grid-cols-[1.05fr_.95fr] gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/10 text-naranja-claro font-mono text-[11px] tracking-[.2em] px-3 py-1.5 rounded-pill mb-6">
            {t("kicker")}
          </div>

          <h1
            className="font-display font-bold text-crema-papel leading-[1.02] tracking-[-0.01em] mb-5"
            style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
          >
            {t("h1a")}{" "}
            <em className="text-naranja-claro not-italic">{t("h1b")}</em>
          </h1>

          <p className="font-body text-crema/80 text-base md:text-lg leading-relaxed mb-8 max-w-125">
            {t("sub")}
          </p>

          <a
            href="#tm-quiz"
            className="inline-block bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5 mb-10"
          >
            {t("cta")}
          </a>

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

        <div className="flex items-center justify-center relative">
          <div
            className="absolute inset-0 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, #F0C14B 0%, transparent 70%)",
              transform: "scale(0.8)",
            }}
            aria-hidden="true"
          />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-6" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1 h-10 rounded-full bg-white/30"
                style={{ animation: `steam 3.2s ease-in-out ${[0, 0.9, 1.7][i]}s infinite` }}
              />
            ))}
          </div>
          <Image
            src="/bag-maroon.png"
            alt="Bolsa de café Taza Maestra"
            width={340}
            height={420}
            sizes="(max-width: 768px) 240px, 320px"
            className="relative z-10 w-60 max-w-full h-auto md:w-80 drop-shadow-2xl"
            priority
          />
        </div>
      </div>
    </section>
  );
}

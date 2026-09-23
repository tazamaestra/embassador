"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/nav";
import { momentos, productsByMomento } from "@/lib/content";
import { compararPrecios } from "@/lib/suscripcion";
import { formatPrice } from "@/lib/format";
import type { Locale, MomentoId } from "@/lib/types";

// Paso 1 de 3 hasta pagar: una pregunta, una recomendación, y al checkout.
// La recomendación aparece aquí mismo, sin cambiar de página.
export default function MomentQuiz({ locale }: { locale: Locale }) {
  const t = useTranslations("quiz");
  const router = useRouter();
  const es = locale !== "en";

  const [momentoId, setMomentoId] = useState<MomentoId | null>(null);

  const momento = momentos.find((m) => m.id === momentoId);
  const cafe = momentoId ? productsByMomento(momentoId)[0] : undefined;
  const precios = cafe ? compararPrecios(cafe) : null;

  // El quiz recomienda una bolsa del catálogo. La suscripción ya no es por
  // café —son planes por libras— así que la frecuencia se elige allá.
  function comprarSuelto() {
    if (!cafe) return;
    router.push({
      pathname: "/checkout",
      query: { cafe: cafe.id, tipo: "unico" },
    });
  }

  return (
    <section id="tm-quiz" className="py-16 md:py-20 bg-arena scroll-mt-20">
      <div className="max-w-[880px] mx-auto px-[22px]">
        <h2
          className="font-display font-bold text-tinta text-center mb-2"
          style={{ fontSize: "clamp(26px,4vw,42px)" }}
        >
          {t("pregunta")}
        </h2>
        <p className="font-body text-tinta-suave text-center text-base mb-8">{t("sub")}</p>

        {/* Las cuatro opciones */}
        <div role="radiogroup" aria-label={t("pregunta")} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {momentos.map((m) => {
            const activo = momentoId === m.id;
            return (
              <button
                key={m.id}
                role="radio"
                aria-checked={activo}
                onClick={() => setMomentoId(m.id)}
                className={`text-left rounded-card border px-5 py-4 font-body transition-all duration-150 ${
                  activo
                    ? "bg-vino border-vino text-crema-papel shadow-card-hover"
                    : "bg-white border-borde text-tinta hover:border-vino hover:-translate-y-0.5"
                }`}
              >
                <span className="block font-700 text-base leading-snug">
                  {es ? m.opcion_es : m.opcion_en}
                </span>
                <span
                  className={`block font-mono text-[10px] tracking-[.16em] uppercase mt-1 ${
                    activo ? "text-crema/70" : "text-dorado"
                  }`}
                >
                  {es ? m.label_es : m.label_en}
                </span>
              </button>
            );
          })}
        </div>

        {/* La recomendación, en la misma pantalla */}
        {momento && cafe && precios && (
          <div className="mt-8 rounded-card-lg border border-borde bg-white overflow-hidden animate-[fadeUp_.3s_ease-out]">
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr]">
              <div
                className="relative min-h-40 flex items-center justify-center"
                style={{ background: cafe.swatch }}
              >
                {cafe.img ? (
                  <Image
                    src={`/${cafe.img.replace("assets/", "")}`}
                    alt=""
                    width={130}
                    height={170}
                    sizes="180px"
                    className="object-contain drop-shadow-xl p-4"
                  />
                ) : (
                  <span className="font-mono text-[10px] text-white/50 tracking-widest p-4 text-center">
                    [ foto: {cafe.name} ]
                  </span>
                )}
              </div>

              <div className="p-6">
                <p className="font-mono text-[10px] tracking-[.18em] text-dorado uppercase mb-2">
                  {t("kickerResultado")}
                </p>
                <p className="font-body text-tinta text-base leading-relaxed mb-5">
                  {es ? momento.historia_es : momento.historia_en}
                </p>

                <h3 className="font-display font-bold text-tinta text-2xl leading-none mb-1">
                  {cafe.name}
                </h3>
                <p className="font-body text-tinta-suave text-sm mb-1">
                  {cafe.productor} · {cafe.region} · {cafe.altura}
                </p>
                <p className="font-body text-tinta-suave text-sm mb-5">
                  {es ? cafe.notas_es : cafe.notas_en}
                </p>

                {/* Precio con el ahorro al lado */}
                <div className="flex items-end gap-4 mb-1">
                  <div>
                    <p className="font-display font-bold text-verde text-3xl leading-none">
                      {formatPrice(precios.suscriptor, cafe.precioSuscriptorUsd, locale)}
                    </p>
                  </div>
                  <p className="font-body text-tinta-suave text-sm line-through leading-none pb-0.5">
                    {formatPrice(precios.unico, cafe.precioUsd, locale)}
                  </p>
                </div>
                <p className="font-body text-verde text-sm mb-5">
                  {t("ahorro", {
                    ahorro: formatPrice(precios.ahorro, undefined, locale),
                  })}
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/suscripcion"
                    className="flex-1 text-center bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5"
                  >
                    {t("ctaSuscribir")}
                  </Link>
                  <button
                    onClick={comprarSuelto}
                    className="flex-1 border border-borde-2 text-tinta-cafe hover:border-vino hover:text-vino font-body font-700 text-base px-6 py-3 rounded-btn transition-colors duration-150"
                  >
                    {t("ctaUnico")}
                  </button>
                </div>

                <div className="flex flex-wrap gap-4 mt-4">
                  <Link
                    href={`/producto/${cafe.id}`}
                    className="font-body text-sm text-vino hover:underline"
                  >
                    {t("verFicha")}
                  </Link>
                  <button
                    onClick={() => setMomentoId(null)}
                    className="font-body text-sm text-tinta-suave hover:text-vino transition-colors"
                  >
                    {t("cambiar")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

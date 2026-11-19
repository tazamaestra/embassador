"use client";

import { useState } from "react";
import Image from "next/image";
import BolsaMockup from "@/components/shared/BolsaMockup";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/nav";
import { useCartStore } from "@/lib/cart-store";
import { momentos } from "@/lib/content";
import { useCafesPorMomento } from "@/components/shared/CafesProvider";
import { srcImagen } from "@/lib/cafes";
import { formatCOP, formatUSD } from "@/lib/format";
import type { Locale, MomentoId } from "@/lib/types";

// Paso 1 de 3 hasta pagar: una pregunta, una recomendación, y al checkout.
// La recomendación aparece aquí mismo, sin cambiar de página.
export default function MomentQuiz({ locale }: { locale: Locale }) {
  const t = useTranslations("quiz");
  const { addItem } = useCartStore();
  const es = locale !== "en";

  const [momentoId, setMomentoId] = useState<MomentoId | null>(null);

  const momento = momentos.find((m) => m.id === momentoId);
  const cafe = useCafesPorMomento(momentoId)[0];

  // El quiz recomienda una bolsa del catálogo: se agrega al carrito, o se
  // pide la muestra gratis para probarlo antes.
  function agregar() {
    if (!cafe) return;
    addItem({
      id: cafe.id,
      cafeId: cafe.id,
      presentacion: "bolsa",
      name: cafe.name,
      price: cafe.precioCop,
      priceUsd: cafe.precioUsd,
      swatch: cafe.swatch,
      img: cafe.img,
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

        {/* Las opciones */}
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
        {momento && cafe && (
          <div className="mt-8 rounded-card-lg border border-borde bg-white overflow-hidden animate-[fadeUp_.3s_ease-out]">
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr]">
              <div
                className="relative min-h-40 flex items-center justify-center"
                style={{ background: cafe.swatch }}
              >
                {cafe.img ? (
                  <Image
                    src={srcImagen(cafe.img)}
                    alt=""
                    width={130}
                    height={170}
                    sizes="180px"
                    className="object-contain drop-shadow-xl p-4"
                  />
                ) : (
                  <BolsaMockup
                    id={`quiz-${cafe.id}`}
                    nombre={cafe.name}
                    region={cafe.region}
                    proceso={es ? cafe.proceso_es : cafe.proceso_en}
                    {...cafe.bolsa}
                    decorativa
                    className="w-[130px] h-auto drop-shadow-xl my-4"
                  />
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

                {/* Precio en pesos, su equivalente en dólares y el envío aparte */}
                <p className="font-display font-bold text-vino text-3xl leading-none">
                  {formatCOP(cafe.precioCop)}
                  <span className="font-mono font-400 text-xs text-tinta-suave ml-1.5">COP</span>
                </p>
                <p className="font-body text-tinta-suave text-sm mt-1.5 mb-5">
                  {cafe.precioUsd !== undefined && <>≈ {formatUSD(cafe.precioUsd, locale)} · </>}
                  {cafe.pesoG.toLocaleString("es-CO")} g · {t("envio")}
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={agregar}
                    className="flex-1 bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5"
                  >
                    {t("ctaUnico")}
                  </button>
                  <Link
                    href={{ pathname: "/tienda", hash: "muestra" }}
                    className="flex-1 text-center border border-borde-2 text-tinta-cafe hover:border-vino hover:text-vino font-body font-700 text-base px-6 py-3 rounded-btn transition-colors duration-150"
                  >
                    {t("ctaSuscribir")}
                  </Link>
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

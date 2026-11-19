"use client";

import { useState } from "react";
import Image from "next/image";
import BolsaMockup from "@/components/shared/BolsaMockup";
import BolsaNegocio from "@/components/shared/BolsaNegocio";
import { useCafe } from "@/components/shared/CafesProvider";
import { srcImagen } from "@/lib/cafes";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/lib/nav";
import {
  findMomento, findPostByCafe, heroSlides,
} from "@/lib/content";
import { formatCOP, formatUSD } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import {
  formatPeso, idLineaCarrito, presentacionDe, presentacionesDe, type PresentacionId,
} from "@/lib/presentaciones";
import type { Locale } from "@/lib/types";

/** La foto de finca la resuelve el servidor; aquí llega lista para pintar. */
export interface FotoFincaVista {
  url: string;
  ancho: number;
  alto: number;
  alt: string;
}

export default function ProductoScreen({
  slug,
  foto,
}: {
  slug: string;
  foto?: FotoFincaVista | null;
}) {
  const t = useTranslations("product");
  const locale = useLocale() as Locale;
  const { addItem } = useCartStore();
  const [added, setAdded] = useState(false);
  const [presId, setPresId] = useState<PresentacionId>("bolsa");

  const product = useCafe(slug);

  if (!product) {
    return (
      <div className="py-24 text-center">
        <p className="font-body text-tinta-suave">{t("noEncontrado")}</p>
        <Link href="/tienda" className="mt-4 inline-block text-vino font-body font-700 underline">
          {t("back")}
        </Link>
      </div>
    );
  }

  const notas = locale === "en" ? product.notas_en : product.notas_es;
  const proposito = locale === "en" ? product.historia_en : product.historia_es;
  // Sin propósito escrito, junto a la foto de la finca va el relato del hero.
  const slide = heroSlides.find((s) => s.cafeId === product.id);
  const relatoFinca = slide && (locale === "en" ? slide.relato_en : slide.relato_es);
  const tueste = locale === "en" ? product.tueste_en : product.tueste_es;
  const proceso = locale === "en" ? product.proceso_en : product.proceso_es;
  const finca = locale === "en" ? product.finca_en ?? product.finca : product.finca;
  const momento = findMomento(product.momento);
  const historia = findPostByCafe(product.id);
  const presentaciones = presentacionesDe(product);
  const pres = presentacionDe(product, presId) ?? presentaciones[0];

  const ficha: { k: string; v: string }[] = [
    { k: t("specProductor"), v: product.productor },
    { k: t("specFinca"), v: finca },
    { k: t("specRegion"), v: product.region },
    { k: t("specAltura"), v: product.altura },
    { k: t("specProceso"), v: proceso },
    { k: t("specVariedad"), v: product.variedad },
    { k: t("specTueste"), v: tueste },
    { k: t("specPeso"), v: formatPeso(pres.pesoG) },
  ];

  function handleAdd() {
    if (!product) return;
    addItem({
      id: idLineaCarrito(product.id, pres.id),
      cafeId: product.id,
      presentacion: pres.id,
      name: product.name,
      price: pres.precioCop,
      priceUsd: pres.precioUsd,
      swatch: pres.id === "negocio" ? "#161412" : product.swatch,
      img: pres.id === "negocio" ? null : product.img,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  }

  return (
    <div className="bg-fondo min-h-screen">
      <div className="max-w-[1240px] mx-auto px-[22px] py-8">
        <Link
          href="/tienda"
          className="inline-flex items-center gap-1 font-body text-sm text-tinta-suave hover:text-vino transition-colors mb-8"
        >
          {t("back")}
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-card-lg overflow-hidden border border-borde">
          {/* Imagen */}
          <div
            className="min-h-[360px] md:min-h-[520px] flex items-center justify-center p-10 relative"
            style={{ background: product.swatch }}
          >
            {pres.id === "negocio" ? (
              <BolsaNegocio
                product={product}
                id={`ficha-negocio-${product.id}`}
                proceso={proceso}
                className="w-64 md:w-80 max-h-[380px] h-auto drop-shadow-2xl"
              />
            ) : product.img ? (
              <Image
                src={srcImagen(product.img)}
                alt={product.name}
                width={320}
                height={400}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain drop-shadow-2xl max-h-[380px]"
                priority
              />
            ) : (
              <BolsaMockup
                id={`ficha-${product.id}`}
                nombre={product.name}
                region={product.region}
                proceso={proceso}
                {...product.bolsa}
                className="w-64 md:w-80 max-h-[380px] h-auto drop-shadow-2xl"
              />
            )}
          </div>

          {/* Ficha */}
          <div className="bg-white p-8 md:p-10 flex flex-col">
            {momento && (
              <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">
                {t("momento")} · {locale === "en" ? momento.label_en : momento.label_es}
              </p>
            )}
            <h1 className="font-display font-bold text-tinta text-3xl md:text-4xl mb-1">
              {product.name}
            </h1>
            <p className="font-body text-tinta-suave text-sm mb-6">
              {product.productor} · {product.region}
            </p>

            <p className="font-mono text-[10px] tracking-[.18em] text-tinta-suave uppercase mb-1">
              {t("specNotas")}
            </p>
            <p className="font-body text-tinta text-base leading-relaxed mb-6">{notas}</p>

            {/* Datos concretos antes que adjetivos */}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-borde pt-6 mb-6">
              {ficha.map(({ k, v }) => (
                <div key={k}>
                  <dt className="font-mono text-[9px] tracking-[.18em] text-tinta-suave uppercase mb-0.5">
                    {k}
                  </dt>
                  <dd className="font-body font-600 text-tinta text-sm">{v}</dd>
                </div>
              ))}
            </dl>

            {/* Presentación: la bolsa o el cuarterón para negocios */}
            {presentaciones.length > 1 && (
              <div className="border-t border-borde pt-6">
                <p className="font-mono text-[9px] tracking-[.18em] text-tinta-suave uppercase mb-2">
                  {t("presentacion")}
                </p>
                <div role="radiogroup" aria-label={t("presentacion")} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {presentaciones.map((p) => {
                    const activa = p.id === pres.id;
                    return (
                      <button
                        key={p.id}
                        role="radio"
                        aria-checked={activa}
                        onClick={() => { setPresId(p.id); setAdded(false); }}
                        className={`text-left rounded-card border px-4 py-3 font-body transition-colors duration-150 ${
                          activa
                            ? "border-vino bg-vino/5 text-tinta"
                            : "border-borde text-tinta-suave hover:border-vino"
                        }`}
                      >
                        <span className="block font-700 text-sm text-tinta">
                          {p.id === "negocio" ? t("presNegocio") : t("presBolsa")}
                        </span>
                        <span className="block font-mono text-[11px] mt-0.5">
                          {formatPeso(p.pesoG)} · {formatCOP(p.precioCop)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Precio en pesos, su equivalente en dólares y el envío aparte */}
            <div className={`${presentaciones.length > 1 ? "pt-5" : "border-t border-borde pt-6"} mb-6`}>
              <p className="font-mono text-[9px] tracking-[.18em] text-tinta-suave uppercase mb-1">
                {t("precio", { peso: formatPeso(pres.pesoG).toUpperCase() })}
              </p>
              <p className="font-display font-bold text-tinta text-3xl leading-none">
                {formatCOP(pres.precioCop)}
                <span className="font-mono font-400 text-xs text-tinta-suave ml-1.5">COP</span>
              </p>
              {pres.precioUsd !== undefined && (
                <p className="font-mono text-sm text-tinta-suave mt-1.5">
                  ≈ {formatUSD(pres.precioUsd, locale)}
                </p>
              )}
              <p className="font-body text-sm text-tinta-suave mt-1">{t("envio")}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAdd}
                className="flex-1 bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5"
              >
                {t("add")}
              </button>
              <Link
                href={{ pathname: "/tienda", hash: "muestra" }}
                className="flex-1 text-center border border-borde-2 text-tinta-cafe hover:border-vino hover:text-vino font-body font-700 text-base px-6 py-3 rounded-btn transition-colors duration-150"
              >
                {t("subscribe")}
              </Link>
            </div>

            <p className="font-body text-sm text-verde mt-3 min-h-5" aria-live="polite">
              {added ? t("added") : ""}
            </p>

            {historia && (
              <Link
                href={`/blog/${historia.slug}`}
                className="mt-6 pt-6 border-t border-borde font-body text-sm text-vino hover:underline"
              >
                {t("historia")}: {locale === "en" ? historia.t_en : historia.t_es} →
              </Link>
            )}
          </div>
        </div>

        {/* Por qué existe este café, y la finca de donde sale. */}
        {(proposito || foto) && (
          <section className="mt-6 rounded-card-lg border border-borde bg-white overflow-hidden grid grid-cols-1 md:grid-cols-2">
            {foto && (
              <div className="relative min-h-[240px] md:min-h-[320px]">
                <Image
                  src={foto.url}
                  alt={foto.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            )}

            {!proposito && foto && (
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">
                  {t("fincaKicker")}
                </p>
                <h2 className="font-display font-bold text-tinta text-2xl md:text-3xl leading-snug mb-4">
                  {finca}
                </h2>
                {relatoFinca && (
                  <p className="font-body text-tinta-suave text-base leading-relaxed">{relatoFinca}</p>
                )}
                <p className="font-mono text-[10px] tracking-[.18em] text-tinta-suave uppercase mt-6">
                  {product.productor} · {product.region} · {product.altura}
                </p>
              </div>
            )}

            {proposito && (
              <div className={`p-8 md:p-10 flex flex-col justify-center ${foto ? "" : "md:col-span-2"}`}>
                <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">
                  {t("propositoKicker")}
                </p>
                <h2 className="font-display font-bold text-tinta text-2xl md:text-3xl leading-snug mb-4">
                  {t("propositoH2")}
                </h2>
                <p className="font-body text-tinta-suave text-base leading-relaxed">
                  {proposito}
                </p>
                <p className="font-mono text-[10px] tracking-[.18em] text-tinta-suave uppercase mt-6">
                  {t("fincaKicker")} · {finca} · {product.altura}
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

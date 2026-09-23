"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/lib/nav";
import {
  findMomento, findPostByCafe, findProduct,
} from "@/lib/content";
import { formatPrice } from "@/lib/format";
import { mejorAhorro } from "@/lib/suscripcion";
import { useCartStore } from "@/lib/cart-store";
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
  const router = useRouter();
  const { addItem } = useCartStore();
  const [added, setAdded] = useState(false);

  const product = findProduct(slug);

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
  const tueste = locale === "en" ? product.tueste_en : product.tueste_es;
  const proceso = locale === "en" ? product.proceso_en : product.proceso_es;
  const momento = findMomento(product.momento);
  const historia = findPostByCafe(product.id);
  const suscrito = mejorAhorro(product);

  const ficha: { k: string; v: string }[] = [
    { k: t("specProductor"), v: product.productor },
    { k: t("specFinca"), v: product.finca },
    { k: t("specRegion"), v: product.region },
    { k: t("specAltura"), v: product.altura },
    { k: t("specProceso"), v: proceso },
    { k: t("specVariedad"), v: product.variedad },
    { k: t("specTueste"), v: tueste },
    { k: t("specPeso"), v: `${product.pesoG} g` },
  ];

  function handleAdd() {
    if (!product) return;
    addItem({
      id: product.id,
      name: product.name,
      price: product.precioCop,
      priceUsd: product.precioUsd,
      swatch: product.swatch,
      img: product.img,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  }

  // La suscripción ya no es por café: son planes por libras, con el café de
  // la finca más el origen del mes. Desde la ficha se manda a elegir plan.
  function handleSubscribe() {
    router.push("/suscripcion");
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
            {product.img ? (
              <Image
                src={`/${product.img.replace("assets/", "")}`}
                alt={product.name}
                width={320}
                height={400}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain drop-shadow-2xl max-h-[380px]"
                priority
              />
            ) : (
              <div
                className="w-48 h-64 rounded-card border border-white/20 flex items-center justify-center"
                style={{ background: "rgba(255,255,255,.08)" }}
              >
                <span className="font-mono text-[10px] text-white/50 tracking-[.1em] text-center p-4">
                  [ foto: {product.name} ]
                </span>
              </div>
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

            {/* Precio: único y suscriptor, lado a lado */}
            <div className="border-t border-borde pt-6 grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="font-mono text-[9px] tracking-[.18em] text-tinta-suave uppercase mb-1">
                  {t("unico")}
                </p>
                <p className="font-display font-bold text-tinta text-2xl leading-none">
                  {formatPrice(product.precioCop, product.precioUsd, locale)}
                </p>
              </div>
              <div className="rounded-card bg-verde-claro px-4 py-3">
                <p className="font-mono text-[9px] tracking-[.18em] text-verde uppercase mb-1">
                  {t("suscrito")}
                </p>
                <p className="font-display font-bold text-verde text-2xl leading-none">
                  {formatPrice(suscrito.suscriptor, product.precioSuscriptorUsd, locale)}
                </p>
                <p className="font-mono text-[9px] text-verde/80 mt-1">
                  −{suscrito.ahorroPct}%
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSubscribe}
                className="flex-1 bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5"
              >
                {t("subscribe")}
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 border border-borde-2 text-tinta-cafe hover:border-vino hover:text-vino font-body font-700 text-base px-6 py-3 rounded-btn transition-colors duration-150"
              >
                {t("add")}
              </button>
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
                  {t("fincaKicker")} · {product.finca} · {product.altura}
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

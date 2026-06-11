"use client";

import { use, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link } from "@/lib/nav";
import { products } from "@/lib/content";
import { formatCOP } from "@/lib/format";
import { useMode } from "@/contexts/ModeContext";
import type { Locale } from "@/lib/types";

export default function ProductoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const t = useTranslations("product");
  const { mode } = useMode();
  const locale = useLocale() as Locale;
  const [added, setAdded] = useState(false);

  const product = products.find((p) => p.id === slug);
  if (!product) {
    return (
      <div className="py-24 text-center">
        <p className="font-body text-tinta-suave">Producto no encontrado.</p>
        <Link href="/tienda" className="mt-4 inline-block text-vino font-body font-700 underline">
          {t("back")}
        </Link>
      </div>
    );
  }

  const isAmb = mode === "embajador";
  const price = isAmb ? product.wholesale : product.retail;
  const notes = locale === "en" ? product.notes_en : product.notes_es;
  const roast = locale === "en" ? product.roast_en : product.roast_es;
  const process = locale === "en" ? product.process_en : product.process_es;

  function handleAdd() {
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
          {/* Left: product image panel */}
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
                className="object-contain drop-shadow-2xl max-h-[380px]"
                priority
              />
            ) : (
              <div className="text-center">
                <div
                  className="w-48 h-64 rounded-card border border-white/20 flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(255,255,255,.08)" }}
                  aria-label={`[ foto: ${product.name} ]`}
                >
                  <span className="font-mono text-[10px] text-white/50 tracking-[.1em] text-center p-4">
                    [ foto: {product.name} ]
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: product info */}
          <div className="bg-white p-8 md:p-10 flex flex-col">
            <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">{product.origin}</p>
            <h1
              className="font-display font-bold text-tinta mb-3"
              style={{ fontSize: "clamp(28px,4vw,42px)" }}
            >
              {product.name}
            </h1>

            {/* Roast chip */}
            <span className="inline-flex self-start font-mono text-[10px] tracking-[.15em] bg-arena text-tinta-cafe px-3 py-1 rounded-pill uppercase mb-4">
              {roast}
            </span>

            {/* Notes */}
            <p className="font-body text-tinta-suave text-base leading-relaxed mb-5">{notes}</p>

            {/* Cupping notes chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {(locale === "en" ? product.notes_en : product.notes_es)
                .split(/[,.]/g)
                .map((n) => n.trim())
                .filter(Boolean)
                .slice(0, 3)
                .map((note, i) => (
                  <span
                    key={i}
                    className="font-mono text-[10px] tracking-[.12em] bg-crema text-tinta-cafe px-3 py-1 rounded-pill uppercase"
                  >
                    {note}
                  </span>
                ))}
            </div>

            {/* Specs */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: t("specAltitude"), value: product.altitude },
                { label: t("specProcess"), value: process },
                { label: t("specPackaging"), value: t("packagingValue") },
              ].map(({ label, value }) => (
                <div key={label} className="bg-arena rounded-card p-3 text-center">
                  <div className="font-mono text-[9px] tracking-[.18em] text-tinta-suave uppercase mb-1">{label}</div>
                  <div className="font-body font-600 text-tinta text-sm">{value}</div>
                </div>
              ))}
            </div>

            {/* Price block */}
            <div className="bg-vino rounded-card p-6 mt-auto">
              <p className="font-mono text-[10px] tracking-[.2em] text-dorado-claro/80 uppercase mb-1">
                {isAmb ? t("addEmbajador").replace("Agregar al", "Precio").replace("Add to", "Price") : "PRECIO"}
              </p>
              <p className="font-display font-bold text-dorado-claro text-4xl leading-none mb-1">
                {formatCOP(price)}
                <span className="font-mono font-400 text-sm text-crema/50 ml-1">/libra</span>
              </p>
              {isAmb && (
                <p className="font-body text-xs text-crema/50 mb-4">
                  Detal: <s>{formatCOP(product.retail)}</s>
                </p>
              )}
              {!isAmb && <div className="mb-4" />}

              <button
                onClick={handleAdd}
                className="w-full bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base py-3.5 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5 mb-2"
              >
                {isAmb ? t("addEmbajador") : t("addCliente")}
              </button>

              {!isAmb && (
                <button className="w-full border border-crema/30 text-crema hover:bg-white/10 font-body font-600 text-sm py-2.5 rounded-btn transition-colors">
                  {t("wholesaleBtn")}
                </button>
              )}

              <p
                aria-live="polite"
                className={`font-body text-sm text-crema/70 text-center mt-3 transition-opacity duration-300 ${added ? "opacity-100" : "opacity-0"}`}
              >
                {isAmb ? t("addedEmbajador") : t("addedCliente")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

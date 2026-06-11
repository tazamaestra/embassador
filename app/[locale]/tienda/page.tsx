"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMode } from "@/contexts/ModeContext";
import { products, productFilters } from "@/lib/content";
import ProductCard from "@/components/shop/ProductCard";
import { useLocale } from "next-intl";
import type { Locale } from "@/lib/types";

export default function TiendaPage() {
  const t = useTranslations("shop");
  const { mode } = useMode();
  const locale = useLocale() as Locale;
  const [filter, setFilter] = useState("todos");

  const isAmb = mode === "embajador";
  const filtered = filter === "todos" ? products : products.filter((p) => p.cat === filter);

  return (
    <>
      {/* Section header */}
      <section
        className="py-16"
        style={{ background: "linear-gradient(150deg,#7E181C,#4A0B0F)" }}
      >
        <div className="max-w-[1240px] mx-auto px-[22px]">
          <p className="font-mono text-[11px] tracking-[.22em] text-dorado-claro uppercase mb-3">
            {isAmb ? t("kickerEmbajador") : t("kickerCliente")}
          </p>
          <h1
            className="font-display font-bold text-crema-papel mb-3"
            style={{ fontSize: "clamp(34px,5vw,58px)" }}
          >
            {t("h1")}
          </h1>
          <p className="font-body text-crema/75 text-base max-w-[560px]">
            {isAmb ? t("subEmbajador") : t("subCliente")}
          </p>
        </div>
      </section>

      {/* Filters + grid */}
      <section className="py-12 bg-fondo">
        <div className="max-w-[1240px] mx-auto px-[22px]">
          {/* Filters */}
          <div
            role="group"
            aria-label="Filtrar por categoría"
            className="flex flex-wrap gap-2 mb-8"
          >
            {productFilters.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  aria-pressed={active}
                  onClick={() => setFilter(f.id)}
                  className={`font-body font-600 text-sm px-4 py-2 rounded-pill border transition-colors duration-150 ${
                    active
                      ? "bg-vino text-crema border-vino"
                      : "bg-white text-tinta-cafe border-borde hover:border-vino hover:text-vino"
                  }`}
                >
                  {locale === "en" ? f.label_en : f.label_es}
                </button>
              );
            })}
          </div>

          {/* Product grid */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            aria-live="polite"
            aria-label="Catálogo de productos"
          >
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

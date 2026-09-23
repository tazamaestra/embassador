"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { products, productFilters } from "@/lib/content";
import ProductCard from "@/components/shop/ProductCard";
import type { Locale } from "@/lib/types";

// El footer enlaza a /tienda?filter=x. Leer ese parámetro saca del
// prerenderizado a todo lo que lo rodee, así que se aísla aquí: este
// componente no pinta nada y vive dentro de su propio Suspense. El catálogo
// queda fuera y sí se genera en el build, con las fichas ya en el HTML.
function SincronizarFiltroUrl({ onFiltro }: { onFiltro: (f: string) => void }) {
  const searchParams = useSearchParams();
  const filtro = searchParams.get("filter") ?? "todos";

  useEffect(() => {
    onFiltro(filtro);
  }, [filtro, onFiltro]);

  return null;
}

export default function TiendaScreen() {
  const t = useTranslations("shop");
  const locale = useLocale() as Locale;
  const [filter, setFilter] = useState("todos");

  const filtered =
    filter === "todos" ? products : products.filter((p) => p.momento === filter);

  return (
    <>
      <Suspense>
        <SincronizarFiltroUrl onFiltro={setFilter} />
      </Suspense>

      {/* Encabezado */}
      <section
        className="py-16"
        style={{ background: "linear-gradient(150deg,#7E181C,#4A0B0F)" }}
      >
        <div className="max-w-[1240px] mx-auto px-[22px]">
          <p className="font-mono text-[11px] tracking-[.22em] text-dorado-claro uppercase mb-3">
            {t("kicker")}
          </p>
          <h1
            className="font-display font-bold text-crema-papel mb-3"
            style={{ fontSize: "clamp(34px,5vw,58px)" }}
          >
            {t("h1")}
          </h1>
          <p className="font-body text-crema/75 text-base max-w-[560px]">{t("sub")}</p>
        </div>
      </section>

      {/* Filtros por momento + grilla */}
      <section className="py-12 bg-fondo">
        <div className="max-w-[1240px] mx-auto px-[22px]">
          <div role="group" aria-label={t("filtroAria")} className="flex flex-wrap gap-2 mb-8">
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

          {filtered.length === 0 ? (
            <p className="font-body text-tinta-suave text-sm py-12" aria-live="polite">
              {t("vacio")}
            </p>
          ) : (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              aria-live="polite"
              aria-label="Catálogo de cafés"
            >
              {filtered.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  locale={locale}
                  priority={i < 3}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

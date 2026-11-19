"use client";

import { useState } from "react";
import Image from "next/image";
import BolsaMockup from "@/components/shared/BolsaMockup";
import BolsaNegocio from "@/components/shared/BolsaNegocio";
import { srcImagen } from "@/lib/cafes";
import { Link } from "@/lib/nav";
import { useTranslations } from "next-intl";
import { formatCOP, formatUSD } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import {
  formatPeso, idLineaCarrito, presentacionDe, type Presentacion, type PresentacionId,
} from "@/lib/presentaciones";
import type { Product, Locale } from "@/lib/types";

export default function ProductCard({
  product,
  locale,
  priority = false,
}: {
  product: Product;
  locale: Locale;
  priority?: boolean;
}) {
  const t = useTranslations("shop");
  const { addItem } = useCartStore();
  const [added, setAdded] = useState<PresentacionId | null>(null);

  const tueste = locale === "en" ? product.tueste_en : product.tueste_es;
  const notas = locale === "en" ? product.notas_en : product.notas_es;

  const proceso = locale === "en" ? product.proceso_en : product.proceso_es;
  const negocio = presentacionDe(product, "negocio");

  function handleAdd(p: Presentacion) {
    addItem({
      id: idLineaCarrito(product.id, p.id),
      cafeId: product.id,
      presentacion: p.id,
      name: product.name,
      price: p.precioCop,
      priceUsd: p.precioUsd,
      swatch: p.id === "negocio" ? "#161412" : product.swatch,
      img: p.id === "negocio" ? null : product.img,
    });
    setAdded(p.id);
    setTimeout(() => setAdded(null), 1500);
  }

  const botonAgregar = (p: Presentacion, nombre: string) => (
    <button
      onClick={() => handleAdd(p)}
      aria-label={`${t("cta")} — ${nombre}`}
      className={`shrink-0 font-body font-700 text-sm px-4 py-2 rounded-btn transition-all duration-200 ${
        added === p.id
          ? "bg-vino text-crema-papel scale-95"
          : "bg-naranja hover:bg-naranja-700 text-white shadow-cta hover:-translate-y-0.5"
      }`}
    >
      {added === p.id ? `✓ ${t("added")}` : t("cta")}
    </button>
  );

  return (
    <article className="rounded-card border border-borde bg-white flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover group">
      {/* Imagen */}
      <Link href={`/producto/${product.id}`} className="block relative aspect-4/3 overflow-hidden">
        <div className="absolute inset-0" style={{ background: product.swatch }} aria-hidden="true" />
        <span
          className="absolute top-3 left-3 font-mono text-[9px] tracking-[.15em] text-white px-2 py-1 rounded-btn uppercase z-10"
          style={{ background: "rgba(0,0,0,.28)" }}
        >
          {t("tostion", { tueste: tueste.toLowerCase() })}
        </span>
        {product.img ? (
          <Image
            src={srcImagen(product.img)}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            className="object-contain object-center p-6 drop-shadow-md transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <BolsaMockup
              id={`card-${product.id}`}
              nombre={product.name}
              region={product.region}
              proceso={proceso}
              {...product.bolsa}
              decorativa
              className="h-full w-auto drop-shadow-md transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}
      </Link>

      {/* Cuerpo */}
      <div className="p-5 flex flex-col flex-1">
        <p className="font-mono text-[10px] tracking-[.18em] text-dorado uppercase mb-1">
          {product.productor} · {product.region}
        </p>
        <h3 className="font-display font-bold text-tinta text-xl mb-2">{product.name}</h3>
        <p className="font-body text-tinta-suave text-sm leading-relaxed flex-1">{notas}</p>

        {/* Precio en pesos, su equivalente en dólares y el envío aparte */}
        <div className="mt-4 pt-4 border-t border-borde flex items-end justify-between gap-2">
          <div>
            <p className="font-mono text-[9px] tracking-[.18em] text-tinta-suave uppercase mb-0.5">
              {t("priceLabel")} · {formatPeso(product.pesoG)}
            </p>
            <p className="font-display font-bold text-vino text-2xl leading-none">
              {formatCOP(product.precioCop)}
              <span className="font-mono font-400 text-[11px] text-tinta-suave ml-1">COP</span>
            </p>
            {product.precioUsd !== undefined && (
              <p className="font-mono text-[11px] text-tinta-suave mt-1">
                ≈ {formatUSD(product.precioUsd, locale)}
              </p>
            )}
            <p className="font-mono text-[9px] tracking-[.12em] text-tinta-suave mt-1 uppercase">
              {t("envio")}
            </p>
          </div>

          {botonAgregar(presentacionDe(product, "bolsa")!, `${product.name} ${formatPeso(product.pesoG)}`)}
        </div>

        {/* El cuarterón, para cafeterías o negocios */}
        {negocio && (
          <div className="mt-4 rounded-card bg-arena/60 border border-borde p-3 flex items-center gap-3">
            <BolsaNegocio
              product={product}
              id={`card-negocio-${product.id}`}
              proceso={proceso}
              decorativa
              className="w-11 h-auto shrink-0 drop-shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[9px] tracking-[.14em] text-tinta-suave uppercase leading-snug">
                {t("negocio")} · {formatPeso(negocio.pesoG)}
              </p>
              <p className="font-display font-bold text-tinta text-lg leading-tight mt-0.5">
                {formatCOP(negocio.precioCop)}
                <span className="font-mono font-400 text-[10px] text-tinta-suave ml-1">COP</span>
              </p>
              {negocio.precioUsd !== undefined && (
                <p className="font-mono text-[10px] text-tinta-suave">
                  ≈ {formatUSD(negocio.precioUsd, locale)} · {t("envio")}
                </p>
              )}
            </div>
            {botonAgregar(negocio, `${product.name} — ${t("negocio")}`)}
          </div>
        )}
      </div>
    </article>
  );
}

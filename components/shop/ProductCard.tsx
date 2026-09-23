"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/lib/nav";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import { mejorAhorro } from "@/lib/suscripcion";
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
  const [added, setAdded] = useState(false);

  const tueste = locale === "en" ? product.tueste_en : product.tueste_es;
  const notas = locale === "en" ? product.notas_en : product.notas_es;
  const suscrito = mejorAhorro(product);

  function handleAdd() {
    addItem({
      id: product.id,
      name: product.name,
      price: product.precioCop,
      priceUsd: product.precioUsd,
      swatch: product.swatch,
      img: product.img,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <article className="rounded-card border border-borde bg-white flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover group">
      {/* Imagen */}
      <Link href={`/producto/${product.id}`} className="block relative aspect-4/3 overflow-hidden">
        <div className="absolute inset-0" style={{ background: product.swatch }} aria-hidden="true" />
        <span
          className="absolute top-3 left-3 font-mono text-[9px] tracking-[.15em] text-white px-2 py-1 rounded-btn uppercase z-10"
          style={{ background: "rgba(0,0,0,.28)" }}
        >
          {tueste}
        </span>
        {product.img ? (
          <Image
            src={`/${product.img.replace("assets/", "")}`}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            className="object-contain object-center p-6 drop-shadow-md transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-end justify-center pb-3">
            <span className="font-mono text-[10px] text-white/60 tracking-widest">
              [ foto: {product.name} ]
            </span>
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

        {/* Precio único, con el de suscriptor al lado */}
        <div className="mt-4 pt-4 border-t border-borde flex items-end justify-between gap-2">
          <div>
            <p className="font-mono text-[9px] tracking-[.18em] text-tinta-suave uppercase mb-0.5">
              {t("priceLabel")}
            </p>
            <p className="font-display font-bold text-vino text-2xl leading-none">
              {formatPrice(product.precioCop, product.precioUsd, locale)}
              <span className="font-mono font-400 text-[11px] text-tinta-suave ml-1">{t("perBag")}</span>
            </p>
            <p className="font-mono text-[9px] tracking-[.12em] text-verde mt-1 uppercase">
              {t("ahorro", {
                precio: formatPrice(suscrito.suscriptor, product.precioSuscriptorUsd, locale),
              })}
            </p>
          </div>

          <button
            onClick={handleAdd}
            aria-label={`${t("cta")} — ${product.name}`}
            className={`shrink-0 font-body font-700 text-sm px-4 py-2 rounded-btn transition-all duration-200 ${
              added
                ? "bg-vino text-crema-papel scale-95"
                : "bg-naranja hover:bg-naranja-700 text-white shadow-cta hover:-translate-y-0.5"
            }`}
          >
            {added ? `✓ ${t("added")}` : t("cta")}
          </button>
        </div>
      </div>
    </article>
  );
}

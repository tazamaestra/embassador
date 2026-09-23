"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/lib/nav";
import { blogPosts, blogFilters, blogFeatured } from "@/lib/content";
import BlogCard from "@/components/blog/BlogCard";
import type { Locale } from "@/lib/types";

export default function BlogScreen() {
  const t = useTranslations("blog");
  const locale = useLocale() as Locale;
  const [filter, setFilter] = useState("todos");

  const filtered =
    filter === "todos" ? blogPosts : blogPosts.filter((p) => p.cat === filter);
  const feat = blogFeatured;
  const featTitle = locale === "en" ? feat.t_en : feat.t_es;

  return (
    <>
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
          <p className="font-body text-crema/70 text-base max-w-[520px]">{t("sub")}</p>
        </div>
      </section>

      <div className="bg-fondo py-12">
        <div className="max-w-[1240px] mx-auto px-[22px]">
          {/* Historia destacada */}
          <Link
            href={`/blog/${feat.slug}`}
            className="rounded-card-lg overflow-hidden border border-borde mb-12 grid grid-cols-1 md:grid-cols-2 w-full group"
          >
            <div
              className="min-h-[220px] md:min-h-[280px] relative overflow-hidden"
              style={{ background: feat.sw }}
            >
              {feat.foto && (
                <Image
                  src={feat.foto}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              <div
                className="absolute inset-0 bg-linear-to-t from-black/55 via-black/5 to-transparent"
                aria-hidden="true"
              />
            </div>

            <div className="bg-white p-8 flex flex-col justify-center">
              <span className="font-mono text-[10px] tracking-[.18em] text-dorado uppercase mb-3">
                {t("kicker")}
              </span>
              <h2 className="font-display font-bold text-tinta text-2xl md:text-3xl leading-snug mb-3">
                {featTitle}
              </h2>
              <p className="font-body text-tinta-suave text-sm leading-relaxed mb-5">
                {locale === "en" ? feat.d_en : feat.d_es}
              </p>
              <span className="self-start bg-vino group-hover:bg-vino-800 text-crema font-body font-700 text-sm px-5 py-2.5 rounded-btn transition-all duration-150 group-hover:-translate-y-0.5">
                {t("readMore")}
              </span>
            </div>
          </Link>

          {/* Filtros */}
          <div role="group" aria-label={t("filtroAria")} className="flex flex-wrap gap-2 mb-8">
            {blogFilters.map((f) => {
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

          {/* Grilla */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-live="polite">
            {filtered.map((post) => (
              <BlogCard key={post.slug} post={post} locale={locale} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

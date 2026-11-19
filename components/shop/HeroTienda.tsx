"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Link } from "@/lib/nav";
import { heroSlides } from "@/lib/content";
import { srcImagen } from "@/lib/cafes";
import { formatPeso } from "@/lib/presentaciones";
import { GRAMOS_MUESTRA } from "@/lib/muestras";
import BolsaMockup from "@/components/shared/BolsaMockup";
import type { Locale, Product } from "@/lib/types";

// Encabezado de la tienda. Una pregunta ("¿qué buscas en la taza?") pasa al
// frente el café que le va, con sus sabores alrededor; mientras nadie toca,
// los cafés se turnan solos. Al lado, la muestra gratis de 100 g.
// Movimiento solo con transform/opacity; las clases tm-hero-* están en
// globals.css y respetan "reducir movimiento".

const TURNO_MS = 5000;

const POS_SABORES: CSSProperties[] = [
  { left: "2%", top: "14%" },
  { right: "0%", top: "26%" },
  { right: "2%", bottom: "28%" },
  { left: "30%", bottom: "2%" },
];

type Var = CSSProperties & { "--d"?: string };

/** La bolsita de muestra: kraft, con etiqueta. */
function SobreMuestra({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="tm-kraft" x1="0" x2="1">
          <stop offset="0" stopColor="#B88A57" />
          <stop offset=".5" stopColor="#D2A774" />
          <stop offset="1" stopColor="#A87A48" />
        </linearGradient>
      </defs>
      <path d="M14 18 L106 18 L110 138 Q110 146 102 146 L18 146 Q10 146 10 138 Z" fill="url(#tm-kraft)" />
      <rect x="14" y="10" width="92" height="14" rx="2" fill="#9C6F3E" />
      <path d="M14 24 L106 24" stroke="#000" strokeOpacity=".15" strokeDasharray="3 3" />
      <rect x="24" y="54" width="72" height="62" rx="4" fill="#FBF3DD" />
      <text x="60" y="74" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="7" letterSpacing="1.5" fill="#6B5547">TAZA MAESTRA</text>
      <text x="60" y="96" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="17" fill="#6E1417">MUESTRA</text>
      <text x="60" y="109" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="7.5" letterSpacing="1" fill="#6B5547">{GRAMOS_MUESTRA} G</text>
    </svg>
  );
}

function Bolsa({ cafe, proceso, sizes, priority }: { cafe: Product; proceso: string; sizes: string; priority?: boolean }) {
  return cafe.img ? (
    <Image
      src={srcImagen(cafe.img)}
      alt=""
      width={304}
      height={312}
      sizes={sizes}
      priority={priority}
      className="w-full h-auto drop-shadow-[0_26px_34px_rgba(0,0,0,.45)]"
    />
  ) : (
    <BolsaMockup id={`tienda-${cafe.id}`} nombre={cafe.name} region={cafe.region} proceso={proceso} {...cafe.bolsa} decorativa className="w-full h-auto drop-shadow-2xl" />
  );
}

export default function HeroTienda({ products, locale }: { products: Product[]; locale: Locale }) {
  const es = locale !== "en";
  const cafes = products.slice(0, 2);
  const [elegido, setElegido] = useState(0);
  const [tocado, setTocado] = useState(false);

  // Se turnan solos hasta que el cliente elige.
  useEffect(() => {
    if (tocado || cafes.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setElegido((i) => (i + 1) % cafes.length), TURNO_MS);
    return () => window.clearTimeout(t);
  }, [elegido, tocado, cafes.length]);

  if (cafes.length === 0) return null;
  const actual = cafes[elegido] ?? cafes[0];
  const slide = heroSlides.find((s) => s.cafeId === actual.id);
  const sabores = (es ? slide?.sabores_es : slide?.sabores_en) ?? [];
  const fondoDe = (c: Product) => heroSlides.find((s) => s.cafeId === c.id)?.fondo ?? "linear-gradient(150deg,#7E181C,#4A0B0F)";

  // "¿Qué buscas?": cada café responde con su lado de la taza.
  const opciones = cafes.map((c) => {
    const afrutado = c.proceso_es === "Natural";
    return {
      id: c.id,
      texto: afrutado
        ? es ? "Algo afrutado e intenso" : "Fruity and bold"
        : es ? "Algo achocolatado y suave" : "Chocolatey and smooth",
    };
  });

  const elegir = (i: number) => {
    setTocado(true);
    setElegido(i);
  };

  // Todos los sabores, para la franja que corre abajo.
  const franja = [
    ...heroSlides.flatMap((s) => (es ? s.sabores_es : s.sabores_en)),
    es ? `Muestra de ${GRAMOS_MUESTRA} g gratis` : `Free ${GRAMOS_MUESTRA} g sample`,
    es ? "Tostado por pedido" : "Roasted to order",
  ];

  const presentaciones = [
    { peso: formatPeso(GRAMOS_MUESTRA), txt: es ? "Muestra gratis" : "Free sample", escala: 0.55 },
    { peso: formatPeso(actual.pesoG), txt: es ? "Bolsa" : "Bag", escala: 0.75 },
    ...(actual.negocio ? [{ peso: formatPeso(actual.negocio.pesoG), txt: es ? "Para negocios" : "For businesses", escala: 1 }] : []),
  ];

  return (
    <section aria-labelledby="tienda-titulo" className="relative isolate overflow-hidden">
      {/* Fondo del café al frente, cruzándose al cambiar */}
      {cafes.map((c, i) => (
        <div
          key={c.id}
          aria-hidden="true"
          className="absolute inset-0 -z-20 transition-opacity duration-1000"
          style={{ background: fondoDe(c), opacity: i === elegido ? 1 : 0 }}
        />
      ))}
      <div aria-hidden="true" className="absolute inset-0 -z-10 pointer-events-none">
        {[8, 27, 46, 63, 81, 93].map((l, i) => (
          <span
            key={l}
            className="tm-hero-particula absolute rounded-full bg-crema-papel"
            style={{ left: `${l}%`, bottom: `${(i * 7) % 22}%`, width: 3 + (i % 3) * 2, height: 3 + (i % 3) * 2, animationDelay: `${i * 1.3}s`, animationDuration: `${9 + (i % 4)}s` }}
          />
        ))}
      </div>

      <div className="max-w-310 mx-auto px-5.5 pt-12 pb-8 md:pt-16 md:pb-10 grid grid-cols-1 md:grid-cols-[1.05fr_.95fr] gap-8 md:gap-6 items-center">
        {/* ── Texto y la pregunta ─────────────────────────────── */}
        <div>
          <p className="inline-flex items-center gap-2 bg-white/10 font-mono text-[11px] tracking-[.22em] text-naranja-claro uppercase px-3 py-1.5 rounded-pill mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-naranja-claro tm-hero-latido" aria-hidden="true" />
            {es ? "CATÁLOGO · FINCA PROPIA" : "CATALOG · OUR OWN FARM"}
          </p>
          <h1
            id="tienda-titulo"
            className="font-display font-bold text-crema-papel leading-[1.02] tracking-[-0.01em] mb-4"
            style={{ fontSize: "clamp(36px,5.2vw,64px)" }}
          >
            {es ? "Encuentra tu taza." : "Find your cup."}{" "}
            <em className="not-italic text-naranja-claro">{es ? "Pruébala antes de comprarla." : "Try it before you buy it."}</em>
          </h1>
          <p className="font-body text-crema/80 text-base md:text-lg leading-relaxed max-w-130 mb-7">
            {es
              ? "Dos cafés de nuestra finca, de lados opuestos de la taza. En bolsa para tu casa o en cuarterón para tu cafetería. ¿No sabes cuál? Te enviamos una muestra gratis."
              : "Two coffees from our farm, from opposite sides of the cup. In a bag for home or a large bag for your café. Not sure which? We'll send you a free sample."}
          </p>

          {/* La pregunta que arma la experiencia */}
          <div className="mb-7">
            <p id="tienda-pregunta" className="font-mono text-[10px] tracking-[.18em] text-crema/60 uppercase mb-2.5">
              {es ? "¿Qué buscas en la taza?" : "What do you want in your cup?"}
            </p>
            <div role="radiogroup" aria-labelledby="tienda-pregunta" className="flex flex-wrap gap-2">
              {opciones.map((o, i) => {
                const activo = i === elegido;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    onClick={() => elegir(i)}
                    className={`relative font-body font-700 text-sm px-4 py-2.5 rounded-pill border transition-all duration-300 ${
                      activo
                        ? "bg-crema-papel text-vino border-crema-papel shadow-lg scale-[1.03]"
                        : "bg-white/5 text-crema-papel border-white/25 hover:bg-white/10 hover:border-white/50"
                    }`}
                  >
                    {o.texto}
                  </button>
                );
              })}
            </div>
            <p key={actual.id} className="font-body text-sm text-crema/85 mt-3 animate-[fadeUp_.35s_ease-out]" aria-live="polite">
              {es ? "Te va " : "Try "}
              <Link href={`/producto/${actual.id}`} className="font-700 text-dorado-claro underline underline-offset-4 hover:text-crema-papel">
                {actual.name}
              </Link>
              {" — "}
              {es ? actual.notas_es : actual.notas_en}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="#muestra"
              className="group inline-flex items-center gap-2 bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5"
            >
              {es ? `Pedir muestra gratis de ${GRAMOS_MUESTRA} g` : `Get a free ${GRAMOS_MUESTRA} g sample`}
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </a>
            <a
              href="#catalogo"
              className="inline-flex items-center gap-2 border border-white/30 text-crema-papel hover:bg-white/10 font-body font-700 text-base px-6 py-3 rounded-btn transition-colors"
            >
              {es ? "Ver los cafés" : "See the coffees"} <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        {/* ── Las bolsas en abanico y la muestra ──────────────── */}
        <div aria-hidden="true" className="relative h-80 sm:h-96 md:h-125">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="tm-hero-anillo w-64 h-64 sm:w-80 sm:h-80 md:w-100 md:h-100 rounded-full border border-dashed border-white/20" />
          </div>

          {cafes.map((c, i) => {
            const alFrente = i === elegido;
            const lado = i === 0 ? -1 : 1;
            return (
              <div
                key={c.id}
                className="absolute inset-0 flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(.22,.61,.36,1)]"
                style={{
                  transform: alFrente
                    ? "translateX(0) scale(1) rotate(0deg)"
                    : `translateX(${lado * 34}%) scale(.66) rotate(${lado * 9}deg)`,
                  opacity: alFrente ? 1 : 0.6,
                  zIndex: alFrente ? 20 : 10,
                }}
              >
                <div className="relative w-52 sm:w-64 md:w-80">
                  <div
                    className="tm-hero-brillo absolute -inset-[10%] rounded-full"
                    style={{ background: `radial-gradient(circle, ${c.bolsa.acento} 0%, transparent 68%)` }}
                  />
                  <div className={alFrente ? "tm-hero-flota relative" : "relative"}>
                    <Bolsa cafe={c} proceso={es ? c.proceso_es : c.proceso_en} sizes="(max-width: 640px) 208px, (max-width: 768px) 256px, 320px" priority={i === 0} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Sabores del café al frente: entran de nuevo con cada cambio */}
          <div key={actual.id} className="tm-hero-activo absolute inset-0 z-30 pointer-events-none">
            {sabores.slice(0, POS_SABORES.length).map((s, j) => (
              <span
                key={s}
                className="tm-hero-sabor absolute whitespace-nowrap font-body font-700 text-[11px] md:text-sm text-tinta bg-crema-papel/95 px-3 py-1.5 rounded-pill shadow-lg"
                style={{ ...POS_SABORES[j], "--d": `${150 + j * 120}ms`, animationDuration: `.6s, ${5 + j * 0.7}s` } as Var}
              >
                {s}
              </span>
            ))}
          </div>

          {/* La muestra, con su sello de gratis */}
          <div className="absolute z-40 left-[4%] bottom-[2%] md:left-[0%] md:bottom-[6%] w-20 sm:w-24 md:w-28 tm-muestra">
            <SobreMuestra className="w-full h-auto drop-shadow-xl" />
            <span className="tm-muestra-sello absolute -top-3 -right-5 bg-naranja text-white font-mono font-700 text-[10px] tracking-[.12em] px-2.5 py-1 rounded-pill shadow-cta">
              {es ? "GRATIS" : "FREE"}
            </span>
          </div>
        </div>
      </div>

      {/* Presentaciones, de la muestra al cuarterón */}
      <div className="max-w-310 mx-auto px-5.5 pb-8">
        <ul className="flex flex-wrap items-end gap-x-8 gap-y-4">
          {presentaciones.map((p) => (
            <li key={p.txt} className="flex items-end gap-2.5">
              <span
                className="block rounded-t-[6px] rounded-b-[3px] bg-crema-papel/85 transition-all duration-500"
                style={{ width: 18 * p.escala + 8, height: 30 * p.escala + 8 }}
                aria-hidden="true"
              />
              <span>
                <span className="block font-display font-bold text-dorado-claro text-2xl leading-none">{p.peso}</span>
                <span className="block font-mono text-[10px] tracking-[.15em] text-crema/60 uppercase mt-1">{p.txt}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Franja de sabores que corre */}
      <div className="border-y border-white/10 bg-black/15 py-3 overflow-hidden" aria-hidden="true">
        <div className="tm-franja flex w-max">
          {[0, 1].map((copia) => (
            <ul key={copia} className="flex shrink-0">
              {franja.map((s, i) => (
                <li key={`${copia}-${i}`} className="flex items-center font-mono text-[11px] md:text-xs tracking-[.2em] uppercase text-crema/75 px-5 whitespace-nowrap">
                  <span className="mr-5 text-naranja-claro">✦</span>
                  {s}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

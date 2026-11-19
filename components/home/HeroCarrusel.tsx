"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { Link } from "@/lib/nav";
import BolsaMockup from "@/components/shared/BolsaMockup";
import { srcImagen } from "@/lib/cafes";
import type { BolsaCafe } from "@/lib/types";

// Un café por slide. Cambian el fondo, el texto y la bolsa; el CTA se queda.
//
// Rendimiento: todo el movimiento es CSS (transform, opacity y sus
// propiedades sueltas translate/scale/rotate), que el navegador compone sin
// repintar. El único JS por frame es el tilt de la bolsa, y escribe dos
// variables CSS en un requestAnimationFrame, sin pasar por React.
//
// El avance automático lo marca la barra de progreso: cuando su animación
// termina, pasa el slide. Pausar la barra (hover, foco, botón) pausa el
// carrusel sin perder lo que llevaba.

export interface SlideHero {
  id: string;
  nombre: string;
  kicker: string;
  titulo: string;
  destacado: string;
  relato: string;
  sellos: string[];
  sabores: string[];
  insignia: { num: string; txt: string };
  fondo: string;
  region: string;
  proceso: string;
  /** Foto de la bolsa; sin ella se dibuja el mockup. */
  img: string | null;
  bolsa: BolsaCafe;
}

interface Textos {
  carrusel: string;
  anterior: string;
  siguiente: string;
  pausar: string;
  reanudar: string;
  irA: string;
  verCafe: string;
  sabores: string;
}

const INTERVALO_MS = 7000;

// Dónde flotan los sabores alrededor de la bolsa (hasta cuatro).
const POS_SABORES: CSSProperties[] = [
  { left: "-20%", top: "46%" },
  { right: "-14%", top: "18%" },
  { left: "-6%", bottom: "6%" },
  { right: "-12%", bottom: "22%" },
];

// Partículas de aroma del fondo: posiciones fijas para que el HTML del
// servidor y el del navegador coincidan.
const PARTICULAS = [
  { l: "8%", b: "6%", s: 6, d: 0, t: 9 },
  { l: "22%", b: "18%", s: 4, d: 2.5, t: 11 },
  { l: "41%", b: "4%", s: 5, d: 5, t: 10 },
  { l: "58%", b: "12%", s: 7, d: 1.2, t: 12 },
  { l: "72%", b: "2%", s: 4, d: 3.8, t: 9 },
  { l: "86%", b: "20%", s: 6, d: 6.2, t: 13 },
  { l: "94%", b: "8%", s: 3, d: 4.4, t: 10 },
];

type Paso = CSSProperties & { "--paso"?: number; "--d"?: string };

export default function HeroCarrusel({
  slides,
  textos,
  pie,
  titulo,
}: {
  slides: SlideHero[];
  textos: Textos;
  pie: ReactNode;
  titulo: ReactNode;
}) {
  const [activo, setActivo] = useState(0);
  const [previo, setPrevio] = useState<number | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [ciclo, setCiclo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [encima, setEncima] = useState(false);
  const [menosMovimiento, setMenosMovimiento] = useState(false);
  const toqueX = useRef<number | null>(null);
  const escenario = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const total = slides.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMenosMovimiento(mq.matches);
    const cambio = (e: MediaQueryListEvent) => setMenosMovimiento(e.matches);
    mq.addEventListener("change", cambio);
    return () => mq.removeEventListener("change", cambio);
  }, []);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  const girando = !pausado && !encima && !menosMovimiento && total > 1;

  function ir(destino: number, sentido: 1 | -1) {
    const i = (destino + total) % total;
    if (i === activo) return;
    setPrevio(activo);
    setDir(sentido);
    setActivo(i);
    setCiclo((c) => c + 1);
  }
  const siguiente = () => ir(activo + 1, 1);
  const anterior = () => ir(activo - 1, -1);

  // Tilt de la bolsa con el puntero (solo mouse, y solo si se permite movimiento).
  function inclinar(e: React.PointerEvent<HTMLDivElement>) {
    if (menosMovimiento || e.pointerType !== "mouse") return;
    const el = escenario.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--ry", `${(x * 16).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-y * 12).toFixed(2)}deg`);
    });
  }
  function enderezar() {
    const el = escenario.current;
    if (!el) return;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
  }

  const actual = slides[activo];

  return (
    <section
      aria-label="Hero"
      className="relative isolate overflow-hidden"
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
    >
      {/* Fondos: uno por café, se cruzan al cambiar */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          aria-hidden="true"
          className="absolute inset-0 -z-20 transition-opacity duration-1000 ease-out"
          style={{ background: s.fondo, opacity: i === activo ? 1 : 0 }}
        />
      ))}

      {/* Aroma: partículas que suben despacio */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 pointer-events-none">
        {PARTICULAS.map((p, i) => (
          <span
            key={i}
            className="tm-hero-particula absolute rounded-full bg-crema-papel"
            style={{
              left: p.l,
              bottom: p.b,
              width: p.s,
              height: p.s,
              animationDelay: `${p.d}s`,
              animationDuration: `${p.t}s`,
            }}
          />
        ))}
        <div
          className="tm-hero-halo absolute -right-40 -top-40 w-[520px] h-[520px] rounded-full"
          style={{ background: `radial-gradient(circle, ${actual?.bolsa.acento ?? "#F0A24B"}33 0%, transparent 65%)` }}
        />
      </div>

      {titulo}

      <div
        role="region"
        aria-roledescription="carrusel"
        aria-label={textos.carrusel}
        className="max-w-310 mx-auto px-5.5 pt-8 pb-14 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-10 items-center"
        onFocus={() => setEncima(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEncima(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") siguiente();
          if (e.key === "ArrowLeft") anterior();
        }}
        onTouchStart={(e) => {
          toqueX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (toqueX.current === null) return;
          const dx = e.changedTouches[0].clientX - toqueX.current;
          toqueX.current = null;
          if (Math.abs(dx) > 40) (dx < 0 ? siguiente : anterior)();
        }}
      >
        {/* ── Texto ─────────────────────────────────────────────── */}
        <div className="order-2 md:order-1">
          {/* Con el carrusel quieto, el lector de pantalla anuncia cada cambio. */}
          <div className="grid" aria-live={girando ? "off" : "polite"}>
            {slides.map((s, i) => {
              const visible = i === activo;
              return (
                <div
                  key={s.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} / ${total}: ${s.nombre}`}
                  aria-hidden={!visible}
                  inert={!visible}
                  className={`[grid-area:1/1] transition-opacity duration-300 ${
                    visible
                      ? `opacity-100 tm-hero-activo ${previo !== null ? "tm-hero-anima" : ""}`
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  <div
                    data-paso
                    style={{ "--paso": 0 } as Paso}
                    className="inline-flex items-center gap-2 bg-white/10 text-naranja-claro font-mono text-[11px] tracking-[.2em] px-3 py-1.5 rounded-pill mb-5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-naranja-claro tm-hero-latido" aria-hidden="true" />
                    {s.kicker}
                  </div>
                  <p
                    data-paso
                    style={{ "--paso": 1, fontSize: "clamp(38px, 5.6vw, 70px)" } as Paso}
                    className="font-display font-bold text-crema-papel leading-[1.02] tracking-[-0.01em] mb-5"
                  >
                    {s.titulo} <em className="text-naranja-claro not-italic">{s.destacado}</em>
                  </p>
                  <p
                    data-paso
                    style={{ "--paso": 2 } as Paso}
                    className="font-body text-crema/85 text-base md:text-lg leading-relaxed mb-5 max-w-130"
                  >
                    {s.relato}
                  </p>

                  {/* Proceso, en pastillas que entran una a una */}
                  <ul className="flex flex-wrap gap-2 mb-4">
                    {s.sellos.map((sello, j) => (
                      <li
                        key={sello}
                        className="tm-hero-sello font-mono text-[10px] md:text-[11px] tracking-[.14em] uppercase text-crema-papel border border-white/25 bg-white/5 px-3 py-1.5 rounded-pill"
                        style={{ "--d": `${300 + j * 110}ms` } as Paso}
                      >
                        {sello}
                      </li>
                    ))}
                  </ul>
                  {/* Los sabores también en texto: los que flotan son decorativos */}
                  <p className="sr-only">
                    {textos.sabores}: {s.sabores.join(", ")}.
                  </p>

                  <Link
                    data-paso
                    style={{ "--paso": 4 } as Paso}
                    href={`/producto/${s.id}`}
                    className="group inline-flex items-center gap-1.5 font-body font-700 text-sm text-dorado-claro hover:text-crema-papel"
                  >
                    <span className="underline underline-offset-4">
                      {textos.verCafe.replace("{cafe}", s.nombre).replace(/\s*→\s*$/, "")}
                    </span>
                    <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>

          {total > 1 && (
            <div className="flex items-center gap-2 mt-7 mb-8">
              <button
                type="button"
                onClick={anterior}
                aria-label={textos.anterior}
                className="w-10 h-10 rounded-full border border-white/25 text-crema-papel hover:bg-white/10 hover:-translate-x-0.5 transition-all"
              >
                <span aria-hidden="true">←</span>
              </button>

              {/* Barras de progreso: la del café activo se llena con el tiempo */}
              <div className="flex items-center gap-1.5 px-1">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => ir(i, i > activo ? 1 : -1)}
                    aria-label={textos.irA.replace("{cafe}", s.nombre)}
                    aria-current={i === activo}
                    className="py-3 group"
                  >
                    <span
                      className={`block h-1.5 rounded-pill overflow-hidden bg-white/25 transition-all duration-500 group-hover:bg-white/40 ${
                        i === activo ? "w-14" : "w-6"
                      }`}
                    >
                      {i === activo && (
                        <span
                          key={ciclo}
                          className="tm-hero-progreso block h-full w-full bg-naranja-claro origin-left"
                          style={{
                            animationDuration: `${INTERVALO_MS}ms`,
                            animationPlayState: girando ? "running" : "paused",
                          }}
                          onAnimationEnd={() => {
                            if (girando) siguiente();
                          }}
                        />
                      )}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={siguiente}
                aria-label={textos.siguiente}
                className="w-10 h-10 rounded-full border border-white/25 text-crema-papel hover:bg-white/10 hover:translate-x-0.5 transition-all"
              >
                <span aria-hidden="true">→</span>
              </button>

              <span className="ml-2 font-mono text-xs tracking-[.15em] text-crema/60 tabular-nums" aria-hidden="true">
                {String(activo + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>

              {!menosMovimiento && (
                <button
                  type="button"
                  onClick={() => setPausado((p) => !p)}
                  aria-label={pausado ? textos.reanudar : textos.pausar}
                  className="ml-1 w-9 h-9 rounded-full text-crema/70 hover:text-crema-papel hover:bg-white/10 transition-colors text-xs"
                >
                  <span aria-hidden="true">{pausado ? "▶" : "❚❚"}</span>
                </button>
              )}
            </div>
          )}

          {pie}
        </div>

        {/* ── Bolsa ─────────────────────────────────────────────── */}
        <div
          ref={escenario}
          aria-hidden="true"
          onPointerMove={inclinar}
          onPointerLeave={enderezar}
          className="order-1 md:order-2 relative h-85 sm:h-100 md:h-130 lg:h-145"
        >
          {/* Anillo que gira despacio detrás de la bolsa */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="tm-hero-anillo w-70 h-70 sm:w-85 sm:h-85 md:w-110 md:h-110 rounded-full border border-dashed border-white/20" />
          </div>

          {slides.map((s, i) => {
            const esActivo = i === activo;
            const esPrevio = i === previo;
            // Entra por el lado al que se avanza; el que sale se va por el otro.
            const clase = esActivo
              ? previo === null
                ? ""
                : dir === 1 ? "tm-bolsa-entra-der" : "tm-bolsa-entra-izq"
              : esPrevio
                ? dir === 1 ? "tm-bolsa-sale-izq" : "tm-bolsa-sale-der"
                : "opacity-0";
            return (
              <div
                key={s.id}
                className={`absolute inset-0 flex items-center justify-center ${clase} ${
                  esActivo ? "tm-hero-activo z-10" : "pointer-events-none"
                }`}
              >
                <div className="tm-hero-tilt relative w-60 sm:w-72 md:w-95 lg:w-110">
                  {/* Brillo del color del café, respirando */}
                  <div
                    className="tm-hero-brillo absolute -inset-[12%] rounded-full"
                    style={{ background: `radial-gradient(circle, ${s.bolsa.acento} 0%, transparent 68%)` }}
                  />

                  <div className="tm-hero-flota relative">
                    {s.img ? (
                      <Image
                        src={srcImagen(s.img)}
                        alt=""
                        width={304}
                        height={312}
                        sizes="(max-width: 640px) 240px, (max-width: 768px) 288px, 440px"
                        priority={i === 0}
                        className="relative w-full h-auto drop-shadow-[0_30px_40px_rgba(0,0,0,.45)]"
                      />
                    ) : (
                      <BolsaMockup
                        id={`hero-${s.id}`}
                        nombre={s.nombre}
                        region={s.region}
                        proceso={s.proceso}
                        {...s.bolsa}
                        decorativa
                        className="relative w-full h-auto drop-shadow-2xl"
                      />
                    )}
                  </div>

                  {/* El dato grande, pegado a la bolsa */}
                  <div
                    className="tm-hero-pop absolute -left-[6%] top-[4%] w-20 h-20 md:w-26 md:h-26 rounded-full bg-crema-papel text-vino flex flex-col items-center justify-center text-center shadow-xl"
                    style={{ "--d": "450ms" } as Paso}
                  >
                    <span className="font-display font-bold text-2xl md:text-4xl leading-none">{s.insignia.num}</span>
                    <span className="font-mono text-[8px] md:text-[9px] tracking-widest uppercase leading-tight mt-1 px-2">
                      {s.insignia.txt}
                    </span>
                  </div>

                  {/* Sabores flotando alrededor */}
                  {s.sabores.slice(0, POS_SABORES.length).map((sabor, j) => (
                    <span
                      key={sabor}
                      className="tm-hero-sabor absolute whitespace-nowrap font-body font-700 text-[11px] md:text-sm text-tinta bg-crema-papel/95 px-3 py-1.5 md:px-3.5 md:py-2 rounded-pill shadow-lg"
                      style={{
                        ...POS_SABORES[j],
                        "--d": `${600 + j * 140}ms`,
                        animationDuration: `.6s, ${5 + j * 0.8}s`,
                      } as Paso}
                    >
                      {sabor}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

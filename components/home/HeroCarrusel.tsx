"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@/lib/nav";
import BolsaMockup from "@/components/home/BolsaMockup";
import type { PatronBolsa } from "@/lib/types";

// Un café por slide: cambian el texto y la bolsa, el fondo y el CTA se quedan.
// Todos los slides viven apilados en la misma celda del grid, así el alto no
// salta entre historias largas y cortas; solo el activo es visible.

export interface SlideHero {
  id: string;
  nombre: string;
  kicker: string;
  titulo: string;
  destacado: string;
  relato: string;
  region: string;
  proceso: string;
  bolsa: { fondo: string; acento: string; patron: PatronBolsa };
}

interface Textos {
  carrusel: string;
  anterior: string;
  siguiente: string;
  pausar: string;
  reanudar: string;
  irA: string;
  verCafe: string;
}

const INTERVALO_MS = 7000;

export default function HeroCarrusel({ slides, textos, pie }: { slides: SlideHero[]; textos: Textos; pie: ReactNode }) {
  const [activo, setActivo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [encima, setEncima] = useState(false);
  const [menosMovimiento, setMenosMovimiento] = useState(false);
  const toqueX = useRef<number | null>(null);
  const total = slides.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMenosMovimiento(mq.matches);
    const cambio = (e: MediaQueryListEvent) => setMenosMovimiento(e.matches);
    mq.addEventListener("change", cambio);
    return () => mq.removeEventListener("change", cambio);
  }, []);

  const girando = !pausado && !encima && !menosMovimiento && total > 1;

  // Se reinicia con cada cambio de slide: si el cliente avanza a mano, el
  // siguiente cambio automático espera el intervalo completo.
  useEffect(() => {
    if (!girando) return;
    const t = window.setTimeout(() => setActivo((i) => (i + 1) % total), INTERVALO_MS);
    return () => window.clearTimeout(t);
  }, [girando, activo, total]);

  const ir = (i: number) => setActivo((i + total) % total);

  return (
    <section
      aria-roledescription="carrusel"
      aria-label={textos.carrusel}
      className="grid grid-cols-1 md:grid-cols-[1.05fr_.95fr] gap-10 items-center"
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      onFocus={() => setEncima(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEncima(false);
      }}
      onTouchStart={(e) => {
        toqueX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (toqueX.current === null) return;
        const dx = e.changedTouches[0].clientX - toqueX.current;
        toqueX.current = null;
        if (Math.abs(dx) > 40) ir(activo + (dx < 0 ? 1 : -1));
      }}
    >
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
                className={`[grid-area:1/1] transition-all duration-500 ease-out ${
                  visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                }`}
              >
                <div className="inline-flex items-center gap-2 bg-white/10 text-naranja-claro font-mono text-[11px] tracking-[.2em] px-3 py-1.5 rounded-pill mb-6">
                  {s.kicker}
                </div>
                <p
                  className="font-display font-bold text-crema-papel leading-[1.02] tracking-[-0.01em] mb-5"
                  style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
                >
                  {s.titulo} <em className="text-naranja-claro not-italic">{s.destacado}</em>
                </p>
                <p className="font-body text-crema/80 text-base md:text-lg leading-relaxed mb-4 max-w-125">{s.relato}</p>
                <Link
                  href={`/producto/${s.id}`}
                  className="inline-block font-body font-700 text-sm text-dorado-claro underline underline-offset-4 hover:text-crema-papel"
                >
                  {textos.verCafe.replace("{cafe}", s.nombre)}
                </Link>
              </div>
            );
          })}
        </div>

        {total > 1 && (
          <div className="flex items-center gap-2 mt-6 mb-8">
            <button
              type="button"
              onClick={() => ir(activo - 1)}
              aria-label={textos.anterior}
              className="w-9 h-9 rounded-full border border-white/25 text-crema-papel hover:bg-white/10 transition-colors"
            >
              <span aria-hidden="true">←</span>
            </button>
            <div className="flex items-center">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => ir(i)}
                  aria-label={textos.irA.replace("{cafe}", s.nombre)}
                  aria-current={i === activo}
                  className="p-2 group"
                >
                  <span
                    className={`block h-2 rounded-pill transition-all duration-300 ${
                      i === activo ? "w-6 bg-naranja-claro" : "w-2 bg-white/35 group-hover:bg-white/60"
                    }`}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => ir(activo + 1)}
              aria-label={textos.siguiente}
              className="w-9 h-9 rounded-full border border-white/25 text-crema-papel hover:bg-white/10 transition-colors"
            >
              <span aria-hidden="true">→</span>
            </button>
            {!menosMovimiento && (
              <button
                type="button"
                onClick={() => setPausado((p) => !p)}
                aria-label={pausado ? textos.reanudar : textos.pausar}
                className="ml-2 w-9 h-9 rounded-full text-crema/70 hover:text-crema-papel hover:bg-white/10 transition-colors text-xs"
              >
                <span aria-hidden="true">{pausado ? "▶" : "❚❚"}</span>
              </button>
            )}
          </div>
        )}

        {pie}
      </div>

      <div className="order-1 md:order-2 grid items-center justify-items-center relative" aria-hidden="true">
        {slides.map((s, i) => {
          const visible = i === activo;
          return (
            <div
              key={s.id}
              className={`[grid-area:1/1] relative flex items-center justify-center w-full transition-all duration-700 ease-out ${
                visible ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-95 rotate-2"
              }`}
            >
              <div
                className="absolute inset-0 rounded-full opacity-25"
                style={{ background: `radial-gradient(circle, ${s.bolsa.acento} 0%, transparent 70%)`, transform: "scale(0.8)" }}
              />
              <BolsaMockup
                id={s.id}
                nombre={s.nombre}
                region={s.region}
                proceso={s.proceso}
                {...s.bolsa}
                className="relative z-10 w-52 md:w-80 h-auto drop-shadow-2xl"
              />
            </div>
          );
        })}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-6 z-20">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1 h-10 rounded-full bg-white/30"
              style={{ animation: `steam 3.2s ease-in-out ${[0, 0.9, 1.7][i]}s infinite` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

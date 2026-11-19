"use client";

import Image from "next/image";
import { TrendDown, Mountains, Plant, CoffeeBean, type Icon } from "@phosphor-icons/react";
import { Link } from "@/lib/nav";
import Revelar from "@/components/shared/Revelar";
import type { Locale } from "@/lib/types";

// La historia de Taza Maestra: sin legado de abuelos. Una finca comprada en
// plena crisis cafetera para hacerla rentable, que terminó devolviendo las
// raíces. Abre la página de Historias; debajo siguen las de los clientes.
// Animaciones: las clases tm-* de globals.css (transform/opacity) y Revelar
// para la entrada al hacer scroll.

interface Capitulo {
  icono: Icon;
  etapa: [string, string];
  titulo: [string, string];
  texto: [string, string];
}

const ETAPAS: [string, string][] = [
  ["Crisis", "Crisis"],
  ["Reto", "Challenge"],
  ["Raíces", "Roots"],
  ["Pasión", "Passion"],
];

// Las cuatro etapas alrededor del anillo, en el sentido del reloj desde arriba.
const NODOS: { icono: Icon; pos: string }[] = [
  { icono: TrendDown, pos: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" },
  { icono: Mountains, pos: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2" },
  { icono: Plant, pos: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2" },
  { icono: CoffeeBean, pos: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2" },
];

const CAPITULOS: Capitulo[] = [
  {
    icono: TrendDown,
    etapa: ["LA CRISIS", "THE CRISIS"],
    titulo: ["Una finca cuando el café no daba", "A farm when coffee didn't pay"],
    texto: [
      "Adquirí la finca en plena crisis cafetera. No fue un acto romántico: la meta era una sola, hacerla rentable.",
      "I bought the farm in the middle of a coffee crisis. It wasn't romantic: there was one goal, make it profitable.",
    ],
  },
  {
    icono: Mountains,
    etapa: ["EL RETO", "THE CHALLENGE"],
    titulo: ["Hacer que los números cuadraran", "Making the numbers work"],
    texto: [
      "Mi padre fue cafetero casi toda su vida. Sabía lo que cuesta la tierra y lo poco que a veces devuelve. Sacar adelante una finca cuando todos vendían era el reto.",
      "My father was a coffee grower almost all his life. He knew what the land costs and how little it sometimes gives back. Keeping a farm going while everyone was selling was the challenge.",
    ],
  },
  {
    icono: Plant,
    etapa: ["LAS RAÍCES", "THE ROOTS"],
    titulo: ["Lo que no estaba en el plan", "What wasn't in the plan"],
    texto: [
      "Entre cuentas y cosechas pasó algo inesperado: dejé de ver solo cifras. Volví a la cereza, al secado, a la taza. Descubrí mis raíces.",
      "Somewhere between the accounts and the harvests something unexpected happened: I stopped seeing only numbers. I went back to the cherry, the drying, the cup. I found my roots.",
    ],
  },
  {
    icono: CoffeeBean,
    etapa: ["LA PASIÓN", "THE PASSION"],
    titulo: ["A pesar de todo, seguimos aquí", "Despite everything, we're still here"],
    texto: [
      "El reto se volvió pasión. Las adversidades no se fueron, pero tampoco nosotros. Cada bolsa de Taza Maestra es la prueba.",
      "The challenge became a passion. The hard times didn't go away, and neither did we. Every bag of Taza Maestra is the proof.",
    ],
  },
];

export default function NuestraHistoria({ locale }: { locale: Locale }) {
  const es = locale !== "en";
  const L = (par: [string, string]) => (es ? par[0] : par[1]);

  return (
    <>
      {/* ── Apertura ───────────────────────────────────────────── */}
      <section
        aria-labelledby="historia-titulo"
        className="relative isolate overflow-hidden"
        style={{ background: "radial-gradient(120% 130% at 80% 0%, #8A1C21, #5E0F13 55%, #3E080C)" }}
      >
        <div aria-hidden="true" className="absolute inset-0 -z-10 pointer-events-none">
          {[6, 19, 34, 52, 67, 79, 91].map((l, i) => (
            <span
              key={l}
              className="tm-hero-particula absolute rounded-full bg-crema-papel"
              style={{ left: `${l}%`, bottom: `${(i * 9) % 26}%`, width: 3 + (i % 3) * 2, height: 3 + (i % 3) * 2, animationDelay: `${i * 1.1}s`, animationDuration: `${9 + (i % 4)}s` }}
            />
          ))}
          <div
            className="tm-hero-halo absolute -right-40 -top-40 w-[560px] h-[560px] rounded-full"
            style={{ background: "radial-gradient(circle, #F0A24B33 0%, transparent 65%)" }}
          />
          <div
            className="tm-hero-halo absolute -left-52 bottom-[-260px] w-[520px] h-[520px] rounded-full"
            style={{ background: "radial-gradient(circle, #2F5D3A55 0%, transparent 65%)", animationDelay: "-7s" }}
          />
        </div>

        <div className="max-w-310 mx-auto px-5.5 pt-16 pb-14 md:pt-24 md:pb-20 grid grid-cols-1 lg:grid-cols-[1.35fr_.65fr] gap-12 items-center">
          <div>
          <p className="tm-entra inline-flex items-center gap-2 bg-white/10 font-mono text-[11px] tracking-[.22em] text-naranja-claro uppercase px-3 py-1.5 rounded-pill mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-naranja-claro tm-hero-latido" aria-hidden="true" />
            {es ? "NUESTRA HISTORIA" : "OUR STORY"}
          </p>
          <h1
            id="historia-titulo"
            className="font-display font-bold text-crema-papel leading-[1.02] tracking-[-0.01em] max-w-230 mb-6"
            style={{ fontSize: "clamp(38px,6vw,76px)" }}
          >
            {es ? "No heredamos una finca." : "We didn't inherit a farm."}{" "}
            <em className="not-italic text-naranja-claro">{es ? "La elegimos en plena crisis." : "We chose one in the middle of a crisis."}</em>
          </h1>
          <p
            className="tm-entra font-body text-crema/85 text-base md:text-xl leading-relaxed max-w-170 mb-10"
            style={{ animationDelay: "180ms" }}
          >
            {es
              ? "Aquí no hay una abuela con una receta secreta ni un legado de cinco generaciones. Hay una finca comprada cuando el café no daba, un padre que fue cafetero casi toda su vida y la decisión de no soltarla."
              : "There's no grandmother with a secret recipe here, no five-generation legacy. There's a farm bought when coffee didn't pay, a father who grew coffee almost all his life, and the decision not to let it go."}
          </p>

          {/* El camino, con una luz que lo recorre una y otra vez */}
          <ol
            className="tm-entra flex flex-wrap items-center gap-x-3 gap-y-3"
            style={{ animationDelay: "270ms" }}
            aria-label={es ? "El camino" : "The path"}
          >
            {ETAPAS.map((e, i) => (
              <li key={e[0]} className="flex items-center gap-3">
                <span
                  className="tm-etapa font-display font-bold text-2xl md:text-4xl"
                  style={{ animationDelay: `${i * 1.6}s` }}
                >
                  {L(e)}
                </span>
                {i < ETAPAS.length - 1 && (
                  <span className="text-crema/40 text-xl md:text-2xl" aria-hidden="true">→</span>
                )}
              </li>
            ))}
          </ol>
          </div>

          {/* El camino en círculo: cada etapa se enciende junto con su palabra */}
          <div aria-hidden="true" className="hidden lg:flex justify-center">
            <div className="relative w-80 h-80 xl:w-96 xl:h-96">
              <div className="tm-hero-anillo absolute inset-0 rounded-full border border-dashed border-white/25" />
              <div className="absolute inset-[18%] rounded-full bg-white/5" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="tm-hero-flota w-36 h-36 xl:w-40 xl:h-40 rounded-full bg-crema-papel shadow-2xl flex items-center justify-center">
                  <Image src="/logo-badge.png" alt="" width={120} height={120} className="w-24 h-24 xl:w-28 xl:h-28 rounded-full" />
                </div>
              </div>
              {NODOS.map((n, i) => {
                const Icono = n.icono;
                return (
                  <span key={i} className={`absolute ${n.pos}`}>
                    <span
                      className="tm-nodo flex w-14 h-14 rounded-full items-center justify-center border border-white/25"
                      style={{ animationDelay: `${i * 1.6}s` }}
                    >
                      <Icono size={26} weight="duotone" />
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Capítulos ──────────────────────────────────────────── */}
      <section aria-labelledby="capitulos-titulo" className="bg-fondo py-16 md:py-24">
        <div className="max-w-310 mx-auto px-5.5">
          <Revelar className="max-w-180 mb-12">
            <p className="font-mono text-[11px] tracking-[.22em] text-dorado uppercase mb-3">
              {es ? "CUATRO CAPÍTULOS" : "FOUR CHAPTERS"}
            </p>
            <h2 id="capitulos-titulo" className="font-display font-bold text-tinta leading-[1.05]" style={{ fontSize: "clamp(30px,4vw,48px)" }}>
              {es ? "Del reto a la pasión" : "From challenge to passion"}
            </h2>
          </Revelar>

          <Revelar className="relative">
            {/* La línea que une los capítulos se dibuja al llegar */}
            <div aria-hidden="true" className="hidden lg:block absolute left-[6%] right-[6%] top-11 h-px">
              <div className="tm-linea h-full w-full bg-linear-to-r from-vino via-naranja to-verde" />
            </div>

            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {CAPITULOS.map((c, i) => {
                const Icono = c.icono;
                return (
                  <Revelar as="li" key={c.etapa[0]} retrasoMs={120 + i * 140}>
                    <article className="group relative h-full rounded-card-lg bg-white border border-borde p-6 pt-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-hover hover:border-vino/40 overflow-hidden">
                      <span
                        aria-hidden="true"
                        className="absolute right-4 top-2 font-display font-bold text-[72px] leading-none text-transparent [-webkit-text-stroke:1px_var(--color-borde)] transition-transform duration-500 group-hover:-translate-x-2 group-hover:scale-105"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="relative z-10 flex w-12 h-12 mb-5 rounded-full bg-vino text-crema-papel items-center justify-center ring-4 ring-fondo transition-transform duration-500 group-hover:rotate-[-10deg] group-hover:scale-110">
                        <Icono size={24} weight="duotone" aria-hidden="true" />
                      </span>
                      <p className="relative font-mono text-[10px] tracking-[.2em] text-dorado mb-2">{L(c.etapa)}</p>
                      <h3 className="relative font-display font-bold text-tinta text-xl md:text-2xl leading-snug mb-3">{L(c.titulo)}</h3>
                      <p className="relative font-body text-tinta-suave text-[15px] leading-relaxed">{L(c.texto)}</p>
                      <span
                        aria-hidden="true"
                        className="absolute left-0 bottom-0 h-1 w-full origin-left scale-x-0 bg-linear-to-r from-vino to-naranja transition-transform duration-500 group-hover:scale-x-100"
                      />
                    </article>
                  </Revelar>
                );
              })}
            </ol>
          </Revelar>
        </div>
      </section>

      {/* ── La frase y la invitación ───────────────────────────── */}
      <section className="bg-fondo pb-16 md:pb-24">
        <div className="max-w-310 mx-auto px-5.5">
          <Revelar>
            <figure
              className="relative isolate overflow-hidden rounded-card-lg px-7 py-12 md:px-16 md:py-16 text-center"
              style={{ background: "radial-gradient(120% 140% at 50% 0%, #2F5D3A, #1E3F27 55%, #12271A)" }}
            >
              <div aria-hidden="true" className="tm-hero-anillo absolute -z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full border border-dashed border-white/10" />
              <span aria-hidden="true" className="block font-display text-naranja-claro text-7xl leading-none mb-2">“</span>
              <blockquote
                className="font-display font-bold text-crema-papel leading-[1.15] max-w-215 mx-auto mb-8"
                style={{ fontSize: "clamp(24px,3.4vw,40px)" }}
              >
                {es
                  ? "La finca empezó como un negocio que había que sacar adelante. Terminó devolviéndome algo que no sabía que buscaba: mis raíces."
                  : "The farm started as a business that had to be turned around. It ended up giving me back something I didn't know I was looking for: my roots."}
              </blockquote>
              <figcaption className="font-mono text-[11px] tracking-[.2em] text-crema/60 uppercase mb-9">
                {es ? "Quien está detrás de Taza Maestra" : "The person behind Taza Maestra"}
              </figcaption>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href={{ pathname: "/tienda", hash: "muestra" }}
                  className="group inline-flex items-center gap-2 bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5"
                >
                  {es ? "Prueba el resultado: muestra gratis" : "Taste the result: free sample"}
                  <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                </Link>
                <Link
                  href="/tienda"
                  className="inline-flex items-center gap-2 border border-white/30 text-crema-papel hover:bg-white/10 font-body font-700 text-base px-6 py-3 rounded-btn transition-colors"
                >
                  {es ? "Conocer los cafés" : "See the coffees"}
                </Link>
              </div>
            </figure>
          </Revelar>
        </div>
      </section>
    </>
  );
}

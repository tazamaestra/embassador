"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/lib/nav";
import { metodosPreparacion, suscripcionConfig } from "@/lib/content";
import { consumoMensual, nivelSugerido, tazasQueRinde } from "@/lib/suscripcion";
import { formatCOP } from "@/lib/format";
import NumeroAnimado from "@/components/shared/NumeroAnimado";
import type { Locale } from "@/lib/types";

// Dos preguntas y una respuesta: cuánto café se toma al mes y qué plan cubre
// eso. La matemática vive en lib/suscripcion.ts; aquí solo se pregunta.

const TAZAS = [1, 2, 3, 4] as const;

export default function Calculadora({ locale }: { locale: Locale }) {
  const es = locale !== "en";
  const router = useRouter();

  const [tazas, setTazas] = useState<number>(2);
  const [metodoId, setMetodoId] = useState(metodosPreparacion[0].id);

  const { gramos, nivel, rinde } = useMemo(() => {
    const g = consumoMensual(tazas, metodoId, suscripcionConfig);
    const n = nivelSugerido(g, suscripcionConfig);
    return { gramos: g, nivel: n, rinde: tazasQueRinde(n, metodoId, suscripcionConfig) };
  }, [tazas, metodoId]);

  const etiquetaTazas = (n: number) =>
    n === 4 ? (es ? "4 o más" : "4 or more") : String(n);

  const opcion = (activa: boolean) =>
    [
      "font-body font-600 text-sm px-4 py-2.5 rounded-btn border transition-all duration-150",
      "active:scale-[.97]",
      activa
        ? "bg-vino text-crema-papel border-vino shadow-card-hover"
        : "bg-white text-tinta-cafe border-borde hover:border-vino hover:text-vino",
    ].join(" ");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
      {/* Las dos preguntas */}
      <div>
        <fieldset className="mb-8">
          <legend className="font-mono text-[11px] tracking-[.2em] text-tinta-suave uppercase mb-3">
            {es ? "1 · Tazas al día" : "1 · Cups a day"}
          </legend>
          <div className="flex flex-wrap gap-2">
            {TAZAS.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={tazas === n}
                onClick={() => setTazas(n)}
                className={opcion(tazas === n)}
              >
                {etiquetaTazas(n)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-mono text-[11px] tracking-[.2em] text-tinta-suave uppercase mb-3">
            {es ? "2 · Cómo lo preparas" : "2 · How you brew it"}
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {metodosPreparacion.map((m) => {
              const activo = metodoId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setMetodoId(m.id)}
                  className={`${opcion(activo)} text-left flex flex-col gap-1`}
                >
                  <span>{es ? m.label_es : m.label_en}</span>
                  <span
                    className={`font-mono text-[10px] leading-tight ${
                      activo ? "text-crema/70" : "text-tinta-suave"
                    }`}
                  >
                    {m.gramosPorTaza} g{es ? "/taza" : "/cup"}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {/* El resultado */}
      <div className="rounded-card-lg border border-borde bg-white p-6 lg:sticky lg:top-24">
        <p className="font-mono text-[10px] tracking-[.2em] text-dorado uppercase mb-4">
          {es ? "Tu consumo" : "Your consumption"}
        </p>

        <p className="font-display font-bold text-tinta leading-none mb-1 text-5xl">
          <NumeroAnimado valor={gramos} formato={(n) => Math.round(n).toLocaleString("es-CO")} />
          <span className="font-mono font-400 text-base text-tinta-suave ml-2">
            {es ? "g al mes" : "g a month"}
          </span>
        </p>

        <p className="font-body text-tinta-suave text-sm mb-6">
          {es
            ? `${tazas === 4 ? "4 o más" : tazas} ${tazas === 1 ? "taza" : "tazas"} al día, 30 días.`
            : `${tazas === 4 ? "4 or more" : tazas} ${tazas === 1 ? "cup" : "cups"} a day, 30 days.`}
        </p>

        <div className="border-t border-borde pt-5">
          <p className="font-mono text-[10px] tracking-[.2em] text-verde uppercase mb-1">
            {es ? "Te sirve" : "Your fit"}
          </p>
          <p className="font-display font-bold text-verde text-3xl leading-none mb-1">
            {es ? nivel.label_es : nivel.label_en}
          </p>
          <p className="font-display font-bold text-tinta text-xl leading-none mb-2">
            {formatCOP(nivel.precioCop)}
            <span className="font-mono font-400 text-[11px] text-tinta-suave ml-1">
              {es ? "/mes, envío incluido" : "/month, shipping included"}
            </span>
          </p>
          <p className="font-body text-tinta-suave text-sm">
            {es ? "Rinde para " : "Enough for "}
            <NumeroAnimado valor={rinde} className="font-600 text-tinta" />
            {es ? " tazas." : " cups."}
          </p>
        </div>

        {/* Un solo anuncio al cambiar, en vez de leer cada número. */}
        <p className="sr-only" role="status">
          {es
            ? `${gramos} gramos al mes. Plan sugerido: ${nivel.label_es}.`
            : `${gramos} grams a month. Suggested plan: ${nivel.label_en}.`}
        </p>

        <button
          type="button"
          onClick={() =>
            router.push({ pathname: "/checkout", query: { nivel: nivel.id, metodo: metodoId } })
          }
          className="w-full mt-6 bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
        >
          {es ? "Empezar con este plan" : "Start with this plan"}
        </button>
      </div>
    </div>
  );
}

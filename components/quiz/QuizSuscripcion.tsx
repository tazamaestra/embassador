"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/lib/nav";
import { QUIZ_GUARDADO, recomendar, type RespuestasQuiz } from "@/lib/quiz";
import { costoMensual } from "@/lib/suscripcion";
import { etiqueta, formatCOP } from "@/lib/format";
import { llamarApi } from "@/lib/pago";
import { useAuthStore } from "@/lib/auth-store";
import type { Catalogo, Locale } from "@/lib/types";

// Cinco preguntas, un clic cada una, y sale el plan. La lógica está en
// lib/quiz.ts (función pura) y las reglas en la base; aquí solo se pregunta.
// La recomendación se puede ajustar antes de ir a pagar.

type Pregunta = "metodo" | "leche" | "perfil" | "tazas" | "personas";
const PREGUNTAS: Pregunta[] = ["metodo", "leche", "perfil", "tazas", "personas"];

interface Opcion {
  valor: string;
  es: string;
  en: string;
  detalleEs?: string;
  detalleEn?: string;
}

export default function QuizSuscripcion({ locale, catalogo }: { locale: Locale; catalogo: Catalogo }) {
  const es = locale !== "en";
  const router = useRouter();
  const { user, init } = useAuthStore();
  const { quiz, planes, frecuencias, moliendas, perfiles, reglas } = catalogo;

  const [paso, setPaso] = useState(0);
  const [r, setR] = useState<Partial<RespuestasQuiz>>({});
  const [ajuste, setAjuste] = useState<{ planId: string; frecuenciaId: string; moliendaId: string; perfilId: string } | null>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (paso > 0) tituloRef.current?.focus();
  }, [paso]);

  const completo = paso >= PREGUNTAS.length;
  const respuestas = completo ? (r as RespuestasQuiz) : null;
  const recomendacion = respuestas ? recomendar(respuestas, quiz, planes, frecuencias) : null;

  // Al terminar, la recomendación arranca como selección y el cliente la ajusta.
  useEffect(() => {
    if (recomendacion && !ajuste) {
      setAjuste({
        planId: recomendacion.planId,
        frecuenciaId: recomendacion.frecuenciaId,
        moliendaId: recomendacion.moliendaId,
        perfilId: recomendacion.perfilId,
      });
    }
  }, [recomendacion, ajuste]);

  function responder(cambio: Partial<RespuestasQuiz>) {
    setR((previo) => ({ ...previo, ...cambio }));
    setAjuste(null);
    setPaso((p) => p + 1);
  }

  const preguntas: Record<Pregunta, { titulo: string; opciones: Opcion[]; elegir: (v: string) => void; actual?: string }> = {
    metodo: {
      titulo: es ? "¿Cómo preparas el café?" : "How do you brew your coffee?",
      opciones: quiz.metodos.map((m) => ({ valor: m.id, es: m.label_es, en: m.label_en })),
      elegir: (v) => responder({ metodoId: v }),
      actual: r.metodoId,
    },
    leche: {
      titulo: es ? "¿Lo tomas con leche?" : "Do you take it with milk?",
      opciones: [
        { valor: "si", es: "Sí, casi siempre", en: "Yes, usually" },
        { valor: "no", es: "No, negro", en: "No, black" },
      ],
      elegir: (v) => responder({ conLeche: v === "si" }),
      actual: r.conLeche === undefined ? undefined : r.conLeche ? "si" : "no",
    },
    perfil: {
      titulo: es ? "¿Qué sabor buscas?" : "What flavor are you after?",
      opciones: perfiles.map((p) => ({ valor: p.id, es: p.label_es, en: p.label_en, detalleEs: p.desc_es, detalleEn: p.desc_en })),
      elegir: (v) => responder({ perfilId: v }),
      actual: r.perfilId,
    },
    tazas: {
      titulo: es ? "¿Cuántas tazas al día, por persona?" : "How many cups a day, per person?",
      opciones: quiz.tazasOpciones.map((n, i, todas) => ({
        valor: String(n),
        es: i === todas.length - 1 ? `${n} o más` : String(n),
        en: i === todas.length - 1 ? `${n} or more` : String(n),
      })),
      elegir: (v) => responder({ tazasDia: Number(v) }),
      actual: r.tazasDia === undefined ? undefined : String(r.tazasDia),
    },
    personas: {
      titulo: es ? "¿Cuántas personas toman café en la casa?" : "How many coffee drinkers at home?",
      opciones: quiz.personasOpciones.map((n, i, todas) => ({
        valor: String(n),
        es: i === todas.length - 1 ? `${n} o más` : String(n),
        en: i === todas.length - 1 ? `${n} or more` : String(n),
      })),
      elegir: (v) => responder({ personas: Number(v) }),
      actual: r.personas === undefined ? undefined : String(r.personas),
    },
  };

  function suscribirme() {
    if (!respuestas || !ajuste) return;
    try {
      window.sessionStorage.setItem(QUIZ_GUARDADO, JSON.stringify(respuestas));
    } catch {
      // Sin almacenamiento el quiz no llega al perfil, pero la compra sigue.
    }
    // Con sesión, las respuestas van al perfil de una.
    if (user) void llamarApi("/api/quiz", { body: respuestas });
    // Los nombres son los que lee el checkout (?plan=&frecuencia=…).
    router.push({
      pathname: "/checkout",
      query: {
        plan: ajuste.planId,
        frecuencia: ajuste.frecuenciaId,
        molienda: ajuste.moliendaId,
        perfil: ajuste.perfilId,
      },
    });
  }

  const boton = (activo: boolean) =>
    `w-full text-left rounded-card border p-5 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
      activo ? "border-vino bg-white ring-2 ring-vino" : "border-borde bg-white hover:border-vino"
    }`;

  if (!completo) {
    const actual = PREGUNTAS[paso];
    const p = preguntas[actual];
    return (
      <div className="max-w-[600px] mx-auto">
        <p className="font-mono text-[11px] tracking-[.18em] text-tinta-suave uppercase mb-2">
          {es ? `Pregunta ${paso + 1} de ${PREGUNTAS.length}` : `Question ${paso + 1} of ${PREGUNTAS.length}`}
        </p>
        <div
          className="h-1.5 rounded-pill bg-borde overflow-hidden mb-8"
          role="progressbar"
          aria-valuenow={paso + 1}
          aria-valuemin={1}
          aria-valuemax={PREGUNTAS.length}
          aria-label={es ? "Avance del quiz" : "Quiz progress"}
        >
          <div className="h-full bg-vino rounded-pill origin-left transition-transform duration-300" style={{ transform: `scaleX(${(paso + 1) / PREGUNTAS.length})`, width: "100%" }} />
        </div>

        <h2 ref={tituloRef} tabIndex={-1} className="font-display font-bold text-tinta text-3xl mb-6 focus:outline-none">
          {p.titulo}
        </h2>
        <div role="radiogroup" aria-label={p.titulo} className="grid gap-3">
          {p.opciones.map((o) => (
            <button key={o.valor} type="button" role="radio" aria-checked={p.actual === o.valor} onClick={() => p.elegir(o.valor)} className={boton(p.actual === o.valor)}>
              <span className="font-display font-bold text-tinta text-xl block">{es ? o.es : o.en}</span>
              {(es ? o.detalleEs : o.detalleEn) && (
                <span className="font-body text-tinta-suave text-sm block mt-1">{es ? o.detalleEs : o.detalleEn}</span>
              )}
            </button>
          ))}
        </div>

        {paso > 0 && (
          <button type="button" onClick={() => setPaso((x) => x - 1)} className="mt-6 font-body text-sm text-tinta-suave underline hover:text-vino">
            {es ? "Volver a la pregunta anterior" : "Back to the previous question"}
          </button>
        )}
      </div>
    );
  }

  if (!recomendacion || !ajuste) return null;

  const plan = planes.find((p) => p.id === ajuste.planId) ?? planes[0];
  const frecuencia = frecuencias.find((f) => f.id === ajuste.frecuenciaId) ?? frecuencias[0];
  const ajustado =
    ajuste.planId !== recomendacion.planId || ajuste.frecuenciaId !== recomendacion.frecuenciaId ||
    ajuste.moliendaId !== recomendacion.moliendaId || ajuste.perfilId !== recomendacion.perfilId;

  const selector = (
    titulo: string,
    lista: { id: string; label_es: string; label_en: string }[],
    clave: keyof typeof ajuste
  ) => (
    <div>
      <p className="font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase mb-2">{titulo}</p>
      <div role="radiogroup" aria-label={titulo} className="flex flex-wrap gap-2">
        {lista.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={ajuste[clave] === o.id}
            onClick={() => setAjuste({ ...ajuste, [clave]: o.id })}
            className={`font-body font-600 text-sm px-4 py-2 rounded-pill border transition-colors ${
              ajuste[clave] === o.id ? "bg-vino text-crema-papel border-vino" : "bg-white text-tinta-cafe border-borde hover:border-vino"
            }`}
          >
            {es ? o.label_es : o.label_en}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-[640px] mx-auto" role="status">
      <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">{es ? "TU PLAN" : "YOUR PLAN"}</p>
      <h2 ref={tituloRef} tabIndex={-1} className="font-display font-bold text-tinta text-4xl mb-2 focus:outline-none">
        {es ? plan.label_es : plan.label_en}, {etiqueta(frecuencias, frecuencia.id, es).toLowerCase()}
      </h2>
      <p className="font-body text-tinta-suave text-base mb-6">
        {es
          ? `En la casa se van unos ${recomendacion.gramosDia} g de café al día. ${ajustado ? "Con tus ajustes" : "Este plan"} llegan ${Math.round((plan.bolsas * plan.gramosBolsa) / frecuencia.dias)} g al día.`
          : `Your household goes through about ${recomendacion.gramosDia} g of coffee a day. ${ajustado ? "With your changes" : "This plan"} delivers ${Math.round((plan.bolsas * plan.gramosBolsa) / frecuencia.dias)} g a day.`}
      </p>

      <div className="rounded-card-lg border border-borde bg-white p-6 space-y-5 mb-6">
        {selector(es ? "Plan" : "Plan", planes, "planId")}
        {selector(es ? "Cada cuánto" : "How often", frecuencias, "frecuenciaId")}
        {selector(es ? "Molienda" : "Grind", moliendas, "moliendaId")}
        {selector(es ? "Perfil" : "Profile", perfiles, "perfilId")}

        <div className="border-t border-borde pt-5 flex items-baseline justify-between">
          <span className="font-body text-tinta">{es ? "Por envío, con envío incluido" : "Per shipment, shipping included"}</span>
          <span className="font-display font-bold text-vino text-3xl">{formatCOP(plan.precioEnvioCop)}</span>
        </div>
        <p className="font-mono text-[11px] text-tinta-suave text-right -mt-3">
          {es ? `≈ ${formatCOP(costoMensual(plan, frecuencia, reglas))} al mes` : `≈ ${formatCOP(costoMensual(plan, frecuencia, reglas))} a month`}
        </p>
      </div>

      <button
        type="button"
        onClick={suscribirme}
        className="w-full bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3.5 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
      >
        {es ? "Suscribirme con esto" : "Subscribe with this"}
      </button>
      <div className="flex justify-between mt-4">
        <button type="button" onClick={() => { setPaso(0); setR({}); setAjuste(null); }} className="font-body text-sm text-tinta-suave underline hover:text-vino">
          {es ? "Empezar de nuevo" : "Start over"}
        </button>
        {ajustado && (
          <button type="button" onClick={() => setAjuste(null)} className="font-body text-sm text-tinta-suave underline hover:text-vino">
            {es ? "Volver a lo recomendado" : "Back to the recommendation"}
          </button>
        )}
      </div>
    </div>
  );
}

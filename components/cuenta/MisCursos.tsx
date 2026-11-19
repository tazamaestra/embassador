"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Circle, PlayCircle } from "@phosphor-icons/react";
import { llamarApi } from "@/lib/pago";
import ReproductorCurso from "@/components/cuenta/ReproductorCurso";
import { agruparPorModulo, urlMiniatura, type CursoCliente, type VideoCurso } from "@/lib/cursos";

// Los cursos en video del cliente, dentro de su cuenta, con el reproductor
// propio (ReproductorCurso): nada de YouTube a la vista. Un video se marca
// como visto al terminarlo, con «Siguiente» o a mano. El equipo ve el avance
// en su ficha.

function Progreso({ vistos, total, es, claro = false }: { vistos: number; total: number; es: boolean; claro?: boolean }) {
  const pct = total ? Math.round((vistos / total) * 100) : 0;
  return (
    <div>
      <div className={`h-1.5 rounded-pill overflow-hidden ${claro ? "bg-white/20" : "bg-borde"}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={es ? "Avance del curso" : "Course progress"}>
        <div className="h-full bg-naranja transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className={`font-mono text-[10px] tracking-[.14em] uppercase mt-1.5 ${claro ? "text-crema/70" : "text-tinta-suave"}`}>
        {pct === 100 ? (es ? "Curso completado" : "Course completed") : es ? `${vistos} de ${total} videos vistos` : `${vistos} of ${total} videos watched`}
      </p>
    </div>
  );
}

function Visor({ curso, es, onVolver, onMarcar }: {
  curso: CursoCliente;
  es: boolean;
  onVolver: () => void;
  onMarcar: (video: VideoCurso, visto: boolean) => void;
}) {
  const vistos = new Set(curso.vistos);
  const [actualId, setActualId] = useState(() => (curso.videos.find((v) => !vistos.has(v.id)) ?? curso.videos[0])?.id);
  const indice = curso.videos.findIndex((v) => v.id === actualId);
  const actual = curso.videos[indice];
  const siguiente = curso.videos[indice + 1];
  const visto = actual ? vistos.has(actual.id) : false;

  function ir(v: VideoCurso) {
    setActualId(v.id);
    requestAnimationFrame(() => document.getElementById("visor-curso")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  if (!actual) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={onVolver} className="font-body text-sm text-tinta-suave hover:text-vino">← {es ? "Todos los cursos" : "All courses"}</button>
        <p className="font-body text-tinta-suave">{es ? "Este curso todavía no tiene videos." : "This course has no videos yet."}</p>
      </div>
    );
  }

  return (
    <div id="visor-curso" className="scroll-mt-24 space-y-5 animate-[fadeUp_.25s_ease-out]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <button type="button" onClick={onVolver} className="font-body text-sm text-tinta-suave hover:text-vino mb-1">← {es ? "Todos los cursos" : "All courses"}</button>
          <h3 className="font-display font-bold text-tinta text-2xl leading-tight">{curso.titulo}</h3>
        </div>
        <div className="w-56"><Progreso vistos={curso.vistos.length} total={curso.videos.length} es={es} /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          <ReproductorCurso
            key={actual.id}
            youtubeId={actual.youtubeId}
            titulo={actual.titulo}
            miniatura={urlMiniatura(actual.youtubeId)}
            es={es}
            onTerminado={() => { if (!vistos.has(actual.id)) onMarcar(actual, true); }}
          />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[.16em] text-dorado uppercase mb-1">
                {es ? `Video ${indice + 1} de ${curso.videos.length}` : `Video ${indice + 1} of ${curso.videos.length}`}
                {actual.modulo ? ` · ${actual.modulo}` : ""}
              </p>
              <h4 className="font-display font-bold text-tinta text-xl leading-snug">{actual.titulo}</h4>
              {actual.descripcion && <p className="font-body text-sm text-tinta-suave mt-1 max-w-2xl whitespace-pre-line">{actual.descripcion}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onMarcar(actual, !visto)}
                aria-pressed={visto}
                className={`inline-flex items-center gap-1.5 font-body font-700 text-sm px-4 py-2 rounded-btn border transition-colors ${
                  visto ? "border-verde bg-verde-claro text-verde" : "border-borde-2 bg-white text-tinta-cafe hover:border-vino hover:text-vino"
                }`}
              >
                {visto ? <CheckCircle size={18} weight="fill" aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}
                {visto ? (es ? "Visto" : "Watched") : (es ? "Marcar como visto" : "Mark as watched")}
              </button>
              {siguiente && (
                <button
                  type="button"
                  onClick={() => { if (!visto) onMarcar(actual, true); ir(siguiente); }}
                  className="font-body font-700 text-sm px-4 py-2 rounded-btn bg-vino text-crema-papel hover:bg-vino-900"
                >
                  {es ? "Siguiente" : "Next"} →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Temario */}
        <nav aria-label={es ? "Temario del curso" : "Course outline"} className="rounded-card-lg border border-borde bg-white overflow-hidden lg:max-h-[640px] lg:overflow-y-auto">
          {agruparPorModulo(curso.videos).map((g, gi) => (
            <div key={`${g.modulo}-${gi}`}>
              {g.modulo && (
                <p className="sticky top-0 bg-arena/80 backdrop-blur px-4 py-2 font-mono text-[10px] tracking-[.16em] text-tinta-cafe uppercase border-b border-borde">
                  {g.modulo}
                </p>
              )}
              <ol>
                {g.videos.map((v) => {
                  const n = curso.videos.findIndex((x) => x.id === v.id) + 1;
                  const esActual = v.id === actual.id;
                  const yaVisto = vistos.has(v.id);
                  return (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => ir(v)}
                        aria-current={esActual ? "true" : undefined}
                        className={`w-full text-left flex items-start gap-3 px-4 py-2.5 border-b border-borde last:border-b-0 transition-colors ${esActual ? "bg-vino/5" : "hover:bg-arena/40"}`}
                      >
                        <span className={`mt-0.5 shrink-0 ${yaVisto ? "text-verde" : esActual ? "text-vino" : "text-tinta-suave/60"}`}>
                          {yaVisto ? <CheckCircle size={18} weight="fill" aria-label={es ? "Visto" : "Watched"} /> : esActual ? <PlayCircle size={18} weight="fill" aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}
                        </span>
                        <span className={`font-body text-sm leading-snug ${esActual ? "text-tinta font-700" : "text-tinta-cafe"}`}>
                          <span className="font-mono text-xs text-tinta-suave mr-1.5">{n}.</span>
                          {v.titulo}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default function MisCursos({ es }: { es: boolean }) {
  const [cursos, setCursos] = useState<CursoCliente[] | null>(null);
  const [error, setError] = useState(false);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);

  useEffect(() => {
    llamarApi<{ cursos: CursoCliente[] }>("/api/mi-cuenta/cursos").then((r) => {
      if (r.ok) setCursos(r.data.cursos);
      else {
        setCursos([]);
        setError(true);
      }
    });
  }, []);

  async function marcar(cursoId: string, video: VideoCurso, visto: boolean) {
    const aplicar = (v: boolean) =>
      setCursos((lista) =>
        (lista ?? []).map((c) =>
          c.id !== cursoId ? c : { ...c, vistos: v ? [...new Set([...c.vistos, video.id])] : c.vistos.filter((x) => x !== video.id) }
        )
      );
    aplicar(visto);
    const r = await llamarApi("/api/mi-cuenta/cursos", { body: { videoId: video.id, visto } });
    if (!r.ok) aplicar(!visto);
  }

  // Sin cursos para este cliente, la sección no aparece.
  if (cursos === null || (cursos.length === 0 && !error)) return null;

  const abierto = cursos.find((c) => c.id === abiertoId);

  return (
    <section id="cursos" className="scroll-mt-24 space-y-4">
      {abierto ? (
        <Visor curso={abierto} es={es} onVolver={() => setAbiertoId(null)} onMarcar={(v, visto) => marcar(abierto.id, v, visto)} />
      ) : (
        <>
          <div>
            <h2 className="font-display font-bold text-tinta text-2xl">{es ? "Tus cursos" : "Your courses"}</h2>
            <p className="font-body text-sm text-tinta-suave">
              {es ? "Aprende a tu ritmo con nuestro equipo. Tu avance queda guardado." : "Learn at your own pace with our team. Your progress is saved."}
            </p>
          </div>
          {error ? (
            <p className="font-body text-sm text-tinta-suave">{es ? "No pudimos cargar tus cursos. Intenta de nuevo en un momento." : "We couldn't load your courses. Try again in a moment."}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cursos.map((c) => {
                const portada = c.videos[0]?.youtubeId;
                const empezado = c.vistos.length > 0;
                const completo = c.videos.length > 0 && c.vistos.length === c.videos.length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setAbiertoId(c.id)}
                    className="group text-left rounded-card-lg border border-borde bg-white overflow-hidden shadow-card hover:-translate-y-0.5 hover:border-vino transition-all duration-200"
                  >
                    <div className="relative aspect-video bg-tinta">
                      {portada && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={urlMiniatura(portada)} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" loading="lazy" />
                      )}
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-14 h-14 rounded-full bg-naranja text-white flex items-center justify-center shadow-cta group-hover:scale-105 transition-transform">
                          <PlayCircle size={34} weight="fill" aria-hidden="true" />
                        </span>
                      </span>
                      <span className="absolute left-3 top-3 font-mono text-[10px] tracking-[.14em] uppercase bg-black/55 text-white px-2 py-1 rounded-pill">
                        {c.videos.length} {es ? "videos" : "videos"}
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="font-display font-bold text-tinta text-lg leading-snug">{c.titulo}</p>
                        {c.descripcion && <p className="font-body text-sm text-tinta-suave mt-1 line-clamp-3">{c.descripcion}</p>}
                      </div>
                      <Progreso vistos={c.vistos.length} total={c.videos.length} es={es} />
                      <span className="inline-block font-body font-700 text-sm text-vino group-hover:underline">
                        {completo ? (es ? "Repasar" : "Review") : empezado ? (es ? "Continuar" : "Continue") : (es ? "Empezar" : "Start")} →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

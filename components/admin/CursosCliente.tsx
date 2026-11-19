"use client";

import { useCallback, useEffect, useState } from "react";
import { llamarApi } from "@/lib/pago";
import type { CursoDeCliente } from "@/lib/cursos";

// En la ficha de un cliente: qué cursos ve, cuánto lleva y, en los cursos
// por elección, el interruptor para darle o quitarle acceso.

export default function CursosCliente({ clienteId, es }: { clienteId: string; es: boolean }) {
  const [cursos, setCursos] = useState<CursoDeCliente[] | null>(null);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await llamarApi<{ cursos: CursoDeCliente[] }>(`/api/admin/clientes/${clienteId}/cursos`);
    if (r.ok) setCursos(r.data.cursos);
    else {
      setCursos([]);
      setError(es ? "No se pudieron leer los cursos. ¿Ya corriste supabase/cursos.sql?" : "Couldn't read courses. Did you run supabase/cursos.sql?");
    }
  }, [clienteId, es]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function cambiar(c: CursoDeCliente) {
    setOcupado(c.id);
    const r = await llamarApi<{ cursos: CursoDeCliente[] }>(`/api/admin/clientes/${clienteId}/cursos`, {
      method: "PUT",
      body: { cursoId: c.id, elegido: !c.elegido },
    });
    setOcupado(null);
    if (r.ok) setCursos(r.data.cursos);
    else setError(es ? "No se pudo cambiar el acceso." : "Couldn't change access.");
  }

  if (cursos === null) return <p className="font-body text-sm text-tinta-suave">{es ? "Cargando…" : "Loading…"}</p>;
  if (cursos.length === 0) {
    return <p className="font-body text-sm text-tinta-suave">{error || (es ? "Todavía no hay cursos. Créalos en la pestaña Cursos." : "No courses yet. Create them in the Courses tab.")}</p>;
  }

  return (
    <div className="space-y-2">
      {error && <p role="alert" className="font-body text-sm text-vino">{error}</p>}
      <ul className="rounded-card border border-borde bg-white divide-y divide-borde">
        {cursos.map((c) => {
          const pct = c.totalVideos ? Math.round((c.vistos / c.totalVideos) * 100) : 0;
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-body font-700 text-sm text-tinta">{c.titulo}</p>
                <p className="font-body text-xs text-tinta-suave">
                  {!c.publicado
                    ? (es ? "Borrador: aún no lo ve nadie" : "Draft: nobody sees it yet")
                    : c.acceso === "todos"
                      ? (es ? "Abierto a todos los clientes" : "Open to all clients")
                      : (es ? "Solo clientes elegidos" : "Selected clients only")}
                </p>
              </div>
              {c.loVe && (
                <div className="w-40">
                  <div className="h-1.5 rounded-pill bg-borde overflow-hidden">
                    <div className="h-full bg-naranja" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="font-mono text-[10px] tracking-[.12em] uppercase text-tinta-suave mt-1">
                    {es ? `${c.vistos}/${c.totalVideos} vistos` : `${c.vistos}/${c.totalVideos} watched`}
                  </p>
                </div>
              )}
              {c.acceso === "seleccionados" ? (
                <label className="inline-flex items-center gap-2 font-body text-sm text-tinta cursor-pointer">
                  <input type="checkbox" className="accent-vino" checked={c.elegido} disabled={ocupado === c.id} onChange={() => cambiar(c)} />
                  {es ? "Tiene acceso" : "Has access"}
                </label>
              ) : (
                <span className={`font-mono text-[10px] tracking-[.14em] uppercase px-2 py-0.5 rounded-pill ${c.loVe ? "bg-verde-claro text-verde" : "bg-borde text-tinta-suave"}`}>
                  {c.loVe ? (es ? "Lo ve" : "Sees it") : (es ? "No lo ve" : "Hidden")}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

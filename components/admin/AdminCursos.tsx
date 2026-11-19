"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { llamarApi } from "@/lib/pago";
import { idYoutube, urlMiniatura, type AccesoCurso, type Curso, type CursoResumen } from "@/lib/cursos";
import { ENTRADA, ETIQUETA, mensajeError, type ClienteLista } from "@/components/admin/AdminClientes";

// Cursos en video para los clientes. Cada curso tiene videos de YouTube
// (no listados) agrupados por módulo, y se decide quién lo ve: todos los
// clientes o solo los elegidos. Se guarda el curso entero con un botón.

interface Borrador {
  id?: string;
  titulo: string;
  descripcion: string;
  publicado: boolean;
  acceso: AccesoCurso;
  videos: { clave: string; id?: string; modulo: string; titulo: string; descripcion: string; url: string }[];
  clientes: string[];
}

let contador = 0;
const nuevaClave = () => `v${++contador}`;

const VACIO: Borrador = { titulo: "", descripcion: "", publicado: false, acceso: "todos", videos: [], clientes: [] };

function aBorrador(c: Curso): Borrador {
  return {
    id: c.id,
    titulo: c.titulo,
    descripcion: c.descripcion,
    publicado: c.publicado,
    acceso: c.acceso,
    videos: c.videos.map((v) => ({ clave: nuevaClave(), id: v.id, modulo: v.modulo, titulo: v.titulo, descripcion: v.descripcion, url: `https://youtu.be/${v.youtubeId}` })),
    clientes: c.clientes,
  };
}

function errorCurso(error: string, campo: string | undefined, es: boolean, detalle?: string): string {
  if (error === "campo_invalido" && campo) {
    const m = /^videos\.(\d+)\.(\w+)$/.exec(campo);
    if (m) {
      const que: Record<string, [string, string]> = {
        url: ["el enlace de YouTube no es válido", "the YouTube link isn't valid"],
        titulo: ["falta el título", "the title is missing"],
        modulo: ["el módulo es muy largo", "the module name is too long"],
        descripcion: ["la descripción es muy larga", "the description is too long"],
      };
      return `${es ? "Video" : "Video"} ${m[1]}: ${(que[m[2]] ?? ["revísalo", "check it"])[es ? 0 : 1]}.`;
    }
    if (campo === "titulo") return es ? "Falta el título del curso." : "The course title is missing.";
  }
  if (error === "lectura" || detalle?.includes("cursos")) {
    return es ? "No se pudo leer la base. ¿Ya corriste supabase/cursos.sql?" : "Couldn't read the database. Did you run supabase/cursos.sql?";
  }
  return mensajeError(error, campo, es, detalle);
}

const BOTON_ICONO =
  "w-8 h-8 inline-flex items-center justify-center rounded-btn border border-borde bg-white text-tinta-suave hover:border-vino hover:text-vino disabled:opacity-30 disabled:hover:border-borde disabled:hover:text-tinta-suave";

export default function AdminCursos({ es }: { es: boolean }) {
  const [cursos, setCursos] = useState<CursoResumen[] | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [clientes, setClientes] = useState<ClienteLista[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const r = await llamarApi<{ cursos: CursoResumen[] }>("/api/admin/cursos");
    if (r.ok) {
      setCursos(r.data.cursos);
      setError("");
    } else {
      setCursos([]);
      setError(errorCurso(r.error, r.campo, es, r.mensaje));
    }
  }, [es]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // La lista de clientes solo hace falta para elegir quién ve un curso.
  useEffect(() => {
    if (borrador?.acceso !== "seleccionados" || clientes) return;
    llamarApi<{ clientes: ClienteLista[] }>("/api/admin/clientes").then((r) => setClientes(r.ok ? r.data.clientes : []));
  }, [borrador?.acceso, clientes]);

  async function abrir(id: string) {
    setAviso("");
    setError("");
    const r = await llamarApi<{ curso: Curso }>(`/api/admin/cursos/${id}`);
    if (!r.ok) return setError(errorCurso(r.error, r.campo, es, r.mensaje));
    setBorrador(aBorrador(r.data.curso));
  }

  function cambiar(cambio: Partial<Borrador>) {
    setBorrador((b) => (b ? { ...b, ...cambio } : b));
    setAviso("");
  }

  function cambiarVideo(clave: string, cambio: Partial<Borrador["videos"][number]>) {
    setBorrador((b) => (b ? { ...b, videos: b.videos.map((v) => (v.clave === clave ? { ...v, ...cambio } : v)) } : b));
    setAviso("");
  }

  function moverVideo(i: number, paso: -1 | 1) {
    setBorrador((b) => {
      if (!b) return b;
      const videos = [...b.videos];
      const j = i + paso;
      if (j < 0 || j >= videos.length) return b;
      [videos[i], videos[j]] = [videos[j], videos[i]];
      return { ...b, videos };
    });
    setAviso("");
  }

  function agregarVideo() {
    setBorrador((b) =>
      b ? { ...b, videos: [...b.videos, { clave: nuevaClave(), modulo: b.videos[b.videos.length - 1]?.modulo ?? "", titulo: "", descripcion: "", url: "" }] } : b
    );
  }

  function quitarVideo(clave: string) {
    const v = borrador?.videos.find((x) => x.clave === clave);
    if (v?.id && !window.confirm(es ? `¿Quitar "${v.titulo}"? Se pierde el avance de los clientes en ese video.` : `Remove "${v.titulo}"? Client progress on it will be lost.`)) return;
    setBorrador((b) => (b ? { ...b, videos: b.videos.filter((x) => x.clave !== clave) } : b));
  }

  async function guardar() {
    if (!borrador) return;
    setOcupado(true);
    const cuerpo = {
      titulo: borrador.titulo,
      descripcion: borrador.descripcion,
      publicado: borrador.publicado,
      acceso: borrador.acceso,
      videos: borrador.videos.map(({ id, modulo, titulo, descripcion, url }) => ({ id, modulo, titulo, descripcion, url })),
      clientes: borrador.clientes,
    };
    const r = borrador.id
      ? await llamarApi<{ curso: Curso }>(`/api/admin/cursos/${borrador.id}`, { method: "PUT", body: cuerpo })
      : await llamarApi<{ curso: Curso }>("/api/admin/cursos", { body: cuerpo });
    setOcupado(false);
    if (!r.ok) return setError(errorCurso(r.error, r.campo, es, r.mensaje));
    setError("");
    setBorrador(aBorrador(r.data.curso));
    setAviso(es ? "Curso guardado." : "Course saved.");
    await cargar();
  }

  async function borrar() {
    if (!borrador?.id) return;
    if (!window.confirm(es ? `¿Borrar el curso "${borrador.titulo}" con todos sus videos y el avance de los clientes?` : `Delete "${borrador.titulo}" with all its videos and client progress?`)) return;
    setOcupado(true);
    const r = await llamarApi(`/api/admin/cursos/${borrador.id}`, { method: "DELETE" });
    setOcupado(false);
    if (!r.ok) return setError(errorCurso(r.error, r.campo, es, r.mensaje));
    setBorrador(null);
    await cargar();
  }

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (clientes ?? []).filter(
      (c) => !q || [c.nombre, c.negocio, c.email, c.documento ?? ""].some((v) => v.toLowerCase().includes(q))
    );
  }, [clientes, busqueda]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-tinta text-2xl">{es ? "Cursos" : "Courses"}</h2>
          <p className="font-body text-sm text-tinta-suave max-w-2xl">
            {es
              ? "Videos de YouTube en modo «No listado». Los clientes los ven dentro de su cuenta; el enlace no aparece en ninguna página pública."
              : "YouTube videos set to “Unlisted”. Clients watch them inside their account; links never appear on a public page."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setBorrador({ ...VACIO }); setAviso(""); setError(""); }}
          className="font-body font-700 text-sm px-4 py-2 rounded-btn bg-vino text-crema-papel hover:bg-vino-900"
        >
          + {es ? "Nuevo curso" : "New course"}
        </button>
      </div>

      {error && <p role="alert" className="font-body text-sm text-vino">{error}</p>}

      {/* Lista de cursos */}
      {cursos === null ? (
        <p className="font-body text-sm text-tinta-suave">{es ? "Cargando…" : "Loading…"}</p>
      ) : cursos.length === 0 && !borrador ? (
        <p className="font-body text-sm text-tinta-suave">{es ? "Todavía no hay cursos." : "No courses yet."}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {cursos.map((c) => {
            const activo = borrador?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => abrir(c.id)}
                aria-pressed={activo}
                className={`text-left rounded-card border p-4 bg-white transition-colors ${activo ? "border-vino ring-2 ring-vino/15" : "border-borde hover:border-vino"}`}
              >
                <span className="flex items-center gap-2 mb-1.5">
                  <span className={`font-mono text-[10px] tracking-[.14em] uppercase px-2 py-0.5 rounded-pill ${c.publicado ? "bg-verde-claro text-verde" : "bg-borde text-tinta-suave"}`}>
                    {c.publicado ? (es ? "Publicado" : "Published") : (es ? "Borrador" : "Draft")}
                  </span>
                  <span className="font-mono text-[10px] tracking-[.14em] uppercase text-tinta-suave">
                    {c.acceso === "todos" ? (es ? "Todos los clientes" : "All clients") : (es ? `${c.clientes} elegidos` : `${c.clientes} selected`)}
                  </span>
                </span>
                <span className="block font-display font-bold text-tinta text-lg leading-snug">{c.titulo}</span>
                <span className="block font-body text-sm text-tinta-suave">{c.videos} {es ? "videos" : "videos"}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Editor */}
      {borrador && (
        <div className="rounded-card-lg border border-borde bg-fondo p-5 md:p-7 space-y-7 animate-[fadeUp_.25s_ease-out]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display font-bold text-tinta text-2xl">{borrador.id ? (es ? "Editar curso" : "Edit course") : (es ? "Nuevo curso" : "New course")}</h3>
            <button type="button" onClick={() => setBorrador(null)} className="font-body text-sm text-tinta-suave hover:text-tinta">
              {es ? "Cerrar" : "Close"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={ETIQUETA} htmlFor="curso-titulo">{es ? "Título" : "Title"}</label>
              <input id="curso-titulo" className={ENTRADA} value={borrador.titulo} maxLength={120} onChange={(e) => cambiar({ titulo: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className={ETIQUETA} htmlFor="curso-descripcion">{es ? "Descripción (la ve el cliente)" : "Description (clients see it)"}</label>
              <textarea id="curso-descripcion" rows={2} className={`${ENTRADA} resize-y`} value={borrador.descripcion} maxLength={2000} onChange={(e) => cambiar({ descripcion: e.target.value })} />
            </div>
          </div>

          {/* Publicación y acceso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 rounded-card border border-borde bg-white p-4 cursor-pointer">
              <input type="checkbox" className="mt-1 accent-vino" checked={borrador.publicado} onChange={(e) => cambiar({ publicado: e.target.checked })} />
              <span>
                <span className="block font-body font-700 text-sm text-tinta">{es ? "Publicado" : "Published"}</span>
                <span className="block font-body text-xs text-tinta-suave">
                  {es ? "Sin marcar, nadie lo ve todavía: sirve para armarlo con calma." : "Unchecked, nobody sees it yet: build it at your own pace."}
                </span>
              </span>
            </label>
            <fieldset className="rounded-card border border-borde bg-white p-4">
              <legend className={`${ETIQUETA} px-1`}>{es ? "¿Quién lo ve?" : "Who sees it?"}</legend>
              {(["todos", "seleccionados"] as const).map((a) => (
                <label key={a} className="flex items-center gap-2 font-body text-sm text-tinta py-0.5 cursor-pointer">
                  <input type="radio" name="curso-acceso" className="accent-vino" checked={borrador.acceso === a} onChange={() => cambiar({ acceso: a })} />
                  {a === "todos" ? (es ? "Todos los clientes" : "All clients") : (es ? "Solo los clientes que elija" : "Only clients I pick")}
                </label>
              ))}
            </fieldset>
          </div>

          {borrador.acceso === "seleccionados" && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className={ETIQUETA}>{es ? `Clientes elegidos (${borrador.clientes.length})` : `Selected clients (${borrador.clientes.length})`}</p>
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={es ? "Buscar cliente…" : "Search client…"}
                  aria-label={es ? "Buscar cliente" : "Search client"}
                  className={`${ENTRADA} w-60`}
                />
              </div>
              {clientes === null ? (
                <p className="font-body text-sm text-tinta-suave">{es ? "Cargando clientes…" : "Loading clients…"}</p>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-card border border-borde bg-white divide-y divide-borde">
                  {clientesFiltrados.length === 0 && <p className="p-3 font-body text-sm text-tinta-suave">{es ? "Sin resultados." : "No results."}</p>}
                  {clientesFiltrados.map((c) => {
                    const marcado = borrador.clientes.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-arena/40">
                        <input
                          type="checkbox"
                          className="accent-vino"
                          checked={marcado}
                          onChange={() => cambiar({ clientes: marcado ? borrador.clientes.filter((x) => x !== c.id) : [...borrador.clientes, c.id] })}
                        />
                        <span className="font-body text-sm text-tinta">
                          <span className="font-700">{c.negocio || c.nombre || c.email}</span>
                          <span className="text-tinta-suave">{[c.negocio ? c.nombre : "", c.documento ?? ""].filter(Boolean).map((x) => ` · ${x}`).join("")}</span>
                        </span>
                        {!c.activo && <span className="ml-auto font-mono text-[10px] uppercase text-tinta-suave">{es ? "inactivo" : "inactive"}</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Videos */}
          <section className="space-y-3">
            <p className={ETIQUETA}>{es ? `Videos en orden (${borrador.videos.length})` : `Videos in order (${borrador.videos.length})`}</p>
            <p className="font-body text-xs text-tinta-suave -mt-2">
              {es
                ? "Los videos seguidos con el mismo módulo se muestran juntos. Pega el enlace de «Compartir» de YouTube."
                : "Consecutive videos with the same module are grouped. Paste YouTube's “Share” link."}
            </p>
            <ol className="space-y-3">
              {borrador.videos.map((v, i) => {
                const id = idYoutube(v.url);
                return (
                  <li key={v.clave} className="rounded-card border border-borde bg-white p-3 grid grid-cols-[auto_1fr] md:grid-cols-[auto_120px_1fr_auto] gap-3 items-start">
                    <span className="font-mono text-sm text-tinta-suave w-6 pt-2 text-right">{i + 1}</span>
                    <div className="hidden md:block w-[120px] aspect-video rounded-input overflow-hidden bg-arena/60">
                      {id && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={urlMiniatura(id)} alt="" className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className="col-start-2 md:col-start-auto grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                      <input aria-label={es ? `Módulo del video ${i + 1}` : `Video ${i + 1} module`} placeholder={es ? "Módulo" : "Module"} className={ENTRADA} value={v.modulo} maxLength={80} onChange={(e) => cambiarVideo(v.clave, { modulo: e.target.value })} />
                      <input aria-label={es ? `Título del video ${i + 1}` : `Video ${i + 1} title`} placeholder={es ? "Título" : "Title"} className={ENTRADA} value={v.titulo} maxLength={150} onChange={(e) => cambiarVideo(v.clave, { titulo: e.target.value })} />
                      <input
                        aria-label={es ? `Enlace de YouTube del video ${i + 1}` : `Video ${i + 1} YouTube link`}
                        placeholder="https://youtu.be/…"
                        className={`${ENTRADA} sm:col-span-2 ${v.url && !id ? "border-vino" : ""}`}
                        value={v.url}
                        onChange={(e) => cambiarVideo(v.clave, { url: e.target.value })}
                      />
                      {v.url && !id && <p className="sm:col-span-2 font-body text-xs text-vino">{es ? "Ese enlace no parece de YouTube." : "That doesn't look like a YouTube link."}</p>}
                      <textarea
                        aria-label={es ? `Descripción del video ${i + 1}` : `Video ${i + 1} description`}
                        placeholder={es ? "Descripción (opcional)" : "Description (optional)"}
                        rows={1}
                        className={`${ENTRADA} sm:col-span-2 resize-y`}
                        value={v.descripcion}
                        maxLength={1000}
                        onChange={(e) => cambiarVideo(v.clave, { descripcion: e.target.value })}
                      />
                    </div>
                    <div className="col-start-2 md:col-start-auto flex md:flex-col gap-1.5">
                      <button type="button" className={BOTON_ICONO} disabled={i === 0} onClick={() => moverVideo(i, -1)} aria-label={es ? "Subir" : "Move up"}>↑</button>
                      <button type="button" className={BOTON_ICONO} disabled={i === borrador.videos.length - 1} onClick={() => moverVideo(i, 1)} aria-label={es ? "Bajar" : "Move down"}>↓</button>
                      <button type="button" className={BOTON_ICONO} onClick={() => quitarVideo(v.clave)} aria-label={es ? "Quitar video" : "Remove video"}>✕</button>
                    </div>
                  </li>
                );
              })}
            </ol>
            <button type="button" onClick={agregarVideo} className="font-body font-700 text-sm px-4 py-2 rounded-btn border border-dashed border-borde-2 text-tinta-cafe hover:border-vino hover:text-vino w-full">
              + {es ? "Agregar video" : "Add video"}
            </button>
          </section>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-borde">
            <button type="button" onClick={guardar} disabled={ocupado} className="font-body font-700 text-sm px-5 py-2.5 rounded-btn bg-vino text-crema-papel hover:bg-vino-900 disabled:opacity-60">
              {ocupado ? (es ? "Guardando…" : "Saving…") : (es ? "Guardar curso" : "Save course")}
            </button>
            {aviso && <p role="status" className="font-body text-sm text-verde">{aviso}</p>}
            {borrador.id && (
              <button type="button" onClick={borrar} disabled={ocupado} className="ml-auto font-body text-sm text-tinta-suave hover:text-vino">
                {es ? "Borrar curso" : "Delete course"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

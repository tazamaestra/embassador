// Cursos: lectura y guardado en la base. SOLO SERVIDOR (service key).
// Quién ve qué se decide aquí, nunca en el navegador.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aCurso, aVideo, clienteVeCurso,
  type Curso, type CursoCliente, type CursoDeCliente, type CursoResumen, type DatosCurso,
} from "@/lib/cursos";

/** Lista del panel, con cuántos videos y clientes elegidos tiene cada curso. */
export async function listarCursos(db: SupabaseClient): Promise<CursoResumen[]> {
  const [{ data: cursos, error }, { data: videos }, { data: accesos }] = await Promise.all([
    db.from("cursos").select("*").order("creado_en", { ascending: true }),
    db.from("curso_videos").select("curso_id"),
    db.from("curso_accesos").select("curso_id"),
  ]);
  if (error) throw error;
  const contar = (filas: { curso_id: string }[] | null) => {
    const m = new Map<string, number>();
    for (const f of filas ?? []) m.set(f.curso_id, (m.get(f.curso_id) ?? 0) + 1);
    return m;
  };
  const nVideos = contar(videos);
  const nClientes = contar(accesos);
  return (cursos ?? []).map((f) => {
    const c = aCurso(f);
    return { id: c.id, titulo: c.titulo, publicado: c.publicado, acceso: c.acceso, videos: nVideos.get(c.id) ?? 0, clientes: nClientes.get(c.id) ?? 0 };
  });
}

export async function leerCurso(db: SupabaseClient, id: string): Promise<Curso | null> {
  const [{ data: fila }, { data: videos }, { data: accesos }] = await Promise.all([
    db.from("cursos").select("*").eq("id", id).maybeSingle(),
    db.from("curso_videos").select("*").eq("curso_id", id).order("orden"),
    db.from("curso_accesos").select("cliente_id").eq("curso_id", id),
  ]);
  if (!fila) return null;
  return aCurso(fila, (videos ?? []).map(aVideo), (accesos ?? []).map((a) => a.cliente_id));
}

/**
 * Guarda un curso entero: datos, videos (en el orden recibido) y clientes
 * elegidos. Los videos que llegan con su id se conservan, y con ellos el
 * avance de los clientes; los que ya no vienen se borran.
 */
export async function guardarCurso(db: SupabaseClient, datos: DatosCurso, id?: string): Promise<string> {
  const fila = {
    titulo: datos.titulo,
    descripcion: datos.descripcion,
    publicado: datos.publicado,
    acceso: datos.acceso,
    actualizado_en: new Date().toISOString(),
  };
  let cursoId = id;
  if (cursoId) {
    const { error } = await db.from("cursos").update(fila).eq("id", cursoId);
    if (error) throw error;
  } else {
    const { data, error } = await db.from("cursos").insert(fila).select("id").single();
    if (error) throw error;
    cursoId = data.id as string;
  }

  // Videos: solo se respetan los ids que ya son de este curso.
  const { data: actuales } = await db.from("curso_videos").select("id").eq("curso_id", cursoId);
  const existentes = new Set((actuales ?? []).map((v) => v.id as string));
  const filas = datos.videos.map((v, i) => ({
    id: v.id && existentes.has(v.id) ? v.id : crypto.randomUUID(),
    curso_id: cursoId,
    orden: i + 1,
    modulo: v.modulo,
    titulo: v.titulo,
    descripcion: v.descripcion,
    youtube_id: v.youtubeId,
  }));
  const quedan = new Set(filas.map((f) => f.id));
  const sobran = [...existentes].filter((v) => !quedan.has(v));
  if (sobran.length > 0) {
    const { error } = await db.from("curso_videos").delete().in("id", sobran);
    if (error) throw error;
  }
  if (filas.length > 0) {
    const { error } = await db.from("curso_videos").upsert(filas, { onConflict: "id" });
    if (error) throw error;
  }

  // Clientes elegidos: se reemplaza la lista.
  const { error: errorBorrar } = await db.from("curso_accesos").delete().eq("curso_id", cursoId);
  if (errorBorrar) throw errorBorrar;
  if (datos.clientes.length > 0) {
    const { error } = await db
      .from("curso_accesos")
      .insert(datos.clientes.map((cliente_id) => ({ curso_id: cursoId, cliente_id })));
    if (error) throw error;
  }
  return cursoId;
}

/** Cursos que el cliente ve en su cuenta, con videos y su avance. */
export async function cursosParaCliente(db: SupabaseClient, clienteId: string): Promise<CursoCliente[]> {
  const [{ data: cursos, error }, { data: accesos }] = await Promise.all([
    db.from("cursos").select("*").eq("publicado", true).order("creado_en", { ascending: true }),
    db.from("curso_accesos").select("curso_id").eq("cliente_id", clienteId),
  ]);
  if (error) throw error;
  const elegidos = new Set((accesos ?? []).map((a) => a.curso_id as string));
  const visibles = (cursos ?? []).map((f) => aCurso(f)).filter((c) => clienteVeCurso(c, elegidos.has(c.id)));
  if (visibles.length === 0) return [];

  const { data: videos } = await db
    .from("curso_videos")
    .select("*")
    .in("curso_id", visibles.map((c) => c.id))
    .order("orden");
  const todos = (videos ?? []).map((f) => ({ cursoId: f.curso_id as string, video: aVideo(f) }));
  const ids = todos.map((t) => t.video.id);
  const { data: progreso } = ids.length
    ? await db.from("curso_progreso").select("video_id").eq("cliente_id", clienteId).in("video_id", ids)
    : { data: [] };
  const vistos = new Set((progreso ?? []).map((p) => p.video_id as string));

  return visibles.map((c) => {
    const propios = todos.filter((t) => t.cursoId === c.id).map((t) => t.video);
    return {
      id: c.id,
      titulo: c.titulo,
      descripcion: c.descripcion,
      videos: propios,
      vistos: propios.filter((v) => vistos.has(v.id)).map((v) => v.id),
    };
  });
}

/** ¿Este video es de un curso que el cliente puede ver? */
export async function clientePuedeVerVideo(db: SupabaseClient, clienteId: string, videoId: string): Promise<boolean> {
  const { data: video } = await db.from("curso_videos").select("curso_id").eq("id", videoId).maybeSingle();
  if (!video) return false;
  const [{ data: curso }, { data: acceso }] = await Promise.all([
    db.from("cursos").select("publicado, acceso").eq("id", video.curso_id).maybeSingle(),
    db.from("curso_accesos").select("cliente_id").eq("curso_id", video.curso_id).eq("cliente_id", clienteId).maybeSingle(),
  ]);
  return Boolean(curso) && clienteVeCurso(aCurso({ ...curso, id: video.curso_id }), Boolean(acceso));
}

/** Todos los cursos, vistos desde la ficha de un cliente en el panel. */
export async function cursosDeCliente(db: SupabaseClient, clienteId: string): Promise<CursoDeCliente[]> {
  const [{ data: cursos, error }, { data: accesos }, { data: videos }, { data: progreso }] = await Promise.all([
    db.from("cursos").select("*").order("creado_en", { ascending: true }),
    db.from("curso_accesos").select("curso_id").eq("cliente_id", clienteId),
    db.from("curso_videos").select("id, curso_id"),
    db.from("curso_progreso").select("video_id").eq("cliente_id", clienteId),
  ]);
  if (error) throw error;
  const elegidos = new Set((accesos ?? []).map((a) => a.curso_id as string));
  const vistos = new Set((progreso ?? []).map((p) => p.video_id as string));
  return (cursos ?? []).map((f) => {
    const c = aCurso(f);
    const propios = (videos ?? []).filter((v) => v.curso_id === c.id);
    const elegido = elegidos.has(c.id);
    return {
      id: c.id,
      titulo: c.titulo,
      publicado: c.publicado,
      acceso: c.acceso,
      elegido,
      loVe: clienteVeCurso(c, elegido),
      totalVideos: propios.length,
      vistos: propios.filter((v) => vistos.has(v.id as string)).length,
    };
  });
}

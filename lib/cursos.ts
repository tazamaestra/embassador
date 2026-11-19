// Cursos en video para los clientes. Funciones puras: tipos, lectura de
// filas y validación de lo que manda el panel. Los videos son de YouTube
// (no listados); aquí solo se guarda su id de 11 caracteres.

export type AccesoCurso = "todos" | "seleccionados";

export interface VideoCurso {
  id: string;
  orden: number;
  modulo: string;
  titulo: string;
  descripcion: string;
  youtubeId: string;
}

/** Un curso completo, como lo edita el panel. */
export interface Curso {
  id: string;
  titulo: string;
  descripcion: string;
  publicado: boolean;
  acceso: AccesoCurso;
  creadoEn: string;
  videos: VideoCurso[];
  /** Clientes elegidos (cuenta solo si acceso = "seleccionados"). */
  clientes: string[];
}

/** Fila de la lista de cursos del panel. */
export interface CursoResumen {
  id: string;
  titulo: string;
  publicado: boolean;
  acceso: AccesoCurso;
  videos: number;
  clientes: number;
}

/** Un curso como lo ve el cliente, con su avance. */
export interface CursoCliente {
  id: string;
  titulo: string;
  descripcion: string;
  videos: VideoCurso[];
  /** Ids de los videos que ya marcó como vistos. */
  vistos: string[];
}

/** Un curso en la ficha de un cliente (panel). */
export interface CursoDeCliente {
  id: string;
  titulo: string;
  publicado: boolean;
  acceso: AccesoCurso;
  /** Está en la lista de elegidos del curso. */
  elegido: boolean;
  /** Lo ve hoy en su cuenta (publicado y, si es por elección, elegido). */
  loVe: boolean;
  totalVideos: number;
  vistos: number;
}

export const ACCESOS: AccesoCurso[] = ["todos", "seleccionados"];

export class CursoInvalido extends Error {
  constructor(public campo: string) {
    super(campo);
    this.name = "CursoInvalido";
  }
}

const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * El id de un video de YouTube desde cualquier enlace: youtu.be/ID,
 * youtube.com/watch?v=ID, /embed/ID, /shorts/ID, /live/ID, o el id solo.
 * null si no se reconoce.
 */
export function idYoutube(entrada: string): string | null {
  const s = entrada.trim();
  if (ID_YOUTUBE.test(s)) return s;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v");
    if (!id) {
      const [, tipo, valor] = url.pathname.split("/");
      if (["embed", "shorts", "live", "v"].includes(tipo)) id = valor ?? null;
    }
  }
  return id && ID_YOUTUBE.test(id) ? id : null;
}

export const urlMiniatura = (youtubeId: string) => `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

// ── Filas de la base ───────────────────────────────────────

const texto = (v: unknown) => (typeof v === "string" ? v : "");

export function aVideo(f: Record<string, unknown>): VideoCurso {
  return {
    id: String(f.id),
    orden: Number(f.orden ?? 0),
    modulo: texto(f.modulo),
    titulo: texto(f.titulo),
    descripcion: texto(f.descripcion),
    youtubeId: texto(f.youtube_id),
  };
}

export function aCurso(f: Record<string, unknown>, videos: VideoCurso[] = [], clientes: string[] = []): Curso {
  return {
    id: String(f.id),
    titulo: texto(f.titulo),
    descripcion: texto(f.descripcion),
    publicado: f.publicado === true,
    acceso: f.acceso === "seleccionados" ? "seleccionados" : "todos",
    creadoEn: texto(f.creado_en),
    videos: [...videos].sort((a, b) => a.orden - b.orden),
    clientes,
  };
}

/** Módulos en orden de aparición, cada uno con sus videos. */
export function agruparPorModulo(videos: VideoCurso[]): { modulo: string; videos: VideoCurso[] }[] {
  const grupos: { modulo: string; videos: VideoCurso[] }[] = [];
  for (const v of [...videos].sort((a, b) => a.orden - b.orden)) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.modulo === v.modulo) ultimo.videos.push(v);
    else grupos.push({ modulo: v.modulo, videos: [v] });
  }
  return grupos;
}

// ── Validación de lo que manda el panel ────────────────────

export interface DatosVideo {
  /** Id existente para conservar el avance de los clientes; vacío si es nuevo. */
  id?: string;
  modulo: string;
  titulo: string;
  descripcion: string;
  youtubeId: string;
}

export interface DatosCurso {
  titulo: string;
  descripcion: string;
  publicado: boolean;
  acceso: AccesoCurso;
  videos: DatosVideo[];
  clientes: string[];
}

const MAX_VIDEOS = 200;
const MAX_CLIENTES = 2000;

function limpio(v: unknown, max: number, campo: string, requerido = false): string {
  const s = typeof v === "string" ? v.trim() : "";
  if ((requerido && !s) || s.length > max) throw new CursoInvalido(campo);
  return s;
}

/** Lanza CursoInvalido con el campo malo (ej. "videos.3.url"). */
export function validarCurso(crudo: unknown): DatosCurso {
  const r = (crudo ?? {}) as Record<string, unknown>;
  const acceso = r.acceso ?? "todos";
  if (!ACCESOS.includes(acceso as AccesoCurso)) throw new CursoInvalido("acceso");

  const videosCrudos = r.videos ?? [];
  if (!Array.isArray(videosCrudos) || videosCrudos.length > MAX_VIDEOS) throw new CursoInvalido("videos");
  const videos = videosCrudos.map((x, i): DatosVideo => {
    const v = (x ?? {}) as Record<string, unknown>;
    const youtubeId = idYoutube(typeof v.url === "string" ? v.url : typeof v.youtubeId === "string" ? v.youtubeId : "");
    if (!youtubeId) throw new CursoInvalido(`videos.${i + 1}.url`);
    return {
      id: typeof v.id === "string" && UUID.test(v.id) ? v.id : undefined,
      modulo: limpio(v.modulo, 80, `videos.${i + 1}.modulo`),
      titulo: limpio(v.titulo, 150, `videos.${i + 1}.titulo`, true),
      descripcion: limpio(v.descripcion, 1000, `videos.${i + 1}.descripcion`),
      youtubeId,
    };
  });

  const clientesCrudos = r.clientes ?? [];
  if (!Array.isArray(clientesCrudos) || clientesCrudos.length > MAX_CLIENTES) throw new CursoInvalido("clientes");
  const clientes = [...new Set(clientesCrudos.filter((c): c is string => typeof c === "string" && UUID.test(c)))];

  return {
    titulo: limpio(r.titulo, 120, "titulo", true),
    descripcion: limpio(r.descripcion, 2000, "descripcion"),
    publicado: r.publicado === true,
    acceso: acceso as AccesoCurso,
    videos,
    clientes,
  };
}

/** ¿Lo ve este cliente? Publicado y, si es por elección, elegido. */
export function clienteVeCurso(curso: { publicado: boolean; acceso: AccesoCurso }, elegido: boolean): boolean {
  return curso.publicado && (curso.acceso === "todos" || elegido);
}

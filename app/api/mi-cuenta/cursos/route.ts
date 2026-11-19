// Los cursos del cliente, con sus videos y su avance.
//
//   GET  /api/mi-cuenta/cursos
//   POST /api/mi-cuenta/cursos   { videoId, visto: boolean }  Marca o desmarca un video
//
// Solo devuelve cursos publicados que el cliente puede ver; los ids de
// YouTube no salen de aquí para nadie más.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { leerSesion, respuestaError } from "@/lib/servidor/sesion";
import { clientePuedeVerVideo, cursosParaCliente } from "@/lib/servidor/cursos";

export const dynamic = "force-dynamic";

async function clienteActivo(request: Request) {
  const sesion = await leerSesion(request);
  if (!sesion) return respuestaError("sin_sesion", 401);
  const db = crearClienteAdmin();
  const { data: fila } = await db.from("clientes").select("id, activo").eq("id", sesion.id).maybeSingle();
  if (!fila) return respuestaError("sin_ficha", 404);
  if (!fila.activo) return respuestaError("inactivo", 403);
  return { db, clienteId: fila.id as string };
}

export async function GET(request: Request) {
  const c = await clienteActivo(request);
  if (c instanceof Response) return c;
  try {
    return NextResponse.json({ cursos: await cursosParaCliente(c.db, c.clienteId) });
  } catch (e) {
    return respuestaError("lectura", 500, { mensaje: (e as { message?: string }).message });
  }
}

export async function POST(request: Request) {
  const c = await clienteActivo(request);
  if (c instanceof Response) return c;

  const cuerpo = ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  if (typeof cuerpo.videoId !== "string" || typeof cuerpo.visto !== "boolean") return respuestaError("cuerpo_invalido", 400);
  if (!(await clientePuedeVerVideo(c.db, c.clienteId, cuerpo.videoId))) return respuestaError("no_encontrado", 404);

  const { error } = cuerpo.visto
    ? await c.db.from("curso_progreso").upsert({ cliente_id: c.clienteId, video_id: cuerpo.videoId }, { onConflict: "cliente_id,video_id" })
    : await c.db.from("curso_progreso").delete().eq("cliente_id", c.clienteId).eq("video_id", cuerpo.videoId);
  if (error) return respuestaError("no_guardado", 500, { mensaje: error.message });
  return NextResponse.json({ ok: true });
}

// Panel del equipo: un curso.
//
//   GET    /api/admin/cursos/:id   Curso con videos y clientes elegidos
//   PUT    /api/admin/cursos/:id   Guarda el curso entero (misma forma que el POST)
//   DELETE /api/admin/cursos/:id   Borra el curso, sus videos y el avance

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { exigirAdmin, respuestaError } from "@/lib/servidor/sesion";
import { CursoInvalido, validarCurso } from "@/lib/cursos";
import { guardarCurso, leerCurso } from "@/lib/servidor/cursos";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;

  const curso = await leerCurso(crearClienteAdmin(), id);
  if (!curso) return respuestaError("no_encontrado", 404);
  return NextResponse.json({ curso });
}

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;

  let datos;
  try {
    datos = validarCurso(await request.json().catch(() => null));
  } catch (e) {
    if (e instanceof CursoInvalido) return respuestaError("campo_invalido", 400, { campo: e.campo });
    throw e;
  }

  const db = crearClienteAdmin();
  const { data: existe } = await db.from("cursos").select("id").eq("id", id).maybeSingle();
  if (!existe) return respuestaError("no_encontrado", 404);
  try {
    await guardarCurso(db, datos, id);
    return NextResponse.json({ curso: await leerCurso(db, id) });
  } catch (e) {
    return respuestaError("no_guardado", 500, { mensaje: (e as { message?: string }).message });
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;

  const { data, error } = await crearClienteAdmin().from("cursos").delete().eq("id", id).select("id");
  if (error) return respuestaError("no_borrado", 500, { mensaje: error.message });
  if (!data || data.length === 0) return respuestaError("no_encontrado", 404);
  return NextResponse.json({ ok: true });
}

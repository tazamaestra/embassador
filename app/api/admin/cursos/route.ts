// Panel del equipo: cursos en video.
//
//   GET  /api/admin/cursos   Lista
//   POST /api/admin/cursos   Crea { titulo, descripcion?, publicado?, acceso?, videos?, clientes? }
//
// `videos`: [{ id?, modulo, titulo, descripcion?, url }] en orden. `url` es
// cualquier enlace de YouTube (o el id solo).

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { exigirAdmin, respuestaError } from "@/lib/servidor/sesion";
import { CursoInvalido, validarCurso } from "@/lib/cursos";
import { guardarCurso, leerCurso, listarCursos } from "@/lib/servidor/cursos";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;
  try {
    return NextResponse.json({ cursos: await listarCursos(crearClienteAdmin()) });
  } catch (e) {
    return respuestaError("lectura", 500, { mensaje: (e as { message?: string }).message });
  }
}

export async function POST(request: Request) {
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
  try {
    const id = await guardarCurso(db, datos);
    return NextResponse.json({ curso: await leerCurso(db, id) });
  } catch (e) {
    return respuestaError("no_guardado", 500, { mensaje: (e as { message?: string }).message });
  }
}

// Panel del equipo: los cursos de un cliente (desde su ficha).
//
//   GET /api/admin/clientes/:id/cursos   Todos los cursos: si lo ve y cuánto lleva
//   PUT /api/admin/clientes/:id/cursos   { cursoId, elegido: boolean }  Lo agrega o quita de los elegidos

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { exigirAdmin, respuestaError } from "@/lib/servidor/sesion";
import { cursosDeCliente } from "@/lib/servidor/cursos";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;
  try {
    return NextResponse.json({ cursos: await cursosDeCliente(crearClienteAdmin(), id) });
  } catch (e) {
    return respuestaError("lectura", 500, { mensaje: (e as { message?: string }).message });
  }
}

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;

  const c = ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  if (typeof c.cursoId !== "string" || typeof c.elegido !== "boolean") return respuestaError("cuerpo_invalido", 400);

  const db = crearClienteAdmin();
  const { error } = c.elegido
    ? await db.from("curso_accesos").upsert({ curso_id: c.cursoId, cliente_id: id }, { onConflict: "curso_id,cliente_id" })
    : await db.from("curso_accesos").delete().eq("curso_id", c.cursoId).eq("cliente_id", id);
  if (error) return respuestaError("no_guardado", 409, { mensaje: error.message });

  return NextResponse.json({ cursos: await cursosDeCliente(db, id) });
}

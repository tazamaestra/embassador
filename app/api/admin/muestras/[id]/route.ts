// Panel del equipo: cambiar el estado o las notas de una solicitud de muestra.
//
//   PATCH /api/admin/muestras/:id  { estado?, notas? }

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { exigirAdmin, respuestaError } from "@/lib/servidor/sesion";
import { ESTADOS_MUESTRA, type EstadoMuestra } from "@/lib/muestras";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;

  const c = ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  const fila: Record<string, unknown> = {};

  if (c.estado !== undefined) {
    if (!ESTADOS_MUESTRA.includes(c.estado as EstadoMuestra)) return respuestaError("estado_invalido", 400);
    fila.estado = c.estado;
  }
  if (c.notas !== undefined) {
    if (c.notas !== null && typeof c.notas !== "string") return respuestaError("notas_invalidas", 400);
    const notas = typeof c.notas === "string" ? c.notas.trim() : "";
    if (notas.length > 2000) return respuestaError("notas_invalidas", 400);
    fila.notas = notas || null;
  }
  if (Object.keys(fila).length === 0) return NextResponse.json({ ok: true });
  fila.actualizado_en = new Date().toISOString();

  const { data, error } = await crearClienteAdmin()
    .from("solicitudes_muestra")
    .update(fila)
    .eq("id", id)
    .select("id");
  if (error) return respuestaError("no_guardado", 409, { mensaje: error.message });
  if (!data || data.length === 0) return respuestaError("no_encontrado", 404);

  return NextResponse.json({ ok: true });
}

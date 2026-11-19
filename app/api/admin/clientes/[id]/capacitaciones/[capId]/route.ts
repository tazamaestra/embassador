// Panel del equipo: borrar una capacitación registrada por error.
//
//   DELETE /api/admin/clientes/:id/capacitaciones/:capId

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { exigirAdmin, respuestaError } from "@/lib/servidor/sesion";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; capId: string }> }
) {
  const { id, capId } = await params;
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;

  const { data, error } = await crearClienteAdmin()
    .from("capacitaciones")
    .delete()
    .eq("id", capId)
    .eq("cliente_id", id)
    .select("id");
  if (error) return respuestaError("no_borrado", 500, { mensaje: error.message });
  if (!data || data.length === 0) return respuestaError("no_encontrado", 404);
  return NextResponse.json({ ok: true });
}

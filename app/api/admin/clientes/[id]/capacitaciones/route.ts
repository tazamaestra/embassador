// Panel del equipo: registrar una capacitación dada a un cliente.
//
//   POST /api/admin/clientes/:id/capacitaciones  { fecha, horas, tema, notas? }

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { exigirAdmin, respuestaError } from "@/lib/servidor/sesion";
import { aCapacitacion, DatoInvalido, validarCapacitacion } from "@/lib/clientes";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;

  let datos;
  try {
    datos = validarCapacitacion(await request.json().catch(() => null));
  } catch (e) {
    if (e instanceof DatoInvalido) return respuestaError("campo_invalido", 400, { campo: e.campo });
    throw e;
  }

  const db = crearClienteAdmin();
  const { data, error } = await db
    .from("capacitaciones")
    .insert({ ...datos, cliente_id: id, registrada_por: sesion.id })
    .select("*")
    .single();
  if (error) {
    const sinCliente = error.code === "23503";
    return respuestaError(sinCliente ? "no_encontrado" : "no_guardado", sinCliente ? 404 : 500, { mensaje: error.message });
  }
  return NextResponse.json({ capacitacion: aCapacitacion(data) });
}

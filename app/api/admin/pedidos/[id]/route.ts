// Panel del equipo: cambiar el estado de un pedido (marcarlo pagado si se
// cobró por fuera, enviado, cancelado…).
//
//   PATCH /api/admin/pedidos/:id  { estado }

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { exigirAdmin, respuestaError } from "@/lib/servidor/sesion";
import { ESTADOS_PEDIDO } from "@/lib/pedidos";
import type { EstadoPedido } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;

  const c = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!ESTADOS_PEDIDO.includes(c.estado as EstadoPedido)) return respuestaError("estado_invalido", 400);

  const { data, error } = await crearClienteAdmin()
    .from("pedidos_tienda")
    .update({ estado: c.estado, actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) return respuestaError("no_guardado", 409, { mensaje: error.message });
  if (!data || data.length === 0) return respuestaError("no_encontrado", 404);
  return NextResponse.json({ ok: true });
}

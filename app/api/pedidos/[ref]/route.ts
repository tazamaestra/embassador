// Estado de un pedido para la pantalla de confirmación.
//
//   GET /api/pedidos/:referencia
//
// Pública: la referencia es larga y aleatoria, y solo se devuelve lo que la
// confirmación muestra (estado, líneas y total), sin datos de contacto.
// Con el inventario conectado, se le pregunta a él; si no, al respaldo local.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { respuestaError } from "@/lib/servidor/sesion";
import { aPedido } from "@/lib/pedidos";
import { aPedidoWeb, inventarioConectado, pedidoPorReferencia } from "@/lib/servidor/inventario";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  if (!/^PED-[A-Z0-9-]{6,60}$/.test(ref)) return respuestaError("no_encontrado", 404);

  let p;
  if (inventarioConectado()) {
    const remoto = await pedidoPorReferencia(ref);
    if (!remoto) return respuestaError("no_encontrado", 404);
    p = aPedidoWeb(remoto, null);
  } else {
    const { data } = await crearClienteAdmin().from("pedidos_tienda").select("*").eq("referencia", ref).maybeSingle();
    if (!data) return respuestaError("no_encontrado", 404);
    p = aPedido(data);
  }

  return NextResponse.json({ estado: p.estado, items: p.items, totalCop: p.totalCop, referencia: p.referencia });
}

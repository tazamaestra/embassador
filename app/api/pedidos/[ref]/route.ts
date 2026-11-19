// Estado de un pedido para la pantalla de confirmación.
//
//   GET /api/pedidos/:referencia
//
// Pública: la referencia es larga y aleatoria, y solo se devuelve lo que la
// confirmación muestra (estado, líneas y total), sin datos de contacto.
// Se le pregunta al inventario, que es donde viven los pedidos.

import { NextResponse } from "next/server";
import { respuestaError } from "@/lib/servidor/sesion";
import { aPedidoWeb, inventarioConectado, pedidoPorReferencia } from "@/lib/servidor/inventario";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  if (!/^PED-[A-Z0-9-]{6,60}$/.test(ref) || !inventarioConectado()) return respuestaError("no_encontrado", 404);

  const remoto = await pedidoPorReferencia(ref);
  if (!remoto) return respuestaError("no_encontrado", 404);
  const p = aPedidoWeb(remoto, null);

  return NextResponse.json({ estado: p.estado, items: p.items, totalCop: p.totalCop, referencia: p.referencia });
}

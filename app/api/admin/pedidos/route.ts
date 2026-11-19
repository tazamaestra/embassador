// Panel del equipo: pedidos de la tienda.
//
//   GET /api/admin/pedidos?estado=

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { exigirAdmin, respuestaError } from "@/lib/servidor/sesion";
import { aPedido, ESTADOS_PEDIDO } from "@/lib/pedidos";
import { inventarioConectado } from "@/lib/servidor/inventario";
import type { EstadoPedido } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;

  const estado = new URL(request.url).searchParams.get("estado");
  let consulta = crearClienteAdmin().from("pedidos_tienda").select("*, clientes(negocio, nombre)").order("creado_en", { ascending: false }).limit(500);
  if (estado && ESTADOS_PEDIDO.includes(estado as EstadoPedido)) consulta = consulta.eq("estado", estado);

  const { data, error } = await consulta;
  if (error) return respuestaError("lectura", 500, { mensaje: error.message });
  // Con el inventario conectado, los pedidos nuevos viven allá: aquí solo
  // quedan los del respaldo local, anteriores a la conexión.
  return NextResponse.json({ pedidos: (data ?? []).map(aPedido), inventarioConectado: inventarioConectado() });
}

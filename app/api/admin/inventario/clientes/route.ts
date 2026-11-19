// Panel del equipo: buscar clientes en el inventario, para vincularlos.
//
//   GET /api/admin/inventario/clientes?q=texto   (nombre, negocio, NIT o correo)

import { NextResponse } from "next/server";
import { exigirAdmin, respuestaError } from "@/lib/servidor/sesion";
import { buscarClientesInventario, inventarioConectado } from "@/lib/servidor/inventario";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;
  if (!inventarioConectado()) return respuestaError("inventario_sin_configurar", 503);

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  const clientes = await buscarClientesInventario(q);
  if (clientes === null) return respuestaError("inventario_no_disponible", 502);
  return NextResponse.json({ clientes });
}

// La cuenta del cliente: su ficha, sus compras (del inventario) y sus horas
// de capacitación.
//
//   GET /api/mi-cuenta
//
// Solo lee lo del dueño del token. Se arma con la service key porque las
// compras vienen del inventario (servidor a servidor) y la ficha se busca
// por el id de la sesión, que no se puede falsificar.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { leerSesion, respuestaError } from "@/lib/servidor/sesion";
import { resumenCliente } from "@/lib/servidor/clientes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sesion = await leerSesion(request);
  if (!sesion) return respuestaError("sin_sesion", 401);

  const resumen = await resumenCliente(crearClienteAdmin(), sesion.id);
  if (!resumen) return respuestaError("sin_ficha", 404);
  if (!resumen.cliente.activo) return respuestaError("inactivo", 403);

  // Las notas internas del equipo no se le muestran al cliente.
  return NextResponse.json({ ...resumen, cliente: { ...resumen.cliente, notas: "" } });
}

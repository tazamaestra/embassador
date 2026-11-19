// Pedir una muestra gratis desde la tienda. Pública: no pide cuenta.
//
//   POST /api/muestras  { nombre, telefono, email?, ciudad, direccion,
//                         tipo, negocio?, cafe, mensaje?, sitio? }
//
// Se guarda con la service key (la tabla no tiene policies públicas).
// Contra el spam: `sitio` es un campo trampa que una persona nunca llena, y
// un mismo teléfono no puede tener dos solicitudes abiertas.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { obtenerCafes } from "@/lib/servidor/cafes";
import { respuestaError } from "@/lib/servidor/sesion";
import { MuestraInvalida, validarMuestra } from "@/lib/muestras";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cuerpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!cuerpo) return respuestaError("cuerpo_invalido", 400);

  // Campo trampa lleno: se responde como si nada, pero no se guarda.
  if (typeof cuerpo.sitio === "string" && cuerpo.sitio.trim()) {
    return NextResponse.json({ ok: true });
  }

  const cafes = (await obtenerCafes()).map((c) => c.id);
  let datos;
  try {
    datos = validarMuestra(cuerpo, cafes);
  } catch (e) {
    if (e instanceof MuestraInvalida) return respuestaError("campo_invalido", 400, { campo: e.campo });
    throw e;
  }

  const db = crearClienteAdmin();

  const { data: abiertas, error: errorLectura } = await db
    .from("solicitudes_muestra")
    .select("id")
    .eq("telefono", datos.telefono)
    .in("estado", ["pendiente", "contactado"])
    .limit(1);
  if (errorLectura) return respuestaError("no_guardada", 500);
  if (abiertas && abiertas.length > 0) return respuestaError("ya_solicitada", 409);

  const { error } = await db.from("solicitudes_muestra").insert(datos);
  if (error) return respuestaError("no_guardada", 500);

  return NextResponse.json({ ok: true });
}

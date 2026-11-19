// Panel del equipo: las solicitudes de muestra gratis.
//
//   GET /api/admin/muestras?estado=&q=
//
// Solo admins (es_equipo()). Se lee con la service key después de
// comprobar el rol.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { exigirAdmin, respuestaError } from "@/lib/servidor/sesion";
import { ESTADOS_MUESTRA, aSolicitud, type EstadoMuestra } from "@/lib/muestras";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;

  const url = new URL(request.url);
  const estado = url.searchParams.get("estado");
  const busqueda = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  let consulta = crearClienteAdmin()
    .from("solicitudes_muestra")
    .select("*")
    .order("creado_en", { ascending: false })
    .limit(500);
  if (estado && ESTADOS_MUESTRA.includes(estado as EstadoMuestra)) consulta = consulta.eq("estado", estado);

  const { data, error } = await consulta;
  if (error) return respuestaError("lectura", 500, { mensaje: error.message });

  const muestras = (data ?? [])
    .map(aSolicitud)
    .filter((m) =>
      !busqueda ||
      [m.nombre, m.telefono, m.email ?? "", m.ciudad, m.negocio ?? ""].some((v) => v.toLowerCase().includes(busqueda))
    );

  return NextResponse.json({ muestras });
}

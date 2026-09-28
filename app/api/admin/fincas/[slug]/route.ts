// Panel del equipo: después de subir o quitar la foto de una finca, la ficha
// del café se regenera en la próxima visita en vez de esperar el revalidate.
// La foto la sube el navegador directo a Supabase (policies con es_equipo);
// esta ruta solo refresca la caché.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";
import { findProduct } from "@/lib/content";
import { esAdmin, leerSesion, respuestaError } from "@/lib/servidor/sesion";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sesion = await leerSesion(request);
  if (!sesion) return respuestaError("sin_sesion", 401);
  if (!(await esAdmin(sesion))) return respuestaError("prohibido", 403);
  if (!findProduct(slug)) return respuestaError("no_encontrado", 404);

  for (const locale of routing.locales) revalidatePath(`/${locale}/producto/${slug}`);
  return NextResponse.json({ ok: true });
}

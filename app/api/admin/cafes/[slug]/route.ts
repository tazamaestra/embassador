// Panel del equipo: guarda lo editado de un café (nombre, precios, notas,
// propósito y la foto del producto) y refresca el sitio.
//
// Escribe con el token del admin, así que las policies de cafe_ediciones
// (es_equipo) deciden también aquí. La foto la sube el navegador directo al
// bucket `cafes`; a esta ruta llega solo la ruta del archivo.

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { crearClienteConToken } from "@/lib/supabase-admin";
import { findProduct } from "@/lib/content";
import { EdicionInvalida, aFila, validarDatosEdicion } from "@/lib/cafes";
import { ETIQUETA_CAFES } from "@/lib/servidor/cafes";
import { esAdmin, leerSesion, respuestaError } from "@/lib/servidor/sesion";

export const dynamic = "force-dynamic";

interface Cuerpo {
  datos?: unknown;
  /** Foto nueva ya subida al bucket, o null para quitarla. Ausente = no se toca. */
  foto?: { path: string; ancho: number; alto: number } | null;
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sesion = await leerSesion(request);
  if (!sesion) return respuestaError("sin_sesion", 401);
  if (!(await esAdmin(sesion))) return respuestaError("prohibido", 403);

  const base = findProduct(slug);
  if (!base) return respuestaError("no_encontrado", 404);

  let cuerpo: Cuerpo;
  try {
    cuerpo = (await request.json()) as Cuerpo;
  } catch {
    return respuestaError("cuerpo_invalido", 400);
  }

  const fila: Record<string, unknown> = {
    producto_slug: slug,
    actualizada_en: new Date().toISOString(),
    actualizada_por: sesion.id,
  };

  if (cuerpo.datos !== undefined) {
    try {
      Object.assign(fila, aFila(validarDatosEdicion(cuerpo.datos, base)));
    } catch (e) {
      if (e instanceof EdicionInvalida) return respuestaError("dato_invalido", 400, { campo: e.campo });
      throw e;
    }
  }

  if (cuerpo.foto !== undefined) {
    const f = cuerpo.foto;
    if (f === null) {
      Object.assign(fila, { foto_path: null, foto_ancho: null, foto_alto: null });
    } else if (
      typeof f.path === "string" && f.path.startsWith(`${slug}/`) && !f.path.includes("..") &&
      Number.isInteger(f.ancho) && f.ancho > 0 && Number.isInteger(f.alto) && f.alto > 0
    ) {
      Object.assign(fila, { foto_path: f.path, foto_ancho: f.ancho, foto_alto: f.alto });
    } else {
      return respuestaError("dato_invalido", 400, { campo: "foto" });
    }
  }

  const db = crearClienteConToken(sesion.token);
  const { data, error } = await db.from("cafe_ediciones").upsert(fila).select("*").single();
  if (error) return respuestaError("no_guardado", 500, { mensaje: error.message });

  // Tienda, fichas, home, blog y carrito leen de aquí: se refresca todo el sitio.
  revalidateTag(ETIQUETA_CAFES, { expire: 0 });
  revalidatePath("/[locale]", "layout");

  return NextResponse.json({ edicion: data });
}

// Lo que usa el panel para editar cafés. Corre en el navegador del admin.
//
// La foto del producto sube directo al bucket `cafes` (las policies exigen
// es_equipo); los datos van por /api/admin/cafes/[slug], que valida y
// refresca el sitio.

import { getSupabase } from "@/lib/supabase";
import { llamarApi } from "@/lib/pago";
import { BUCKET_CAFES, aEdicion, type DatosEdicion, type EdicionCafe, type FilaEdicion } from "@/lib/cafes";
import type { ImagenComprimida } from "@/lib/imagen";

export async function listarEdiciones(): Promise<EdicionCafe[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("cafe_ediciones").select("*");
  if (error) throw error;
  return (data ?? []).map((f) => aEdicion(f as FilaEdicion));
}

type Respuesta = { ok: true; edicion: EdicionCafe } | { ok: false; error: string };

async function enviar(slug: string, body: unknown): Promise<Respuesta> {
  const r = await llamarApi<{ edicion: FilaEdicion }>(`/api/admin/cafes/${slug}`, {
    method: "PUT",
    body,
  });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, edicion: aEdicion(r.data.edicion) };
}

export function guardarDatos(slug: string, datos: DatosEdicion): Promise<Respuesta> {
  return enviar(slug, { datos });
}

/**
 * Sube la foto del producto y la deja registrada. Si el registro falla, el
 * archivo se borra; si sale bien, se borra la foto anterior.
 */
export async function guardarFotoProducto(
  slug: string,
  imagen: ImagenComprimida,
  anterior: string | null
): Promise<Respuesta> {
  const supabase = await getSupabase();
  // Timestamp en el nombre: la CDN no sirve la foto vieja cacheada.
  const path = `${slug}/${Date.now()}.${imagen.extension}`;
  const { error } = await supabase.storage.from(BUCKET_CAFES).upload(path, imagen.blob, {
    contentType: imagen.blob.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return { ok: false, error: "subida_fallida" };

  const r = await enviar(slug, { foto: { path, ancho: imagen.ancho, alto: imagen.alto } });
  if (!r.ok) {
    await supabase.storage.from(BUCKET_CAFES).remove([path]);
    return r;
  }
  if (anterior) await supabase.storage.from(BUCKET_CAFES).remove([anterior]);
  return r;
}

export async function quitarFotoProducto(slug: string, actual: string): Promise<Respuesta> {
  const r = await enviar(slug, { foto: null });
  if (r.ok) {
    const supabase = await getSupabase();
    await supabase.storage.from(BUCKET_CAFES).remove([actual]);
  }
  return r;
}

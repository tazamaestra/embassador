// Capa delgada sobre la tabla `finca_fotos` y el bucket `fincas`.
// Ver supabase/sql/finca_fotos.sql para el esquema y las policies.

import { getSupabase } from "@/lib/supabase";
import type { ImagenComprimida } from "@/lib/imagen";

const BUCKET = "fincas";

export interface FotoFinca {
  productoSlug: string;
  storagePath: string;
  ancho: number;
  alto: number;
  bytes: number;
  altEs: string;
  altEn: string;
  actualizadaEn: string;
}

interface Fila {
  producto_slug: string;
  storage_path: string;
  ancho: number;
  alto: number;
  bytes: number;
  alt_es: string;
  alt_en: string;
  actualizada_en: string;
}

const COLUMNAS =
  "producto_slug, storage_path, ancho, alto, bytes, alt_es, alt_en, actualizada_en";

function aFoto(f: Fila): FotoFinca {
  return {
    productoSlug: f.producto_slug,
    storagePath: f.storage_path,
    ancho: f.ancho,
    alto: f.alto,
    bytes: f.bytes,
    altEs: f.alt_es,
    altEn: f.alt_en,
    actualizadaEn: f.actualizada_en,
  };
}

/**
 * URL pública de la foto. El bucket es público, así que se arma sin firmar
 * y la sirve la CDN de Supabase.
 */
export function urlFoto(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

/** La foto de un café, o null si todavía no tiene. */
export async function obtenerFotoFinca(
  productoSlug: string
): Promise<FotoFinca | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("finca_fotos")
    .select(COLUMNAS)
    .eq("producto_slug", productoSlug)
    .maybeSingle();

  if (error) throw error;
  return data ? aFoto(data as Fila) : null;
}

/** Todas las fotos, para pintar el panel de una sola consulta. */
export async function listarFotosFinca(): Promise<FotoFinca[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("finca_fotos").select(COLUMNAS);

  if (error) throw error;
  return (data ?? []).map((f) => aFoto(f as Fila));
}

/** ¿El usuario de la sesión es del equipo interno? Lo decide Postgres. */
export async function esEquipo(): Promise<boolean> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("es_equipo");
  if (error) return false;
  return data === true;
}

/**
 * Sube la imagen ya comprimida y deja la ruta en la tabla. Solo funciona con
 * sesión de alguien del equipo: lo imponen las policies, no este código.
 *
 * El nombre lleva timestamp para que la CDN no sirva la foto vieja cacheada
 * cuando se reemplaza.
 */
export async function guardarFotoFinca(
  productoSlug: string,
  imagen: ImagenComprimida,
  alt: { es: string; en: string }
): Promise<FotoFinca> {
  const supabase = await getSupabase();

  const anterior = await obtenerFotoFinca(productoSlug);
  const ruta = `${productoSlug}/${Date.now()}.${imagen.extension}`;

  const { error: errorSubida } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, imagen.blob, {
      contentType: imagen.blob.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (errorSubida) throw errorSubida;

  const { data, error } = await supabase
    .from("finca_fotos")
    .upsert({
      producto_slug: productoSlug,
      storage_path: ruta,
      ancho: imagen.ancho,
      alto: imagen.alto,
      bytes: imagen.blob.size,
      alt_es: alt.es,
      alt_en: alt.en,
      actualizada_en: new Date().toISOString(),
    })
    .select(COLUMNAS)
    .single();

  if (error) {
    // La fila manda: si no quedó registrada, el archivo suelto solo ocupa
    // espacio y nadie lo va a encontrar.
    await supabase.storage.from(BUCKET).remove([ruta]);
    throw error;
  }

  // Ya hay foto nueva registrada: la anterior sobra.
  if (anterior) {
    await supabase.storage.from(BUCKET).remove([anterior.storagePath]);
  }

  return aFoto(data as Fila);
}

/** Quita la foto de un café: primero la fila, después el archivo. */
export async function borrarFotoFinca(productoSlug: string): Promise<void> {
  const supabase = await getSupabase();

  const actual = await obtenerFotoFinca(productoSlug);
  if (!actual) return;

  const { error } = await supabase
    .from("finca_fotos")
    .delete()
    .eq("producto_slug", productoSlug);
  if (error) throw error;

  await supabase.storage.from(BUCKET).remove([actual.storagePath]);
}

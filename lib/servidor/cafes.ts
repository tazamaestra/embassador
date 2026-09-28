// El catálogo de cafés con las ediciones del panel encima. SOLO SERVIDOR.
//
// Se cachea con la etiqueta "cafes": las páginas siguen saliendo estáticas
// y el panel las refresca al guardar (app/api/admin/cafes/[slug]). Si
// Supabase no responde, el sitio sale con el JSON tal cual: una tabla caída
// no puede tumbar la tienda.

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { products } from "@/lib/content";
import { aEdicion, aplicarEdiciones, type EdicionCafe, type FilaEdicion } from "@/lib/cafes";
import type { Product } from "@/lib/types";

export const ETIQUETA_CAFES = "cafes";

async function leerEdiciones(): Promise<EdicionCafe[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return [];
  const db = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.from("cafe_ediciones").select("*");
  if (error) return [];
  return (data ?? []).map((f) => aEdicion(f as FilaEdicion));
}

const edicionesCacheadas = unstable_cache(leerEdiciones, ["cafe_ediciones"], {
  tags: [ETIQUETA_CAFES],
  revalidate: 300,
});

/** Los cafés como se ven y se cobran hoy. */
export async function obtenerCafes(): Promise<Product[]> {
  const ediciones = await edicionesCacheadas().catch(() => []);
  return aplicarEdiciones(products, ediciones);
}

export async function obtenerCafe(slug: string): Promise<Product | undefined> {
  return (await obtenerCafes()).find((p) => p.id === slug);
}

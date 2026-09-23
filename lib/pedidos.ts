// DORMIDO detrás de FEATURE_AMBASSADORS.
//
// Los pedidos mayoristas son del programa de embajadores. Con el flag apagado
// nada de la interfaz llama a este módulo —el checkout de suscripción no pasa
// por aquí— y cada función falla de forma explícita si alguien lo intenta.
// No se borra: las tablas, el SQL y este código siguen listos para volver.

import { getSupabase } from "@/lib/supabase";
import { products } from "@/lib/content";
import { FEATURE_AMBASSADORS } from "@/lib/flags";
import type { CartItem } from "@/lib/cart-store";

// Mapeo del catálogo de la tienda web (content.json) a los productos
// reales en Supabase (tabla `productos`), usado por confirmar_pedido_embajador
// para saber de qué lote descontar stock. Ver supabase/sql/confirmar_pedido_embajador.sql.
const PRODUCTO_ID_MAP: Record<string, string> = {
  "la-esperanza": "df499576-64ce-49f1-8dc2-44efa6cdb0d5", // TazaMaestra Natural
  "santa-rita": "a69a196c-dd8b-4ab1-b745-f24f339113f7", // TazaMaestra Lavado
};

function exigirFlag() {
  if (!FEATURE_AMBASSADORS) {
    throw new Error(
      "Los pedidos mayoristas están desactivados (FEATURE_AMBASSADORS=false)."
    );
  }
}

export interface PedidoItem {
  id: string;
  producto_slug: string;
  producto_nombre: string;
  libras: number;
  precio_compra_lb: number;
  precio_venta_lb: number;
  utilidad_lb: number;
  utilidad_total: number;
}

export async function guardarCarritoComoPedido(embajadorId: string, items: CartItem[]) {
  exigirFlag();
  if (items.length === 0) return;

  const rows = items.map((item) => {
    const product = products.find((p) => p.id === item.id);
    return {
      embajador_id: embajadorId,
      producto_id: PRODUCTO_ID_MAP[item.id] ?? null,
      producto_slug: item.id,
      producto_nombre: item.name,
      libras: item.qty,
      precio_compra_lb: product?.wholesale ?? item.price,
      precio_venta_lb: product?.precioCop ?? item.price,
    };
  });

  const supabase = await getSupabase();

  const { error } = await supabase
    .from("pedidos_embajador")
    .upsert(rows, { onConflict: "embajador_id,producto_slug" });

  if (error) throw error;
}

export async function obtenerPedidos(embajadorId: string): Promise<PedidoItem[]> {
  exigirFlag();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("pedidos_embajador")
    .select("id, producto_slug, producto_nombre, libras, precio_compra_lb, precio_venta_lb, utilidad_lb, utilidad_total")
    .eq("embajador_id", embajadorId)
    .order("creado_en", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function actualizarLibrasPedido(id: string, libras: number) {
  exigirFlag();
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("pedidos_embajador")
    .update({ libras })
    .eq("id", id);

  if (error) throw error;
}

export async function eliminarPedido(id: string) {
  exigirFlag();
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("pedidos_embajador")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

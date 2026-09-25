// Dirección principal del cliente. SOLO SERVIDOR.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface DireccionEntrada {
  nombre: string;
  telefono: string;
  linea: string;
  ciudad: string;
  departamento: string;
  notas?: string;
}

/** Recorta y valida lo que llega del navegador. null si falta algo. */
export function leerDireccion(crudo: unknown): DireccionEntrada | null {
  const d = (crudo ?? {}) as Record<string, unknown>;
  const campo = (k: string, max = 200) => String(d[k] ?? "").trim().slice(0, max);
  const r = {
    nombre: campo("nombre"),
    telefono: campo("telefono", 30),
    linea: campo("linea"),
    ciudad: campo("ciudad", 80),
    departamento: campo("departamento", 80),
    notas: campo("notas"),
  };
  return r.nombre && r.telefono && r.linea && r.ciudad && r.departamento ? r : null;
}

/** Una sola dirección principal por cliente: se actualiza la que haya. */
export async function guardarDireccionPrincipal(
  db: SupabaseClient,
  clienteId: string,
  d: DireccionEntrada
): Promise<string> {
  const fila = { ...d, notas: d.notas ?? "", cliente_id: clienteId, es_principal: true };

  const { data: existente } = await db
    .from("direcciones")
    .select("id")
    .eq("cliente_id", clienteId)
    .eq("es_principal", true)
    .maybeSingle();

  if (existente) {
    const { error } = await db.from("direcciones").update(fila).eq("id", existente.id);
    if (error) throw error;
    return existente.id as string;
  }

  const { data, error } = await db.from("direcciones").insert(fila).select("id").single();
  if (error) throw error;
  return data.id as string;
}

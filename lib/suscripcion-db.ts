// Capa delgada sobre Supabase. Solo traduce filas y persiste lo que
// lib/suscripcion.ts ya calculó. Ninguna regla de negocio vive aquí.

import { getSupabase } from "@/lib/supabase";
import type { Direccion, EnvioSuscripcion, Suscripcion } from "@/lib/types";

interface FilaSuscripcion {
  id: string;
  cliente_id: string;
  nivel_id: string;
  frecuencia_id: string;
  prepago_id: string;
  molienda: string;
  metodo: string;
  perfil: string;
  estado: Suscripcion["estado"];
  proximo_envio: string;
  envios_hechos: number;
  envios_saltados: number;
  direccion_id: string | null;
  creada_en: string;
  pausada_en: string | null;
  cancelada_en: string | null;
}

const COLUMNAS =
  "id, cliente_id, nivel_id, frecuencia_id, prepago_id, molienda, metodo, perfil, estado, proximo_envio, envios_hechos, envios_saltados, direccion_id, creada_en, pausada_en, cancelada_en";

function aSuscripcion(f: FilaSuscripcion): Suscripcion {
  return {
    id: f.id,
    clienteId: f.cliente_id,
    nivelId: f.nivel_id,
    frecuenciaId: f.frecuencia_id,
    prepagoId: f.prepago_id,
    molienda: f.molienda,
    metodo: f.metodo,
    perfil: f.perfil,
    estado: f.estado,
    proximoEnvio: f.proximo_envio,
    enviosHechos: f.envios_hechos,
    enviosSaltados: f.envios_saltados,
    direccionId: f.direccion_id,
    creadaEn: f.creada_en.slice(0, 10),
    pausadaEn: f.pausada_en ? f.pausada_en.slice(0, 10) : null,
    canceladaEn: f.cancelada_en ? f.cancelada_en.slice(0, 10) : null,
  };
}

/** La suscripción vigente del cliente, si tiene una. */
export async function obtenerSuscripcion(
  clienteId: string
): Promise<Suscripcion | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("suscripciones")
    .select(COLUMNAS)
    .eq("cliente_id", clienteId)
    .neq("estado", "cancelada")
    .order("creada_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? aSuscripcion(data as FilaSuscripcion) : null;
}

/** Guarda el resultado de una transición de lib/suscripcion.ts. */
export async function guardarSuscripcion(s: Suscripcion): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("suscripciones")
    .update({
      nivel_id: s.nivelId,
      frecuencia_id: s.frecuenciaId,
      prepago_id: s.prepagoId,
      molienda: s.molienda,
      metodo: s.metodo,
      perfil: s.perfil,
      estado: s.estado,
      proximo_envio: s.proximoEnvio,
      envios_hechos: s.enviosHechos,
      envios_saltados: s.enviosSaltados,
      direccion_id: s.direccionId,
      pausada_en: s.pausadaEn,
      cancelada_en: s.canceladaEn,
    })
    .eq("id", s.id);

  if (error) throw error;
}

export async function obtenerEnvios(
  suscripcionId: string
): Promise<EnvioSuscripcion[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("suscripcion_envios")
    .select("id, suscripcion_id, numero, fecha_programada, estado, cafe, regalo, total_cop")
    .eq("suscripcion_id", suscripcionId)
    .order("numero", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((f) => ({
    id: f.id,
    suscripcionId: f.suscripcion_id,
    numero: f.numero,
    fechaProgramada: f.fecha_programada,
    estado: f.estado,
    cafe: f.cafe ?? "",
    regalo: Boolean(f.regalo),
    totalCop: Number(f.total_cop),
  }));
}

// ── Direcciones ────────────────────────────────────────────────────────────

interface FilaDireccion {
  id: string;
  cliente_id: string;
  nombre: string;
  telefono: string;
  linea: string;
  ciudad: string;
  departamento: string;
  notas: string;
  es_principal: boolean;
}

/** Para autocompletar el checkout cuando el cliente ya compró antes. */
export async function obtenerDireccionPrincipal(
  clienteId: string
): Promise<Direccion | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("direcciones")
    .select("id, cliente_id, nombre, telefono, linea, ciudad, departamento, notas, es_principal")
    .eq("cliente_id", clienteId)
    .eq("es_principal", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const f = data as FilaDireccion;
  return {
    id: f.id,
    clienteId: f.cliente_id,
    nombre: f.nombre,
    telefono: f.telefono,
    linea: f.linea,
    ciudad: f.ciudad,
    departamento: f.departamento,
    notas: f.notas,
    esPrincipal: f.es_principal,
  };
}

export async function guardarDireccion(
  clienteId: string,
  direccion: Omit<Direccion, "id" | "clienteId" | "esPrincipal">
): Promise<string> {
  // Una sola dirección principal por cliente: se actualiza la que haya.
  const existente = await obtenerDireccionPrincipal(clienteId);

  if (existente) {
    const supabase = await getSupabase();
    const { error } = await supabase
      .from("direcciones")
      .update({
        nombre: direccion.nombre,
        telefono: direccion.telefono,
        linea: direccion.linea,
        ciudad: direccion.ciudad,
        departamento: direccion.departamento,
        notas: direccion.notas,
      })
      .eq("id", existente.id);
    if (error) throw error;
    return existente.id;
  }

  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("direcciones")
    .insert({
      cliente_id: clienteId,
      nombre: direccion.nombre,
      telefono: direccion.telefono,
      linea: direccion.linea,
      ciudad: direccion.ciudad,
      departamento: direccion.departamento,
      notas: direccion.notas,
      es_principal: true,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

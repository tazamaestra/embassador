// Catálogo de la suscripción, leído de Supabase.
//
// Precios, frecuencias, moliendas, perfiles, prepagos y reglas se editan en
// la base (tablas de supabase/sql/fase1_suscripciones.sql), no en el código.
// Las páginas lo leen en el servidor y se lo pasan a los componentes
// cliente; los route handlers lo vuelven a leer para calcular montos, así que
// un precio que llegue del navegador no se usa nunca.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Catalogo, Frecuencia, OpcionCatalogo, Operacion, Plan, Prepago, ReglasQuiz,
  ReglasSuscripcion,
} from "./types";

function clientePublico(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Falta la configuración de Supabase en el entorno.");
  return createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Fila = Record<string, unknown>;

const txt = (f: Fila, k: string) => String(f[k] ?? "");
const num = (f: Fila, k: string) => Number(f[k]);

function aOpcion(f: Fila): OpcionCatalogo {
  return {
    id: txt(f, "id"),
    label_es: txt(f, "label_es"),
    label_en: txt(f, "label_en"),
    desc_es: txt(f, "desc_es"),
    desc_en: txt(f, "desc_en"),
    orden: num(f, "orden"),
  };
}

function aPlan(f: Fila): Plan {
  return {
    id: txt(f, "id"),
    label_es: txt(f, "label_es"),
    label_en: txt(f, "label_en"),
    desc_es: txt(f, "desc_es"),
    desc_en: txt(f, "desc_en"),
    bolsas: num(f, "bolsas"),
    gramosBolsa: num(f, "gramos_bolsa"),
    precioEnvioCop: num(f, "precio_envio_cop"),
    incluye_es: (f.incluye_es as string[]) ?? [],
    incluye_en: (f.incluye_en as string[]) ?? [],
    frecuenciaDefectoId: (f.frecuencia_defecto_id as string | null) ?? null,
    orden: num(f, "orden"),
  };
}

function aFrecuencia(f: Fila): Frecuencia {
  return {
    id: txt(f, "id"),
    dias: num(f, "dias"),
    label_es: txt(f, "label_es"),
    label_en: txt(f, "label_en"),
    orden: num(f, "orden"),
  };
}

function aPrepago(f: Fila): Prepago {
  return {
    id: txt(f, "id"),
    meses: num(f, "meses"),
    descuentoPct: num(f, "descuento_pct"),
    label_es: txt(f, "label_es"),
    label_en: txt(f, "label_en"),
    orden: num(f, "orden"),
  };
}

function exigir<T>(config: Map<string, unknown>, clave: string): T {
  if (!config.has(clave)) {
    throw new Error(`Falta la clave "${clave}" en config_suscripcion. ¿Se corrió fase1_suscripciones.sql?`);
  }
  return config.get(clave) as T;
}

/**
 * El catálogo completo, solo con lo activo. Falla con un mensaje claro si la
 * base no tiene la migración: sin precios no se debe poder cobrar.
 */
export async function obtenerCatalogo(cliente: SupabaseClient = clientePublico()): Promise<Catalogo> {
  const activos = (tabla: string) =>
    cliente.from(tabla).select("*").eq("activo", true).order("orden", { ascending: true });

  const [planes, frecuencias, moliendas, perfiles, prepagos, config] = await Promise.all([
    activos("planes"),
    activos("frecuencias"),
    activos("moliendas"),
    activos("perfiles"),
    activos("prepagos"),
    cliente.from("config_suscripcion").select("clave, valor"),
  ]);

  for (const r of [planes, frecuencias, moliendas, perfiles, prepagos, config]) {
    if (r.error) throw new Error(`No se pudo leer el catálogo: ${r.error.message}`);
  }

  const mapa = new Map((config.data ?? []).map((f) => [f.clave as string, f.valor as unknown]));
  const regalo = exigir<{ cadaEnvios: number; bolsas: number }>(mapa, "regalo");

  const reglas: ReglasSuscripcion = {
    diasCobroAntesEnvio: Number(exigir(mapa, "dias_cobro_antes_envio")),
    diasPreparacion: Number(exigir(mapa, "dias_preparacion")),
    reintentosDias: exigir<number[]>(mapa, "reintentos_dias").map(Number),
    mesesPausa: exigir<number[]>(mapa, "meses_pausa").map(Number),
    redondeoCop: Number(exigir(mapa, "redondeo_cop")),
    prepagoRenovacion: exigir<string>(mapa, "prepago_renovacion") === "ciclo" ? "ciclo" : "mismo",
    regalo: { cadaEnvios: Number(regalo.cadaEnvios), bolsas: Number(regalo.bolsas) },
  };

  return {
    planes: (planes.data ?? []).map(aPlan),
    frecuencias: (frecuencias.data ?? []).map(aFrecuencia),
    moliendas: (moliendas.data ?? []).map(aOpcion),
    perfiles: (perfiles.data ?? []).map(aOpcion),
    prepagos: (prepagos.data ?? []).map(aPrepago),
    reglas,
    quiz: exigir<ReglasQuiz>(mapa, "quiz"),
    operacion: exigir<Operacion>(mapa, "operacion"),
  };
}

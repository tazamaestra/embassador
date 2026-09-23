// El SDK de Supabase pesa ~225 KB sin comprimir. Importarlo arriba lo metía en
// el chunk del Header, que está en el layout: todas las páginas —el home, la
// tienda, el blog— lo descargaban antes de ser interactivas, aunque el
// visitante no tenga cuenta y no vaya a tocar el login.
//
// Aquí solo viaja el tipo (se borra al compilar). El SDK llega por import()
// dinámico: cuando alguien pide un código, o cuando ya hay sesión guardada.

import type { SupabaseClient } from "@supabase/supabase-js";

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const LLAVE_ANONIMA = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let pendiente: Promise<SupabaseClient> | null = null;

/** El cliente de Supabase, cargado bajo demanda. Uno solo por pestaña. */
export function getSupabase(): Promise<SupabaseClient> {
  pendiente ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(URL_SUPABASE, LLAVE_ANONIMA)
  );
  return pendiente;
}

// El SDK guarda la sesión en localStorage bajo `sb-<ref>-auth-token`, donde
// <ref> es el subdominio del proyecto. Las versiones nuevas la parten en
// varias claves (`...-auth-token.0`), así que se busca por prefijo.
const PREFIJO_SESION = (() => {
  try {
    return `sb-${new URL(URL_SUPABASE).hostname.split(".")[0]}-auth-token`;
  } catch {
    return "";
  }
})();

/**
 * ¿Hay sesión guardada en este navegador? Se responde leyendo localStorage,
 * sin cargar el SDK. Un visitante anónimo —la mayoría— nunca lo descarga.
 */
export function haySesionGuardada(): boolean {
  if (typeof window === "undefined" || !PREFIJO_SESION) return false;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const clave = window.localStorage.key(i);
      if (clave?.startsWith(PREFIJO_SESION)) return true;
    }
  } catch {
    // Cookies bloqueadas o modo privado: se trata como "sin sesión".
  }
  return false;
}

/**
 * ¿Volvemos de un redirect de Google? Supabase devuelve el token en el hash
 * (`#access_token=…`) y lo canjea el propio SDK al crearse, con
 * detectSessionInUrl. Pero en ese momento todavía no hay nada en
 * localStorage, así que sin esta comprobación el SDK no se cargaría nunca y
 * la sesión se perdería en la misma página que la trae.
 */
export function hayRespuestaOAuth(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  return hash.includes("access_token=") || hash.includes("error_description=");
}

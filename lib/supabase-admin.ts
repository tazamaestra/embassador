// Cliente de Supabase con la service key. SOLO SERVIDOR.
//
// Lo usan los route handlers: el webhook de Wompi, que llega sin sesión del
// usuario y necesita saltarse RLS para activar la suscripción.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function crearClienteAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Cliente que actúa como el usuario dueño del token. Respeta RLS, así que
 * sirve para leer y escribir "lo suyo" desde un route handler.
 */
export function crearClienteConToken(accessToken: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Falta la configuración de Supabase en el entorno.");
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

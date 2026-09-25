// Quién llama a un route handler y con qué rol. SOLO SERVIDOR.
//
// Dos roles: suscriptor (cualquiera con sesión) y admin (quien esté en la
// tabla `usuarios`, lo que responde la función es_equipo() de Postgres). El
// rol se pregunta a la base con el token del usuario: el navegador no puede
// declararse admin.

import { NextResponse } from "next/server";
import { crearClienteConToken } from "@/lib/supabase-admin";

export interface Sesion {
  id: string;
  email: string;
  token: string;
}

export function respuestaError(codigo: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: codigo, ...extra }, { status });
}

export async function leerSesion(request: Request): Promise<Sesion | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await crearClienteConToken(token).auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "", token };
}

export async function esAdmin(sesion: Sesion): Promise<boolean> {
  const { data, error } = await crearClienteConToken(sesion.token).rpc("es_equipo");
  return !error && data === true;
}

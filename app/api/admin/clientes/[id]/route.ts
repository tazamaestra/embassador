// Panel del equipo: un cliente.
//
//   GET    /api/admin/clientes/:id   Ficha + compras del inventario + horas
//   PATCH  /api/admin/clientes/:id   { ...campos de la ficha, nuevaClave?: true | "texto" }
//   DELETE /api/admin/clientes/:id   Borra la cuenta y todo lo suyo
//
// `nuevaClave: true` genera una clave y la devuelve una vez; con texto, usa ese.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { exigirAdmin, respuestaError } from "@/lib/servidor/sesion";
import { resumenCliente } from "@/lib/servidor/clientes";
import { aCliente, DatoInvalido, generarClave, validarCliente } from "@/lib/clientes";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;

  const resumen = await resumenCliente(crearClienteAdmin(), id);
  if (!resumen) return respuestaError("no_encontrado", 404);
  return NextResponse.json(resumen);
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;

  const cuerpo = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  let datos;
  try {
    datos = validarCliente(cuerpo, true);
  } catch (e) {
    if (e instanceof DatoInvalido) return respuestaError("campo_invalido", 400, { campo: e.campo });
    throw e;
  }

  const db = crearClienteAdmin();
  const { data: actual } = await db.from("clientes").select("id, email, documento").eq("id", id).maybeSingle();
  if (!actual) return respuestaError("no_encontrado", 404);

  if (datos.documento && datos.documento !== actual.documento) {
    const { data: repetido } = await db.from("clientes").select("id").eq("documento", datos.documento).neq("id", id).maybeSingle();
    if (repetido) return respuestaError("documento_repetido", 409);
  }

  // Correo y clave viven en la cuenta (auth), no solo en la ficha.
  let clave: string | undefined;
  if (cuerpo.nuevaClave === true) clave = generarClave();
  else if (typeof cuerpo.nuevaClave === "string") {
    clave = cuerpo.nuevaClave.trim();
    if (clave.length < 8) return respuestaError("campo_invalido", 400, { campo: "clave" });
  }
  const cambioAuth: { email?: string; password?: string } = {};
  if (datos.email && datos.email !== actual.email) cambioAuth.email = datos.email;
  if (clave) cambioAuth.password = clave;
  if (Object.keys(cambioAuth).length > 0) {
    const { error } = await db.auth.admin.updateUserById(id, { ...cambioAuth, email_confirm: true });
    if (error) {
      const yaExiste = /already|registered|exists/i.test(error.message);
      return respuestaError(yaExiste ? "email_repetido" : "no_guardado", yaExiste ? 409 : 500, { mensaje: error.message });
    }
  }

  let cliente;
  if (Object.keys(datos).length > 0) {
    const { data, error } = await db.from("clientes").update(datos).eq("id", id).select("*").single();
    if (error) return respuestaError("no_guardado", 409, { mensaje: error.message });
    cliente = aCliente(data);
  }

  return NextResponse.json({ ok: true, cliente, ...(clave ? { clave } : {}) });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;

  const db = crearClienteAdmin();
  // Las cuentas del equipo no se borran desde aquí.
  const { data: delEquipo } = await db.from("equipo").select("id").eq("id", id).maybeSingle();
  if (delEquipo) return respuestaError("es_equipo", 409);

  // Borrar la cuenta borra en cascada la ficha y sus capacitaciones.
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return respuestaError("no_borrado", 500, { mensaje: error.message });
  return NextResponse.json({ ok: true });
}

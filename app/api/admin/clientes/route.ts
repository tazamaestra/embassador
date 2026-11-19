// Panel del equipo: clientes.
//
//   GET  /api/admin/clientes            Lista (sin compras: esas van en la ficha)
//   POST /api/admin/clientes            Crea la cuenta y la ficha
//        { email, nombre, documento, telefono?, negocio?, ciudad?, notas?, clave? }
//
// Las cuentas las crea el equipo: no hay registro público. Si no viene
// `clave`, se genera una y se devuelve UNA vez para enviársela al cliente.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { exigirAdmin, respuestaError } from "@/lib/servidor/sesion";
import { aCliente, DatoInvalido, generarClave, validarCliente } from "@/lib/clientes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;

  const db = crearClienteAdmin();
  const [{ data: clientes, error }, { data: caps }, { data: equipo }] = await Promise.all([
    db.from("clientes").select("*").order("creado_en", { ascending: false }).limit(1000),
    db.from("capacitaciones").select("cliente_id, horas"),
    db.from("equipo").select("id"),
  ]);
  if (error) return respuestaError("lectura", 500, { mensaje: error.message });

  const usadas = new Map<string, number>();
  for (const c of caps ?? []) usadas.set(c.cliente_id, (usadas.get(c.cliente_id) ?? 0) + Number(c.horas));
  // Las cuentas del equipo no son clientes: no salen en la lista.
  const delEquipo = new Set((equipo ?? []).map((e) => e.id));

  return NextResponse.json({
    clientes: (clientes ?? [])
      .filter((f) => !delEquipo.has(f.id))
      .map((f) => ({ ...aCliente(f), horasUsadas: usadas.get(f.id) ?? 0 })),
  });
}

export async function POST(request: Request) {
  const sesion = await exigirAdmin(request);
  if (sesion instanceof Response) return sesion;

  const cuerpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  let datos;
  try {
    datos = validarCliente(cuerpo);
  } catch (e) {
    if (e instanceof DatoInvalido) return respuestaError("campo_invalido", 400, { campo: e.campo });
    throw e;
  }

  const claveDada = typeof cuerpo?.clave === "string" ? cuerpo.clave.trim() : "";
  if (claveDada && claveDada.length < 8) return respuestaError("campo_invalido", 400, { campo: "clave" });
  const clave = claveDada || generarClave();

  const db = crearClienteAdmin();

  const { data: repetido } = await db.from("clientes").select("id").eq("documento", datos.documento!).maybeSingle();
  if (repetido) return respuestaError("documento_repetido", 409);

  const { data: creado, error: errorAuth } = await db.auth.admin.createUser({
    email: datos.email!,
    password: clave,
    email_confirm: true,
    user_metadata: { nombre: datos.nombre },
  });
  if (errorAuth || !creado.user) {
    const yaExiste = /already|registered|exists/i.test(errorAuth?.message ?? "");
    return respuestaError(yaExiste ? "email_repetido" : "no_creado", yaExiste ? 409 : 500, { mensaje: errorAuth?.message });
  }

  // El trigger de auth.users ya creó la fila básica; aquí se completa.
  const { data: fila, error } = await db
    .from("clientes")
    .upsert({ id: creado.user.id, ...datos, activo: datos.activo ?? true })
    .select("*")
    .single();
  if (error) {
    // Sin ficha la cuenta queda huérfana: se deshace.
    await db.auth.admin.deleteUser(creado.user.id);
    return respuestaError("no_creado", 500, { mensaje: error.message });
  }

  return NextResponse.json({ cliente: aCliente(fila), clave });
}

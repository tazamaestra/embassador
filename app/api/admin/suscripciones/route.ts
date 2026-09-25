// Panel del equipo: resumen y listado de suscripciones. Solo lectura.
//
// Solo para quien esté en la tabla `usuarios` (es_equipo()). El rol se
// comprueba aquí, con el token del usuario, antes de leer nada con la
// service key.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { obtenerCatalogo } from "@/lib/catalogo";
import { costoMensual, hoyISO, sumarDias } from "@/lib/suscripcion";
import { esAdmin, leerSesion, respuestaError } from "@/lib/servidor/sesion";
import { COLUMNAS_SUSCRIPCION, aSuscripcion } from "@/lib/servidor/suscripciones";
import type { EstadoSuscripcion } from "@/lib/types";

export const dynamic = "force-dynamic";

const ESTADOS: EstadoSuscripcion[] = ["activa", "pausada", "pago_pendiente", "cancelada"];

export async function GET(request: Request) {
  const sesion = await leerSesion(request);
  if (!sesion) return respuestaError("sin_sesion", 401);
  if (!(await esAdmin(sesion))) return respuestaError("prohibido", 403);

  const url = new URL(request.url);
  const estado = url.searchParams.get("estado");
  const busqueda = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const db = crearClienteAdmin();
  const catalogo = await obtenerCatalogo(db);
  const hoy = hoyISO();
  const inicioMes = `${hoy.slice(0, 7)}-01`;

  const [todas, envios, cobrosMes, atascados, cancelaciones] = await Promise.all([
    db.from("suscripciones").select(`${COLUMNAS_SUSCRIPCION}, clientes(email, nombre)`).order("creada_en", { ascending: false }).limit(2000),
    db
      .from("suscripcion_envios")
      .select("id, suscripcion_id, numero, fecha_programada, bolsas, molienda, perfil, plan_id, regalo, origen, direccion")
      .eq("estado", "programado")
      .gte("fecha_programada", sumarDias(hoy, -7))
      .lte("fecha_programada", sumarDias(hoy, 14))
      .order("fecha_programada", { ascending: true }),
    db.from("cobros").select("estado, monto_cop").gte("creado_en", inicioMes),
    db
      .from("cobros")
      .select("referencia, suscripcion_id, creado_en")
      .eq("estado", "CREANDO")
      .lt("creado_en", new Date(Date.now() - 30 * 60 * 1000).toISOString()),
    db.from("cancelaciones").select("motivo, texto, creada_en").order("creada_en", { ascending: false }).limit(500),
  ]);

  for (const r of [todas, envios, cobrosMes, atascados, cancelaciones]) {
    if (r.error) return respuestaError("lectura", 500, { mensaje: r.error.message });
  }

  type Fila = Record<string, unknown> & { clientes: { email: string; nombre: string } | null };
  const filas = (todas.data ?? []) as unknown as Fila[];
  const suscripciones = filas.map((f) => ({
    ...aSuscripcion(f),
    email: f.clientes?.email ?? "",
    nombre: f.clientes?.nombre ?? "",
  }));

  const conteo = Object.fromEntries(ESTADOS.map((e) => [e, suscripciones.filter((s) => s.estado === e).length]));

  // Lo que entra al mes si todas las activas siguen como están, sin descuentos de prepago.
  const recurrenteMensual = suscripciones
    .filter((s) => s.estado === "activa")
    .reduce((suma, s) => {
      const plan = catalogo.planes.find((p) => p.id === s.planId);
      const frecuencia = catalogo.frecuencias.find((f) => f.id === s.frecuenciaId);
      return plan && frecuencia ? suma + costoMensual(plan, frecuencia, catalogo.reglas) : suma;
    }, 0);

  const cobros = cobrosMes.data ?? [];
  const cobradoMes = cobros.filter((c) => c.estado === "APPROVED").reduce((s, c) => s + Number(c.monto_cop), 0);
  const fallidosMes = cobros.filter((c) => ["DECLINED", "ERROR", "VOIDED"].includes(c.estado)).length;

  const motivos: Record<string, number> = {};
  for (const c of cancelaciones.data ?? []) motivos[c.motivo] = (motivos[c.motivo] ?? 0) + 1;

  const porId = new Map(suscripciones.map((s) => [s.id, s]));
  const proximosEnvios = (envios.data ?? []).map((e) => ({
    ...e,
    email: porId.get(e.suscripcion_id)?.email ?? "",
  }));

  const listado = suscripciones
    .filter((s) => !estado || s.estado === estado)
    .filter((s) => !busqueda || s.email.toLowerCase().includes(busqueda) || s.nombre.toLowerCase().includes(busqueda))
    .slice(0, 300);

  return NextResponse.json({
    resumen: {
      conteo,
      recurrenteMensual,
      cobradoMes,
      fallidosMes,
      atascados: atascados.data ?? [],
    },
    motivos,
    comentarios: (cancelaciones.data ?? []).filter((c) => c.texto).slice(0, 20),
    proximosEnvios,
    suscripciones: listado,
  });
}

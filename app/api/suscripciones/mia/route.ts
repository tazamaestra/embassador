// Todo lo que muestra el panel del suscriptor, en una sola respuesta.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { leerSesion, respuestaError } from "@/lib/servidor/sesion";
import { aCobro, hayCobroEnCurso, suscripcionDelCliente } from "@/lib/servidor/suscripciones";
import type { EnvioSuscripcion, MetodoPago } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sesion = await leerSesion(request);
  if (!sesion) return respuestaError("sin_sesion", 401);

  const db = crearClienteAdmin();
  const suscripcion = await suscripcionDelCliente(db, sesion.id);
  if (!suscripcion) return NextResponse.json({ suscripcion: null });

  const [envios, cobros, metodo, direccion, enCurso] = await Promise.all([
    db
      .from("suscripcion_envios")
      .select("id, suscripcion_id, numero, fecha_programada, estado, plan_id, bolsas, molienda, regalo, origen, total_cop")
      .eq("suscripcion_id", suscripcion.id)
      .order("numero", { ascending: false })
      .limit(50),
    db
      .from("cobros")
      .select("*")
      .eq("suscripcion_id", suscripcion.id)
      .order("creado_en", { ascending: false })
      .limit(50),
    suscripcion.metodoPagoId
      ? db.from("metodos_pago").select("id, tipo, marca, ultimos4, telefono").eq("id", suscripcion.metodoPagoId).maybeSingle()
      : Promise.resolve({ data: null }),
    suscripcion.direccionId
      ? db.from("direcciones").select("nombre, telefono, linea, ciudad, departamento, notas").eq("id", suscripcion.direccionId).maybeSingle()
      : Promise.resolve({ data: null }),
    hayCobroEnCurso(db, suscripcion.id),
  ]);

  const historial: EnvioSuscripcion[] = (envios.data ?? []).map((f) => ({
    id: f.id,
    suscripcionId: f.suscripcion_id,
    numero: f.numero,
    fechaProgramada: f.fecha_programada,
    estado: f.estado,
    planId: f.plan_id,
    bolsas: f.bolsas,
    molienda: f.molienda,
    regalo: Boolean(f.regalo),
    origen: f.origen,
    totalCop: Number(f.total_cop),
  }));

  return NextResponse.json({
    suscripcion,
    envios: historial,
    cobros: (cobros.data ?? []).map(aCobro),
    metodoPago: (metodo.data as MetodoPago | null) ?? null,
    direccion: direccion.data ?? null,
    cobroEnCurso: enCurso,
  });
}

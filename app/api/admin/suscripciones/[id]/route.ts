// Panel del equipo: el detalle de una suscripción. Solo lectura.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { esAdmin, leerSesion, respuestaError } from "@/lib/servidor/sesion";
import { aCobro, cargarSuscripcion } from "@/lib/servidor/suscripciones";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await leerSesion(request);
  if (!sesion) return respuestaError("sin_sesion", 401);
  if (!(await esAdmin(sesion))) return respuestaError("prohibido", 403);

  const db = crearClienteAdmin();
  const suscripcion = await cargarSuscripcion(db, id);
  if (!suscripcion) return respuestaError("no_encontrada", 404);

  const [cliente, direccion, metodo, envios, cobros, eventos, cancelaciones] = await Promise.all([
    db.from("clientes").select("email, nombre, telefono, quiz_respuestas, quiz_recomendacion").eq("id", suscripcion.clienteId).maybeSingle(),
    suscripcion.direccionId
      ? db.from("direcciones").select("nombre, telefono, linea, ciudad, departamento, notas").eq("id", suscripcion.direccionId).maybeSingle()
      : Promise.resolve({ data: null }),
    suscripcion.metodoPagoId
      ? db.from("metodos_pago").select("tipo, marca, ultimos4, telefono, estado").eq("id", suscripcion.metodoPagoId).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from("suscripcion_envios").select("*").eq("suscripcion_id", id).order("numero", { ascending: false }),
    db.from("cobros").select("*").eq("suscripcion_id", id).order("creado_en", { ascending: false }),
    db.from("suscripcion_eventos").select("tipo, actor, estado_anterior, estado_nuevo, datos, creado_en").eq("suscripcion_id", id).order("creado_en", { ascending: false }).limit(100),
    db.from("cancelaciones").select("motivo, texto, ofertas_vistas, creada_en").eq("suscripcion_id", id),
  ]);

  return NextResponse.json({
    suscripcion,
    cliente: cliente.data,
    direccion: direccion.data,
    metodoPago: metodo.data,
    envios: envios.data ?? [],
    cobros: (cobros.data ?? []).map((c) => ({ ...aCobro(c), wompiTransactionId: c.wompi_transaction_id })),
    eventos: eventos.data ?? [],
    cancelaciones: cancelaciones.data ?? [],
  });
}

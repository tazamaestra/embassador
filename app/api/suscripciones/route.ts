// Alta de una suscripción con cobro recurrente.
//
// En este orden:
//   1. valida plan, frecuencia, molienda, perfil y prepago contra el catálogo
//   2. guarda cliente y dirección
//   3. convierte el token de Wompi (tarjeta o Nequi) en fuente de pago
//   4. crea la suscripción en pago_pendiente
//   5. cobra el primer ciclo (o el prepago completo) y espera unos segundos
//      la respuesta de Wompi para contestarle al cliente en la misma pantalla
//
// El monto sale del catálogo en la base. El navegador no manda precios.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { obtenerCatalogo } from "@/lib/catalogo";
import { planearCobro, primerEnvio, hoyISO } from "@/lib/suscripcion";
import { recomendar, validarRespuestas } from "@/lib/quiz";
import { cobroRecurrenteConfigurado, crearFuenteDePago, esperarTransaccion, ErrorWompi } from "@/lib/wompi";
import { leerSesion, respuestaError } from "@/lib/servidor/sesion";
import { guardarDireccionPrincipal, leerDireccion } from "@/lib/servidor/direccion";
import {
  guardarMetodoPago, iniciarCobro, registrarEvento, resolverCobro, suscripcionDelCliente,
} from "@/lib/servidor/suscripciones";

export const maxDuration = 30;

interface Cuerpo {
  planId?: string;
  frecuenciaId?: string;
  moliendaId?: string;
  perfilId?: string;
  prepagoId?: string;
  direccion?: unknown;
  quiz?: unknown;
  pago?: {
    tipo?: "CARD" | "NEQUI";
    token?: string;
    acceptanceToken?: string;
    personalAuthToken?: string;
  };
}

export async function POST(request: Request) {
  if (!cobroRecurrenteConfigurado()) return respuestaError("wompi_sin_configurar", 503);

  const sesion = await leerSesion(request);
  if (!sesion) return respuestaError("sin_sesion", 401);

  let cuerpo: Cuerpo;
  try {
    cuerpo = (await request.json()) as Cuerpo;
  } catch {
    return respuestaError("cuerpo_invalido", 400);
  }

  const db = crearClienteAdmin();
  const catalogo = await obtenerCatalogo(db);

  const plan = catalogo.planes.find((p) => p.id === cuerpo.planId);
  const frecuencia = catalogo.frecuencias.find((f) => f.id === cuerpo.frecuenciaId);
  const prepago = catalogo.prepagos.find((p) => p.id === cuerpo.prepagoId);
  const molienda = catalogo.moliendas.find((m) => m.id === cuerpo.moliendaId);
  const perfil = catalogo.perfiles.find((p) => p.id === cuerpo.perfilId);
  if (!plan || !frecuencia || !prepago || !molienda || !perfil) return respuestaError("plan_desconocido", 400);

  const direccion = leerDireccion(cuerpo.direccion);
  if (!direccion) return respuestaError("direccion_incompleta", 400);

  const pago = cuerpo.pago;
  if (!pago?.token || !pago.acceptanceToken || !pago.personalAuthToken || (pago.tipo !== "CARD" && pago.tipo !== "NEQUI")) {
    return respuestaError("pago_incompleto", 400);
  }

  // Una suscripción viva por cliente. Si ya tiene una, se gestiona desde la cuenta.
  const existente = await suscripcionDelCliente(db, sesion.id);
  if (existente && existente.estado !== "cancelada") return respuestaError("ya_suscrito", 409);

  // ── Cliente y dirección ─────────────────────────────────
  const { error: errorCliente } = await db
    .from("clientes")
    .upsert({ id: sesion.id, email: sesion.email, nombre: direccion.nombre, telefono: direccion.telefono });
  if (errorCliente) return respuestaError("cliente_no_guardado", 500);

  let direccionId: string;
  try {
    direccionId = await guardarDireccionPrincipal(db, sesion.id, direccion);
  } catch {
    return respuestaError("direccion_no_guardada", 500);
  }

  // Las respuestas del quiz van al perfil. Si vienen mal, se ignoran: no
  // son razón para frenar un alta.
  if (cuerpo.quiz) {
    try {
      const respuestas = validarRespuestas(cuerpo.quiz, catalogo.quiz, catalogo.perfiles.map((p) => p.id));
      await db.from("clientes").update({
        quiz_respuestas: respuestas,
        quiz_recomendacion: recomendar(respuestas, catalogo.quiz, catalogo.planes, catalogo.frecuencias),
        quiz_respondido_en: new Date().toISOString(),
      }).eq("id", sesion.id);
    } catch {
      // Respuestas inválidas: el alta sigue.
    }
  }

  // ── Fuente de pago ──────────────────────────────────────
  let metodoPagoId: string;
  try {
    const fuente = await crearFuenteDePago({
      tipo: pago.tipo,
      token: pago.token,
      email: sesion.email,
      acceptanceToken: pago.acceptanceToken,
      personalAuthToken: pago.personalAuthToken,
    });
    metodoPagoId = await guardarMetodoPago(db, sesion.id, fuente);
  } catch (e) {
    console.error("[alta] No se creó la fuente de pago:", e instanceof ErrorWompi ? JSON.stringify(e.detalle) : e);
    return respuestaError("medio_de_pago_rechazado", 402);
  }

  // ── Suscripción ─────────────────────────────────────────
  const hoy = hoyISO();
  const { data: fila, error: errorSus } = await db
    .from("suscripciones")
    .insert({
      cliente_id: sesion.id,
      plan_id: plan.id,
      frecuencia_id: frecuencia.id,
      prepago_id: prepago.id,
      molienda: molienda.id,
      perfil: perfil.id,
      estado: "pago_pendiente",
      proximo_envio: primerEnvio(catalogo.reglas, hoy),
      direccion_id: direccionId,
      metodo_pago_id: metodoPagoId,
      ciclo: 0,
      envios_hechos: 0,
    })
    .select("id")
    .single();

  if (errorSus || !fila) {
    // 23505: dos pestañas dieron "pagar" a la vez; la otra ya creó la suscripción.
    return respuestaError(errorSus?.code === "23505" ? "ya_suscrito" : "suscripcion_no_creada", errorSus?.code === "23505" ? 409 : 500);
  }

  const suscripcion = await suscripcionDelCliente(db, sesion.id);
  if (!suscripcion) return respuestaError("suscripcion_no_creada", 500);

  await registrarEvento(db, {
    suscripcionId: suscripcion.id, tipo: "alta", actor: "cliente", estadoNuevo: "pago_pendiente",
    datos: { planId: plan.id, frecuenciaId: frecuencia.id, prepagoId: prepago.id },
  });

  // ── Primer cobro ────────────────────────────────────────
  let cobro;
  try {
    cobro = await iniciarCobro(db, suscripcion, catalogo, planearCobro(suscripcion, catalogo, "alta"), sesion.email);
  } catch (e) {
    console.error("[alta] No se pudo iniciar el cobro:", e);
    return NextResponse.json({ ok: true, suscripcionId: suscripcion.id, cobro: "ERROR" });
  }

  let estado = cobro.estado;
  if (estado === "PENDING") {
    const { data: tx } = await db.from("cobros").select("wompi_transaction_id").eq("id", cobro.id).single();
    const final = tx?.wompi_transaction_id ? await esperarTransaccion(tx.wompi_transaction_id) : null;
    if (final) {
      await resolverCobro(db, catalogo, cobro.referencia, final.status, {
        transaccionId: final.id, montoEnCentavos: final.amountInCents, motivo: final.statusMessage,
      });
      estado = final.status;
    }
  }

  return NextResponse.json({ ok: true, suscripcionId: suscripcion.id, cobro: estado });
}

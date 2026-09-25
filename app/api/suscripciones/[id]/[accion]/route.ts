// Acciones del suscriptor sobre su suscripción. Una ruta por acción:
//
//   POST /api/suscripciones/:id/pausar       { meses }
//   POST /api/suscripciones/:id/reanudar
//   POST /api/suscripciones/:id/saltar
//   POST /api/suscripciones/:id/cambiar      { planId?, frecuenciaId?, prepagoId?, moliendaId?, perfilId? }
//   POST /api/suscripciones/:id/direccion    { direccion }
//   POST /api/suscripciones/:id/metodo-pago  { pago }   (con pago pendiente, cobra de una)
//   POST /api/suscripciones/:id/reintentar
//   POST /api/suscripciones/:id/cancelar     { motivo, texto?, ofertasVistas? }
//
// Cualquier acción acepta `retencion: "<oferta>"` cuando viene del flujo de
// cancelación: queda en la bitácora para saber qué oferta retuvo a quién.
//
// Las reglas son las de lib/suscripcion.ts. Aquí solo se comprueba que la
// suscripción sea de quien llama, se aplica la función y se guarda.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { obtenerCatalogo } from "@/lib/catalogo";
import {
  TransicionInvalida, cambiar, cancelar, enviosPrepagadosAlCancelar, pausar, planearCobro,
  reanudar, saltarEnvio,
} from "@/lib/suscripcion";
import { crearFuenteDePago, esperarTransaccion, ErrorWompi } from "@/lib/wompi";
import { leerSesion, respuestaError } from "@/lib/servidor/sesion";
import { guardarDireccionPrincipal, leerDireccion } from "@/lib/servidor/direccion";
import {
  CobroYaEnCurso, cargarSuscripcion, crearEnvio, guardarMetodoPago, guardarSuscripcion,
  hayCobroEnCurso, iniciarCobro, registrarCancelacion, registrarEvento, resolverCobro,
} from "@/lib/servidor/suscripciones";
import { MOTIVOS_CANCELACION, type Catalogo, type MotivoCancelacion, type Suscripcion } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 30;

type Cuerpo = Record<string, unknown>;

/** Cobra ya lo pendiente, a pedido del cliente. No gasta reintentos. */
async function cobrarAhora(db: SupabaseClient, s: Suscripcion, catalogo: Catalogo, email: string) {
  const cobro = await iniciarCobro(db, s, catalogo, planearCobro(s, catalogo, "manual"), email);
  if (cobro.estado !== "PENDING") return cobro.estado;

  const { data: tx } = await db.from("cobros").select("wompi_transaction_id").eq("id", cobro.id).single();
  const final = tx?.wompi_transaction_id ? await esperarTransaccion(tx.wompi_transaction_id) : null;
  if (!final) return "PENDING";
  await resolverCobro(db, catalogo, cobro.referencia, final.status, {
    transaccionId: final.id, montoEnCentavos: final.amountInCents, motivo: final.statusMessage,
  });
  return final.status;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; accion: string }> }
) {
  const { id, accion } = await params;

  const sesion = await leerSesion(request);
  if (!sesion) return respuestaError("sin_sesion", 401);

  const cuerpo = ((await request.json().catch(() => ({}))) ?? {}) as Cuerpo;
  const db = crearClienteAdmin();

  const s = await cargarSuscripcion(db, id);
  // 404 y no 403: no se confirma que exista una suscripción ajena.
  if (!s || s.clienteId !== sesion.id) return respuestaError("no_encontrada", 404);

  const catalogo = await obtenerCatalogo(db);
  const enCurso = await hayCobroEnCurso(db, s.id);
  const retencion = typeof cuerpo.retencion === "string" ? cuerpo.retencion.slice(0, 40) : null;
  const datosRetencion = retencion ? { retencion } : {};

  try {
    switch (accion) {
      case "pausar": {
        const meses = Number(cuerpo.meses);
        const siguiente = pausar(s, meses, catalogo.reglas, enCurso);
        await guardarSuscripcion(db, s, siguiente, { tipo: "pausada", actor: "cliente", datos: { meses, ...datosRetencion } });
        return NextResponse.json({ ok: true, pausadaHasta: siguiente.pausadaHasta });
      }

      case "reanudar": {
        const siguiente = reanudar(s, catalogo.reglas);
        await guardarSuscripcion(db, s, siguiente, { tipo: "reanudada", actor: "cliente" });
        return NextResponse.json({ ok: true, proximoEnvio: siguiente.proximoEnvio });
      }

      case "saltar": {
        const frecuencia = catalogo.frecuencias.find((f) => f.id === s.frecuenciaId);
        if (!frecuencia) return respuestaError("catalogo_desincronizado", 500);
        const r = saltarEnvio(s, frecuencia, enCurso);
        await guardarSuscripcion(db, s, r.suscripcion, { tipo: "envio_saltado", actor: "cliente", datos: r.envio });
        await crearEnvio(db, r.suscripcion, catalogo, r.envio, { estado: "saltado", origen: "saltado", valorCop: 0 });
        return NextResponse.json({ ok: true, proximoEnvio: r.suscripcion.proximoEnvio });
      }

      case "cambiar": {
        const texto = (k: string) => (typeof cuerpo[k] === "string" ? (cuerpo[k] as string) : undefined);
        const cambios = {
          planId: texto("planId"),
          frecuenciaId: texto("frecuenciaId"),
          prepagoId: texto("prepagoId"),
          moliendaId: texto("moliendaId"),
          perfilId: texto("perfilId"),
        };
        const siguiente = cambiar(s, cambios, catalogo);
        await guardarSuscripcion(db, s, siguiente, {
          tipo: "cambio", actor: "cliente",
          datos: { ...Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined)), ...datosRetencion },
        });
        return NextResponse.json({ ok: true, pendientes: siguiente.cambiosPendientes });
      }

      case "direccion": {
        const direccion = leerDireccion(cuerpo.direccion);
        if (!direccion) return respuestaError("direccion_incompleta", 400);
        const direccionId = await guardarDireccionPrincipal(db, sesion.id, direccion);
        if (direccionId !== s.direccionId) {
          await guardarSuscripcion(db, s, { ...s, direccionId }, { tipo: "direccion", actor: "cliente" });
        } else {
          await registrarEvento(db, { suscripcionId: s.id, tipo: "direccion", actor: "cliente" });
        }
        return NextResponse.json({ ok: true });
      }

      case "metodo-pago": {
        if (s.estado === "cancelada") return respuestaError("estado", 409);
        const pago = (cuerpo.pago ?? {}) as Cuerpo;
        const tipo = pago.tipo === "CARD" || pago.tipo === "NEQUI" ? pago.tipo : null;
        if (!tipo || !pago.token || !pago.acceptanceToken || !pago.personalAuthToken) {
          return respuestaError("pago_incompleto", 400);
        }

        let metodoPagoId: string;
        try {
          const fuente = await crearFuenteDePago({
            tipo,
            token: String(pago.token),
            email: sesion.email,
            acceptanceToken: String(pago.acceptanceToken),
            personalAuthToken: String(pago.personalAuthToken),
          });
          metodoPagoId = await guardarMetodoPago(db, sesion.id, fuente);
        } catch (e) {
          console.error("[metodo-pago]", e instanceof ErrorWompi ? JSON.stringify(e.detalle) : e);
          return respuestaError("medio_de_pago_rechazado", 402);
        }

        const conMetodo = { ...s, metodoPagoId };
        await guardarSuscripcion(db, s, conMetodo, { tipo: "metodo_pago", actor: "cliente" });

        // Con pago pendiente, el medio nuevo se prueba de una: es para eso
        // que el cliente lo cambió.
        const cobro = s.estado === "pago_pendiente" && !enCurso
          ? await cobrarAhora(db, conMetodo, catalogo, sesion.email)
          : null;
        return NextResponse.json({ ok: true, cobro });
      }

      case "reintentar": {
        if (s.estado !== "pago_pendiente") return respuestaError("estado", 409);
        if (!s.metodoPagoId) return respuestaError("sin_medio_de_pago", 409);
        if (enCurso) return respuestaError("cobro_en_curso", 409);
        return NextResponse.json({ ok: true, cobro: await cobrarAhora(db, s, catalogo, sesion.email) });
      }

      case "cancelar": {
        const motivo = MOTIVOS_CANCELACION.includes(cuerpo.motivo as (typeof MOTIVOS_CANCELACION)[number])
          ? (cuerpo.motivo as MotivoCancelacion)
          : "prefiero_no_decir";
        const texto = typeof cuerpo.texto === "string" ? cuerpo.texto : "";
        const ofertas = Array.isArray(cuerpo.ofertasVistas)
          ? cuerpo.ofertasVistas.filter((x): x is string => typeof x === "string").slice(0, 10)
          : [];

        const frecuencia = catalogo.frecuencias.find((f) => f.id === s.frecuenciaId);
        const prepagados = frecuencia ? enviosPrepagadosAlCancelar(s, frecuencia) : [];
        const siguiente = cancelar(s);

        await guardarSuscripcion(db, s, siguiente, {
          tipo: "cancelada", actor: "cliente", datos: { motivo, enviosPrepagados: prepagados.length },
        });
        await registrarCancelacion(db, siguiente, motivo, texto, ofertas);

        // Lo que ya pagó por adelantado le llega igual.
        const plan = catalogo.planes.find((p) => p.id === s.planId);
        const prepago = catalogo.prepagos.find((p) => p.id === s.prepagoId);
        const valorEnvio = plan ? Math.round(plan.precioEnvioCop * (1 - (prepago?.descuentoPct ?? 0) / 100)) : 0;
        for (const envio of prepagados) {
          await crearEnvio(db, siguiente, catalogo, {
            ...envio, bolsas: plan?.bolsas ?? 1, regalo: false,
            planId: s.planId, moliendaId: s.moliendaId, perfilId: s.perfilId,
          }, { estado: "programado", origen: "prepago", valorCop: valorEnvio });
        }
        return NextResponse.json({ ok: true, enviosPendientes: prepagados });
      }

      default:
        return respuestaError("accion_desconocida", 404);
    }
  } catch (e) {
    if (e instanceof TransicionInvalida) return respuestaError(e.codigo, 409, { mensaje: e.message });
    if (e instanceof CobroYaEnCurso) return respuestaError("cobro_en_curso", 409);
    console.error(`[suscripcion ${accion}] ${s.id}:`, e);
    return respuestaError("error", 500);
  }
}

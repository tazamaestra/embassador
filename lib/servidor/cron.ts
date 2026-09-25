// El trabajo del día. SOLO SERVIDOR. Lo llama /api/cron/diario (Vercel Cron).
//
// Cuatro pasos, cada uno idempotente: correrlo dos veces el mismo día no
// cobra dos veces ni duplica envíos.
//   1. Reanudar las pausas que vencieron.
//   2. Resolver los envíos que llegaron a su fecha de cobro: cobrar, o
//      descontar del prepago.
//   3. Reintentar los cobros fallidos que ya toca reintentar.
//   4. Conciliar con Wompi los cobros que siguen PENDING (por si se perdió
//      un webhook).
//
// Una suscripción que falla no detiene a las demás: el error se anota y se
// sigue con la siguiente.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  debeReanudarse, debeReintentar, decidirCiclo, planearCobro, reanudar, sumarDias,
} from "@/lib/suscripcion";
import { consultarTransaccion } from "@/lib/wompi";
import {
  COLUMNAS_SUSCRIPCION, CobroYaEnCurso, aSuscripcion, crearEnvio, guardarSuscripcion,
  hayCobroEnCurso, iniciarCobro, resolverCobro, SinMedioDePago,
} from "./suscripciones";
import type { Catalogo, Suscripcion } from "@/lib/types";

export interface ResumenDia {
  fecha: string;
  reanudadas: number;
  cobrosIniciados: number;
  enviosPrepagados: number;
  reintentos: number;
  conciliados: number;
  /** Cobros sin respuesta de Wompi: los revisa una persona. */
  atascados: string[];
  errores: { suscripcionId: string; paso: string; mensaje: string }[];
}

async function emailDe(db: SupabaseClient, clienteId: string): Promise<string> {
  const { data } = await db.from("clientes").select("email").eq("id", clienteId).maybeSingle();
  return data?.email ?? "";
}

function mensaje(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}

export async function procesarDia(db: SupabaseClient, catalogo: Catalogo, hoy: string): Promise<ResumenDia> {
  const resumen: ResumenDia = {
    fecha: hoy, reanudadas: 0, cobrosIniciados: 0, enviosPrepagados: 0, reintentos: 0,
    conciliados: 0, atascados: [], errores: [],
  };
  const fallo = (s: Suscripcion, paso: string, e: unknown) => {
    const m = mensaje(e);
    console.error(`[cron] ${paso} ${s.id}: ${m}`);
    resumen.errores.push({ suscripcionId: s.id, paso, mensaje: m });
  };

  // ── 1. Pausas vencidas ────────────────────────────────────────────────
  const { data: pausadas, error: e1 } = await db
    .from("suscripciones")
    .select(COLUMNAS_SUSCRIPCION)
    .eq("estado", "pausada")
    .lte("pausada_hasta", hoy);
  if (e1) throw e1;

  for (const fila of pausadas ?? []) {
    const s = aSuscripcion(fila);
    if (!debeReanudarse(s, hoy)) continue;
    try {
      await guardarSuscripcion(db, s, reanudar(s, catalogo.reglas, hoy), { tipo: "reanudada_sola", actor: "sistema" });
      resumen.reanudadas++;
    } catch (e) {
      fallo(s, "reanudar", e);
    }
  }

  // ── 2. Envíos que llegan a su fecha de cobro ──────────────────────────
  const limite = sumarDias(hoy, catalogo.reglas.diasCobroAntesEnvio);
  const { data: activas, error: e2 } = await db
    .from("suscripciones")
    .select(COLUMNAS_SUSCRIPCION)
    .eq("estado", "activa")
    .lte("proximo_envio", limite);
  if (e2) throw e2;

  for (const fila of activas ?? []) {
    const s = aSuscripcion(fila);
    try {
      const decision = decidirCiclo(s, catalogo, await hayCobroEnCurso(db, s.id), hoy);

      if (decision.tipo === "consumir_prepago") {
        await guardarSuscripcion(db, s, decision.suscripcion, {
          tipo: "envio_prepagado", actor: "sistema", datos: { numero: decision.envio.numero },
        });
        const prepago = catalogo.prepagos.find((p) => p.id === s.prepagoId);
        const plan = catalogo.planes.find((p) => p.id === s.planId);
        const valor = plan ? Math.round(plan.precioEnvioCop * (1 - (prepago?.descuentoPct ?? 0) / 100)) : 0;
        await crearEnvio(db, decision.suscripcion, catalogo, decision.envio, {
          estado: "programado", origen: "prepago", valorCop: valor,
        });
        resumen.enviosPrepagados++;
      } else if (decision.tipo === "cobrar") {
        // Los cambios que esperaban la renovación se guardan antes de cobrar,
        // para que lo cobrado y lo guardado digan lo mismo.
        if (JSON.stringify(decision.suscripcion) !== JSON.stringify(s)) {
          await guardarSuscripcion(db, s, decision.suscripcion, { tipo: "renovacion", actor: "sistema" });
        }
        await iniciarCobro(db, decision.suscripcion, catalogo, decision.cobro, await emailDe(db, s.clienteId));
        resumen.cobrosIniciados++;
      }
    } catch (e) {
      if (e instanceof SinMedioDePago) {
        // Sin con qué cobrar: pasa a pago pendiente y espera al cliente.
        await guardarSuscripcion(db, s, { ...s, estado: "pago_pendiente", proximoReintento: null }, {
          tipo: "sin_medio_de_pago", actor: "sistema",
        }).catch((err) => fallo(s, "sin_medio", err));
      } else if (!(e instanceof CobroYaEnCurso)) {
        fallo(s, "ciclo", e);
      }
    }
  }

  // ── 3. Reintentos ─────────────────────────────────────────────────────
  const { data: pendientes, error: e3 } = await db
    .from("suscripciones")
    .select(COLUMNAS_SUSCRIPCION)
    .eq("estado", "pago_pendiente")
    .not("metodo_pago_id", "is", null)
    .lte("proximo_reintento", hoy);
  if (e3) throw e3;

  for (const fila of pendientes ?? []) {
    const s = aSuscripcion(fila);
    try {
      if (!debeReintentar(s, await hayCobroEnCurso(db, s.id), hoy)) continue;
      await iniciarCobro(db, s, catalogo, planearCobro(s, catalogo, "reintento"), await emailDe(db, s.clienteId));
      resumen.reintentos++;
    } catch (e) {
      if (!(e instanceof CobroYaEnCurso)) fallo(s, "reintento", e);
    }
  }

  // ── 4. Conciliación ───────────────────────────────────────────────────
  const haceMediaHora = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: enVuelo, error: e4 } = await db
    .from("cobros")
    .select("id, referencia, estado, wompi_transaction_id, suscripcion_id")
    .in("estado", ["CREANDO", "PENDING"])
    .lt("creado_en", haceMediaHora);
  if (e4) throw e4;

  for (const c of enVuelo ?? []) {
    // CREANDO sin transacción: el proceso murió entre guardar el cobro y
    // hablar con Wompi. No se sabe si Wompi alcanzó a cobrar, así que no se
    // reintenta solo (podría cobrar dos veces). Queda para revisión.
    if (!c.wompi_transaction_id) {
      resumen.atascados.push(c.referencia);
      continue;
    }
    try {
      const t = await consultarTransaccion(c.wompi_transaction_id);
      if (t.status === "PENDING") continue;
      await resolverCobro(db, catalogo, c.referencia, t.status, {
        transaccionId: t.id, montoEnCentavos: t.amountInCents, motivo: t.statusMessage,
      });
      resumen.conciliados++;
    } catch (e) {
      resumen.errores.push({ suscripcionId: c.suscripcion_id, paso: "conciliar", mensaje: mensaje(e) });
    }
  }

  return resumen;
}

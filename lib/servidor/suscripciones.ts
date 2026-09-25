// Persistencia de la suscripción y de sus cobros. SOLO SERVIDOR.
//
// Aquí no se decide nada: las reglas están en lib/suscripcion.ts. Este
// módulo carga filas, llama a la función pura que toca, guarda lo que
// devuelve y habla con Wompi. Usa la service key: quien lo llama ya
// comprobó que la suscripción es de quien la pide (o que es admin, el cron
// o el webhook).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aplicarCobroAprobado, aplicarCobroRechazado, type CobroPlaneado, type EnvioPlaneado,
} from "@/lib/suscripcion";
import { cobrarFuenteDePago, ErrorWompi, type TransaccionCreada } from "@/lib/wompi";
import { correoBienvenida, enviarCorreo } from "@/lib/correo";
import type {
  Catalogo, Cobro, EstadoCobro, EstadoSuscripcion, MotivoCancelacion, OrigenCobro,
  Suscripcion,
} from "@/lib/types";

type Db = SupabaseClient;
type Actor = "cliente" | "sistema" | "wompi" | "admin";

export const COLUMNAS_SUSCRIPCION =
  "id, cliente_id, plan_id, frecuencia_id, prepago_id, molienda, perfil, estado, proximo_envio, pausada_hasta, cambios_pendientes, metodo_pago_id, envios_prepagados_restantes, intentos_fallidos, proximo_reintento, ciclo, envios_hechos, envios_saltados, direccion_id, creada_en, pausada_en, cancelada_en";

const soloFecha = (v: unknown) => (v ? String(v).slice(0, 10) : null);

export function aSuscripcion(f: Record<string, unknown>): Suscripcion {
  return {
    id: String(f.id),
    clienteId: String(f.cliente_id),
    planId: String(f.plan_id),
    frecuenciaId: String(f.frecuencia_id),
    prepagoId: String(f.prepago_id),
    moliendaId: String(f.molienda),
    perfilId: String(f.perfil),
    estado: f.estado as EstadoSuscripcion,
    proximoEnvio: String(f.proximo_envio),
    pausadaHasta: soloFecha(f.pausada_hasta),
    cambiosPendientes: (f.cambios_pendientes as Suscripcion["cambiosPendientes"]) ?? {},
    metodoPagoId: (f.metodo_pago_id as string | null) ?? null,
    enviosPrepagadosRestantes: Number(f.envios_prepagados_restantes ?? 0),
    intentosFallidos: Number(f.intentos_fallidos ?? 0),
    proximoReintento: soloFecha(f.proximo_reintento),
    ciclo: Number(f.ciclo ?? 0),
    enviosHechos: Number(f.envios_hechos ?? 0),
    enviosSaltados: Number(f.envios_saltados ?? 0),
    direccionId: (f.direccion_id as string | null) ?? null,
    creadaEn: String(f.creada_en).slice(0, 10),
    pausadaEn: soloFecha(f.pausada_en),
    canceladaEn: soloFecha(f.cancelada_en),
  };
}

function aFila(s: Suscripcion) {
  return {
    plan_id: s.planId,
    frecuencia_id: s.frecuenciaId,
    prepago_id: s.prepagoId,
    molienda: s.moliendaId,
    perfil: s.perfilId,
    estado: s.estado,
    proximo_envio: s.proximoEnvio,
    pausada_hasta: s.pausadaHasta,
    cambios_pendientes: s.cambiosPendientes,
    metodo_pago_id: s.metodoPagoId,
    envios_prepagados_restantes: s.enviosPrepagadosRestantes,
    intentos_fallidos: s.intentosFallidos,
    proximo_reintento: s.proximoReintento,
    ciclo: s.ciclo,
    envios_hechos: s.enviosHechos,
    envios_saltados: s.enviosSaltados,
    direccion_id: s.direccionId,
    pausada_en: s.pausadaEn,
    cancelada_en: s.canceladaEn,
    actualizada_en: new Date().toISOString(),
  };
}

export function aCobro(f: Record<string, unknown>): Cobro {
  return {
    id: String(f.id),
    suscripcionId: String(f.suscripcion_id),
    referencia: String(f.referencia),
    ciclo: Number(f.ciclo),
    origen: f.origen as OrigenCobro,
    enviosCubiertos: Number(f.envios_cubiertos),
    montoCop: Number(f.monto_cop),
    estado: f.estado as EstadoCobro,
    motivo: (f.motivo as string | null) ?? null,
    creadoEn: String(f.creado_en),
  };
}

// ── Lectura ────────────────────────────────────────────────────────────────

export async function cargarSuscripcion(db: Db, id: string): Promise<Suscripcion | null> {
  const { data, error } = await db.from("suscripciones").select(COLUMNAS_SUSCRIPCION).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? aSuscripcion(data) : null;
}

/** La suscripción viva del cliente (hay una sola), o la última cancelada. */
export async function suscripcionDelCliente(db: Db, clienteId: string): Promise<Suscripcion | null> {
  const { data, error } = await db
    .from("suscripciones")
    .select(COLUMNAS_SUSCRIPCION)
    .eq("cliente_id", clienteId)
    .order("creada_en", { ascending: false })
    .limit(5);
  if (error) throw error;
  const filas = (data ?? []).map(aSuscripcion);
  return filas.find((s) => s.estado !== "cancelada") ?? filas[0] ?? null;
}

export async function hayCobroEnCurso(db: Db, suscripcionId: string): Promise<boolean> {
  const { count, error } = await db
    .from("cobros")
    .select("id", { count: "exact", head: true })
    .eq("suscripcion_id", suscripcionId)
    .in("estado", ["CREANDO", "PENDING"]);
  if (error) throw error;
  return (count ?? 0) > 0;
}

// ── Escritura ──────────────────────────────────────────────────────────────

export async function registrarEvento(
  db: Db,
  e: {
    suscripcionId: string;
    tipo: string;
    actor: Actor;
    estadoAnterior?: EstadoSuscripcion | null;
    estadoNuevo?: EstadoSuscripcion | null;
    datos?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await db.from("suscripcion_eventos").insert({
    suscripcion_id: e.suscripcionId,
    tipo: e.tipo,
    actor: e.actor,
    estado_anterior: e.estadoAnterior ?? null,
    estado_nuevo: e.estadoNuevo ?? null,
    datos: e.datos ?? {},
  });
  // La bitácora es para auditar: si falla, se avisa, pero no se deshace la acción.
  if (error) console.error(`[suscripciones] No se registró el evento ${e.tipo}:`, error.message);
}

/** Guarda una suscripción ya transformada y deja la huella en la bitácora. */
export async function guardarSuscripcion(
  db: Db,
  anterior: Suscripcion,
  siguiente: Suscripcion,
  evento: { tipo: string; actor: Actor; datos?: Record<string, unknown> }
): Promise<void> {
  const { error } = await db.from("suscripciones").update(aFila(siguiente)).eq("id", siguiente.id);
  if (error) throw error;
  await registrarEvento(db, {
    suscripcionId: siguiente.id,
    tipo: evento.tipo,
    actor: evento.actor,
    estadoAnterior: anterior.estado,
    estadoNuevo: siguiente.estado,
    datos: evento.datos,
  });
}

export async function registrarCancelacion(
  db: Db,
  s: Suscripcion,
  motivo: MotivoCancelacion,
  texto = "",
  ofertasVistas: string[] = []
): Promise<void> {
  const { error } = await db.from("cancelaciones").insert({
    suscripcion_id: s.id,
    cliente_id: s.clienteId,
    motivo,
    texto: texto.slice(0, 1000),
    ofertas_vistas: ofertasVistas,
  });
  if (error) console.error(`[suscripciones] No se guardó el motivo de cancelación de ${s.id}:`, error.message);
}

// ── Envíos y pedidos ───────────────────────────────────────────────────────

async function direccionDe(db: Db, direccionId: string | null) {
  if (!direccionId) return null;
  const { data } = await db
    .from("direcciones")
    .select("nombre, telefono, linea, ciudad, departamento, notas")
    .eq("id", direccionId)
    .maybeSingle();
  return data as null | {
    nombre: string; telefono: string; linea: string; ciudad: string; departamento: string; notas: string;
  };
}

/** Consecutivo propio en `pedidos`: SUB-000001, SUB-000002… */
async function siguienteNumeroPedido(db: Db, prefijo: string): Promise<string> {
  const { data } = await db
    .from("pedidos")
    .select("numero")
    .like("numero", `${prefijo}-%`)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ultimo = data?.numero ? Number(String(data.numero).split("-")[1]) : 0;
  return `${prefijo}-${String((Number.isFinite(ultimo) ? ultimo : 0) + 1).padStart(6, "0")}`;
}

/**
 * Deja un envío resuelto: la fila del historial con su foto (plan, bolsas,
 * molienda, dirección) y, si sale de verdad, el pedido para el software de
 * gestión. El pedido no puede tumbar el envío: si falla, se anota.
 */
export async function crearEnvio(
  db: Db,
  s: Suscripcion,
  catalogo: Catalogo,
  envio: EnvioPlaneado | { numero: number; fecha: string },
  o: { estado: "programado" | "saltado"; origen: string; cobroId?: string | null; valorCop: number }
): Promise<void> {
  const completo = "bolsas" in envio ? envio : null;
  const direccion = o.estado === "programado" ? await direccionDe(db, s.direccionId) : null;

  const { error } = await db.from("suscripcion_envios").upsert(
    {
      suscripcion_id: s.id,
      numero: envio.numero,
      fecha_programada: envio.fecha,
      estado: o.estado,
      plan_id: completo?.planId ?? s.planId,
      bolsas: completo?.bolsas ?? 0,
      molienda: completo?.moliendaId ?? s.moliendaId,
      perfil: completo?.perfilId ?? s.perfilId,
      regalo: completo?.regalo ?? false,
      origen: o.origen,
      cobro_id: o.cobroId ?? null,
      total_cop: o.valorCop,
      direccion,
    },
    { onConflict: "suscripcion_id,numero" }
  );
  if (error) throw error;

  if (o.estado !== "programado" || !completo) return;

  const plan = catalogo.planes.find((p) => p.id === completo.planId);
  const { operacion } = catalogo;
  const libras = Math.round(((completo.bolsas * (plan?.gramosBolsa ?? 0)) / operacion.gramosPorLibra) * 100) / 100;

  try {
    const numero = await siguienteNumeroPedido(db, operacion.prefijoPedido);
    const { error: errorPedido } = await db.from("pedidos").insert({
      numero,
      cliente: direccion?.nombre ?? "",
      producto_id: operacion.productoId,
      libras,
      pvp_lb: libras > 0 ? Math.round(o.valorCop / libras) : 0,
      pagado: true,
      canal: operacion.canal,
      fecha: envio.fecha,
      notas: [
        `Suscripción ${plan?.label_es ?? completo.planId}`,
        `${completo.bolsas} ${completo.bolsas === 1 ? "bolsa" : "bolsas"}${completo.regalo ? " (incluye regalo)" : ""}`,
        `molienda ${completo.moliendaId}`,
        `perfil ${completo.perfilId}`,
        direccion ? `${direccion.linea}, ${direccion.ciudad}, ${direccion.departamento}` : "",
        direccion?.telefono ?? "",
      ].filter(Boolean).join(" · "),
      entregado: false,
    });
    if (errorPedido) throw errorPedido;
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);
    console.error(`[suscripciones] Envío ${s.id}#${envio.numero} sin pedido en gestión:`, msg);
  }
}

// ── Cobros ─────────────────────────────────────────────────────────────────

export class SinMedioDePago extends Error {
  constructor() {
    super("La suscripción no tiene medio de pago.");
    this.name = "SinMedioDePago";
  }
}

export class CobroYaEnCurso extends Error {
  constructor() {
    super("Ya hay un cobro en curso para esta suscripción.");
    this.name = "CobroYaEnCurso";
  }
}

function nuevaReferencia(s: Suscripcion, ciclo: number): string {
  const azar = Math.random().toString(36).slice(2, 7);
  return `SUB-${s.id.slice(0, 8)}-${ciclo}-${Date.now().toString(36)}${azar}`.toUpperCase();
}

const FINALES: EstadoCobro[] = ["APPROVED", "DECLINED", "VOIDED", "ERROR"];

/**
 * Crea el cobro y se lo pide a Wompi. El índice cobros_uno_en_curso impide
 * dos cobros en vuelo para la misma suscripción: si otro proceso ganó la
 * carrera, el insert falla y aquí no se cobra nada.
 */
export async function iniciarCobro(
  db: Db,
  s: Suscripcion,
  catalogo: Catalogo,
  planeado: CobroPlaneado,
  email: string
): Promise<Cobro> {
  if (!s.metodoPagoId) throw new SinMedioDePago();

  const { data: metodo, error: errorMetodo } = await db
    .from("metodos_pago")
    .select("id, wompi_payment_source_id, tipo")
    .eq("id", s.metodoPagoId)
    .maybeSingle();
  if (errorMetodo) throw errorMetodo;
  if (!metodo) throw new SinMedioDePago();

  const referencia = nuevaReferencia(s, planeado.ciclo);
  const { data: fila, error } = await db
    .from("cobros")
    .insert({
      suscripcion_id: s.id,
      cliente_id: s.clienteId,
      metodo_pago_id: metodo.id,
      referencia,
      ciclo: planeado.ciclo,
      origen: planeado.origen,
      envios_cubiertos: planeado.enviosCubiertos,
      monto_cop: planeado.montoCop,
      estado: "CREANDO",
      detalle: planeado.detalle,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new CobroYaEnCurso();
    throw error;
  }

  let transaccion: TransaccionCreada;
  try {
    transaccion = await cobrarFuenteDePago({
      referencia,
      montoCop: planeado.montoCop,
      email,
      fuenteId: String(metodo.wompi_payment_source_id),
      tipo: metodo.tipo,
    });
  } catch (e) {
    // Wompi rechazó la petición (fuente anulada, datos mal): no hubo
    // transacción. Es un fallo de cobro como cualquier otro.
    const motivo = e instanceof ErrorWompi ? JSON.stringify(e.detalle).slice(0, 500) : String(e);
    await resolverCobro(db, catalogo, referencia, "ERROR", { motivo });
    return { ...aCobro(fila), estado: "ERROR", motivo };
  }

  await db
    .from("cobros")
    .update({ wompi_transaction_id: transaccion.id, estado: transaccion.status, actualizado_en: new Date().toISOString() })
    .eq("id", fila.id)
    .in("estado", ["CREANDO"]);

  if (FINALES.includes(transaccion.status)) {
    await resolverCobro(db, catalogo, referencia, transaccion.status, {
      transaccionId: transaccion.id,
      montoEnCentavos: transaccion.amountInCents,
      motivo: transaccion.statusMessage,
    });
  }

  return { ...aCobro(fila), estado: transaccion.status };
}

/**
 * El estado final de un cobro, venga del webhook, de la consulta tras
 * crearlo o de la conciliación del cron. Idempotente: el update solo pasa
 * si el cobro seguía en vuelo, así que un evento repetido no hace nada.
 */
export async function resolverCobro(
  db: Db,
  catalogo: Catalogo,
  referencia: string,
  estado: EstadoCobro,
  extra: { transaccionId?: string; montoEnCentavos?: number; motivo?: string | null } = {}
): Promise<"resuelto" | "ya_resuelto" | "desconocido"> {
  const cambios: Record<string, unknown> = {
    estado,
    motivo: extra.motivo ?? null,
    actualizado_en: new Date().toISOString(),
  };
  if (extra.transaccionId) cambios.wompi_transaction_id = extra.transaccionId;

  const { data: filas, error } = await db
    .from("cobros")
    .update(cambios)
    .eq("referencia", referencia)
    .in("estado", ["CREANDO", "PENDING"])
    .select("*");
  if (error) throw error;

  if (!filas || filas.length === 0) {
    const { count } = await db.from("cobros").select("id", { count: "exact", head: true }).eq("referencia", referencia);
    return count ? "ya_resuelto" : "desconocido";
  }

  const fila = filas[0];
  const cobro = aCobro(fila);
  const s = await cargarSuscripcion(db, cobro.suscripcionId);
  if (!s) return "resuelto";

  if (estado === "APPROVED") {
    // Wompi firmó el evento, pero se revisa igual que cobró lo que pedimos.
    if (extra.montoEnCentavos !== undefined && extra.montoEnCentavos !== cobro.montoCop * 100) {
      await registrarEvento(db, {
        suscripcionId: s.id, tipo: "revisar_monto", actor: "wompi",
        datos: { referencia, esperado: cobro.montoCop * 100, recibido: extra.montoEnCentavos },
      });
      return "resuelto";
    }

    const r = aplicarCobroAprobado(
      s,
      { ciclo: cobro.ciclo, enviosCubiertos: cobro.enviosCubiertos, detalle: fila.detalle },
      catalogo
    );
    if (!r) {
      // Se canceló con el cobro en vuelo, o el ciclo ya estaba pagado. Hay
      // plata que devolver: lo decide una persona desde el panel.
      await registrarEvento(db, {
        suscripcionId: s.id, tipo: "cobro_aprobado_sin_efecto", actor: "wompi",
        datos: { referencia, montoCop: cobro.montoCop, estadoSuscripcion: s.estado },
      });
      return "resuelto";
    }

    await guardarSuscripcion(db, s, r.suscripcion, {
      tipo: cobro.origen === "alta" ? "alta_pagada" : "cobro_aprobado",
      actor: "wompi",
      datos: { referencia, montoCop: cobro.montoCop, envios: cobro.enviosCubiertos },
    });
    await crearEnvio(db, r.suscripcion, catalogo, r.envio, {
      estado: "programado",
      origen: "cobro",
      cobroId: cobro.id,
      valorCop: Math.round(cobro.montoCop / cobro.enviosCubiertos),
    });

    if (cobro.origen === "alta") await mandarBienvenida(db, r.suscripcion, catalogo, cobro.montoCop, r.envio.fecha);
    return "resuelto";
  }

  const r = aplicarCobroRechazado(s, cobro.origen, catalogo.reglas);
  if (r.suscripcion !== s) {
    await guardarSuscripcion(db, s, r.suscripcion, {
      tipo: r.cancelada ? "cancelada_por_pago" : "cobro_rechazado",
      actor: "wompi",
      datos: { referencia, estado, motivo: extra.motivo ?? null, intentos: r.suscripcion.intentosFallidos },
    });
  }
  if (r.cancelada) await registrarCancelacion(db, r.suscripcion, "pago_fallido");
  return "resuelto";
}

async function mandarBienvenida(db: Db, s: Suscripcion, catalogo: Catalogo, totalCop: number, fecha: string) {
  const { data: cliente } = await db.from("clientes").select("email, nombre").eq("id", s.clienteId).maybeSingle();
  if (!cliente?.email) return;
  const direccion = await direccionDe(db, s.direccionId);
  const plan = catalogo.planes.find((p) => p.id === s.planId);
  const nombre = (lista: { id: string; label_es: string }[], id: string) => lista.find((x) => x.id === id)?.label_es ?? id;
  const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const correo = correoBienvenida({
    nombre: direccion?.nombre || cliente.nombre || "",
    plan: plan?.label_es ?? s.planId,
    bolsas: plan?.bolsas ?? 1,
    gramosBolsa: plan?.gramosBolsa ?? 0,
    frecuencia: nombre(catalogo.frecuencias, s.frecuenciaId),
    molienda: nombre(catalogo.moliendas, s.moliendaId),
    perfil: nombre(catalogo.perfiles, s.perfilId),
    proximoDespacho: fecha,
    direccion: direccion ? `${direccion.linea}, ${direccion.ciudad}, ${direccion.departamento}` : "",
    totalCop,
    urlCuenta: `${sitio}/es/cuenta`,
  });
  await enviarCorreo({ ...correo, para: cliente.email });
}

// ── Medios de pago ─────────────────────────────────────────────────────────

export async function guardarMetodoPago(
  db: Db,
  clienteId: string,
  fuente: { id: string; tipo: "CARD" | "NEQUI"; marca: string; ultimos4: string; telefono: string; status: string }
): Promise<string> {
  const { data, error } = await db
    .from("metodos_pago")
    .upsert(
      {
        cliente_id: clienteId,
        wompi_payment_source_id: fuente.id,
        tipo: fuente.tipo,
        marca: fuente.marca,
        ultimos4: fuente.ultimos4,
        telefono: fuente.telefono ? `•••• ${fuente.telefono.slice(-4)}` : "",
        estado: fuente.status,
      },
      { onConflict: "wompi_payment_source_id" }
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

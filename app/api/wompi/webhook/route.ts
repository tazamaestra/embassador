// Webhook de Wompi: confirma el pago y activa la suscripción.
//
// Llega sin sesión del usuario, así que usa la service key. Lo primero que
// hace es validar el checksum del evento; si no cuadra, no toca la base.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { findFrecuencia, findNivel, suscripcionConfig } from "@/lib/content";
import { activar, cobroPrepago, hoyISO, librasDelEnvio } from "@/lib/suscripcion";
import { eventoValido, type EventoWompi } from "@/lib/wompi";
import type { Suscripcion } from "@/lib/types";

export async function POST(request: Request) {
  let evento: EventoWompi;
  try {
    evento = (await request.json()) as EventoWompi;
  } catch {
    return NextResponse.json({ error: "cuerpo_invalido" }, { status: 400 });
  }

  if (!eventoValido(evento)) {
    return NextResponse.json({ error: "firma_invalida" }, { status: 401 });
  }

  const transaccion = evento.data?.transaction;
  if (!transaccion?.reference) {
    return NextResponse.json({ ok: true, ignorado: "sin_referencia" });
  }

  const supabase = crearClienteAdmin();
  const referencia = transaccion.reference;
  const aprobada = transaccion.status === "APPROVED";

  // ── Compra única ────────────────────────────────────────────────────────
  if (referencia.startsWith("UNI-")) {
    await supabase
      .from("pedidos_unicos")
      .update({ estado: aprobada ? "pagado" : "fallido" })
      .eq("wompi_referencia", referencia);
    return NextResponse.json({ ok: true });
  }

  // ── Suscripción ─────────────────────────────────────────────────────────
  const { data: fila } = await supabase
    .from("suscripciones")
    .select("id, cliente_id, nivel_id, frecuencia_id, prepago_id, molienda, metodo, perfil, estado, proximo_envio, envios_hechos, envios_saltados, direccion_id, creada_en, pausada_en, cancelada_en")
    .eq("wompi_referencia", referencia)
    .maybeSingle();

  if (!fila) {
    return NextResponse.json({ ok: true, ignorado: "referencia_desconocida" });
  }

  if (!aprobada) {
    // El pago no pasó: la suscripción se queda pendiente y no cobra nada.
    return NextResponse.json({ ok: true, estado: transaccion.status });
  }

  // Idempotencia: Wompi puede reenviar el mismo evento.
  if (fila.estado === "activa") {
    return NextResponse.json({ ok: true, ignorado: "ya_activa" });
  }

  const nivel = findNivel(fila.nivel_id);
  const frecuencia = findFrecuencia(fila.frecuencia_id);
  const prepago = suscripcionConfig.prepagos.find((p) => p.id === fila.prepago_id);
  if (!nivel || !frecuencia || !prepago) {
    return NextResponse.json({ error: "catalogo_desincronizado" }, { status: 500 });
  }

  const hoy = hoyISO();
  const suscripcion: Suscripcion = {
    id: fila.id,
    clienteId: fila.cliente_id,
    nivelId: fila.nivel_id,
    frecuenciaId: fila.frecuencia_id,
    prepagoId: fila.prepago_id,
    molienda: fila.molienda,
    metodo: fila.metodo,
    perfil: fila.perfil,
    estado: fila.estado,
    proximoEnvio: fila.proximo_envio,
    enviosHechos: fila.envios_hechos,
    enviosSaltados: fila.envios_saltados,
    direccionId: fila.direccion_id,
    creadaEn: String(fila.creada_en).slice(0, 10),
    pausadaEn: null,
    canceladaEn: null,
  };

  const activada = activar(suscripcion, frecuencia, hoy);

  await supabase
    .from("suscripciones")
    .update({
      estado: activada.estado,
      envios_hechos: activada.enviosHechos,
      proximo_envio: activada.proximoEnvio,
      wompi_payment_source_id: transaccion.payment_source_id
        ? String(transaccion.payment_source_id)
        : null,
    })
    .eq("id", activada.id);

  // Primer envío. El total cobrado es el del prepago: si pagó 3 o 6 meses,
  // se cobró todo de una y los envíos siguientes ya van pagos.
  const { total } = cobroPrepago(nivel, prepago, suscripcionConfig);
  const libras = librasDelEnvio(suscripcion, nivel, suscripcionConfig);

  await supabase.from("suscripcion_envios").upsert(
    {
      suscripcion_id: activada.id,
      numero: 1,
      fecha_programada: hoy,
      estado: "cobrado",
      cafe: nivel.label_es,
      regalo: libras > nivel.libras,
      total_cop: total,
    },
    { onConflict: "suscripcion_id,numero" }
  );

  return NextResponse.json({ ok: true });
}

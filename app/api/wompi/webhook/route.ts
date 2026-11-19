// Webhook de Wompi: el estado final de cada transacción.
//
// Llega sin sesión, así que usa la service key. Lo primero es validar el
// checksum; si no cuadra, no se toca la base. Wompi reintenta un evento
// hasta que recibe 200 (a los 30 min, 3 h y 24 h): por eso cada evento se
// registra por su checksum y los repetidos se ignoran.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { eventoValido, type EventoWompi } from "@/lib/wompi";
import { registrarPago } from "@/lib/servidor/pedidos";

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

  const db = crearClienteAdmin();
  const transaccion = evento.data?.transaction;

  const { error: repetido } = await db.from("wompi_eventos").insert({
    checksum: evento.signature.checksum,
    evento: evento.event,
    transaccion_id: transaccion?.id ?? null,
    estado: transaccion?.status ?? null,
    referencia: transaccion?.reference ?? null,
    payload: evento,
  });
  if (repetido?.code === "23505") return NextResponse.json({ ok: true, ignorado: "repetido" });

  // Otros eventos quedan registrados y no hay más que hacer.
  if (evento.event !== "transaction.updated" || !transaccion?.reference) {
    return NextResponse.json({ ok: true, ignorado: evento.event });
  }

  const referencia = transaccion.reference;
  const aprobada = transaccion.status === "APPROVED";

  try {
    // Pedido del carrito: el resultado va al inventario (o al respaldo
    // local). Si falla, se reintenta con el reintento de Wompi.
    if (referencia.startsWith("PED-")) {
      await registrarPago(db, referencia, {
        aprobada,
        transaccion: transaccion.id,
        montoCop: Math.round((transaccion.amount_in_cents ?? 0) / 100),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Se borra el registro del evento para que el reintento de Wompi entre
    // de nuevo, y se responde 500 para que Wompi reintente.
    console.error(`[webhook] Falló ${referencia}:`, e);
    await db.from("wompi_eventos").delete().eq("checksum", evento.signature.checksum);
    return NextResponse.json({ error: "procesando" }, { status: 500 });
  }
}

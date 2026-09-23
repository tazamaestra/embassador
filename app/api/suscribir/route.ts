// Suscribir sin cobrar. Solo existe con FEATURE_PAGOS apagado.
//
// Hace, en este orden:
//   1. cliente y dirección (con el token del usuario, respetando RLS)
//   2. la suscripción, ya activa
//   3. el primer envío, con las libras que hay que tostar
//   4. el pedido en `pedidos`, que es lo que lee el software de gestión
//      — esta necesita la service key, porque su RLS no deja escribir a nadie más
//   5. el correo de bienvenida
//
// Los pasos 4 y 5 no pueden tumbar la suscripción: si fallan, se anotan y la
// respuesta lo dice, pero el cliente queda suscrito.

import { NextResponse } from "next/server";
import { crearClienteAdmin, crearClienteConToken } from "@/lib/supabase-admin";
import { findFrecuencia, findNivel, findPrepago, suscripcionConfig } from "@/lib/content";
import {
  cobroPrepago, hoyISO, librasDelEnvio, proximoDespacho, sumarDias,
} from "@/lib/suscripcion";
import { FEATURE_PAGOS } from "@/lib/flags";
import { correoBienvenida, enviarCorreo } from "@/lib/correo";
import type { Suscripcion } from "@/lib/types";

interface Cuerpo {
  nivel?: string;
  frecuencia?: string;
  prepago?: string;
  molienda?: string;
  metodo?: string;
  perfil?: string;
  locale?: string;
  direccion?: {
    nombre: string;
    telefono: string;
    linea: string;
    ciudad: string;
    departamento: string;
    notas?: string;
  };
}

/** Consecutivo propio: SUB-000001, SUB-000002… */
async function siguienteNumeroPedido(
  admin: ReturnType<typeof crearClienteAdmin>,
  prefijo: string
): Promise<string> {
  const { data } = await admin
    .from("pedidos")
    .select("numero")
    .like("numero", `${prefijo}-%`)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ultimo = data?.numero ? Number(String(data.numero).split("-")[1]) : 0;
  const siguiente = Number.isFinite(ultimo) ? ultimo + 1 : 1;
  return `${prefijo}-${String(siguiente).padStart(6, "0")}`;
}

export async function POST(request: Request) {
  // Con la pasarela encendida, esta ruta no debe existir: se cobra.
  if (FEATURE_PAGOS) {
    return NextResponse.json({ error: "pagos_activos" }, { status: 404 });
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "sin_sesion" }, { status: 401 });

  let cuerpo: Cuerpo;
  try {
    cuerpo = (await request.json()) as Cuerpo;
  } catch {
    return NextResponse.json({ error: "cuerpo_invalido" }, { status: 400 });
  }

  const nivel = findNivel(cuerpo.nivel ?? "");
  const frecuencia = findFrecuencia(cuerpo.frecuencia ?? "");
  const prepago = findPrepago(cuerpo.prepago ?? "");
  if (!nivel || !frecuencia || !prepago) {
    return NextResponse.json({ error: "plan_desconocido" }, { status: 400 });
  }

  const d = cuerpo.direccion;
  if (!d?.nombre || !d?.telefono || !d?.linea || !d?.ciudad || !d?.departamento) {
    return NextResponse.json({ error: "direccion_incompleta" }, { status: 400 });
  }

  const supabase = crearClienteConToken(token);
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: "sin_sesion" }, { status: 401 });
  }
  const clienteId = auth.user.id;
  const email = auth.user.email ?? "";

  // ── 1. Cliente y dirección ───────────────────────────────
  await supabase
    .from("clientes")
    .upsert({ id: clienteId, email, nombre: d.nombre, telefono: d.telefono });

  const { data: direccionExistente } = await supabase
    .from("direcciones")
    .select("id")
    .eq("cliente_id", clienteId)
    .eq("es_principal", true)
    .maybeSingle();

  const filaDireccion = {
    cliente_id: clienteId,
    nombre: d.nombre,
    telefono: d.telefono,
    linea: d.linea,
    ciudad: d.ciudad,
    departamento: d.departamento,
    notas: d.notas ?? "",
    es_principal: true,
  };

  let direccionId: string;
  if (direccionExistente) {
    direccionId = direccionExistente.id as string;
    await supabase.from("direcciones").update(filaDireccion).eq("id", direccionId);
  } else {
    const { data: nueva, error } = await supabase
      .from("direcciones")
      .insert(filaDireccion)
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ error: "direccion_no_guardada" }, { status: 500 });
    }
    direccionId = nueva.id as string;
  }

  // ── 2. La suscripción, activa de una ─────────────────────
  const hoy = hoyISO();
  const despacho = proximoDespacho(suscripcionConfig, hoy);

  const { data: filaSus, error: errorSus } = await supabase
    .from("suscripciones")
    .insert({
      cliente_id: clienteId,
      nivel_id: nivel.id,
      frecuencia_id: frecuencia.id,
      prepago_id: prepago.id,
      molienda: cuerpo.molienda ?? suscripcionConfig.moliendas[0].id,
      metodo: cuerpo.metodo ?? suscripcionConfig.metodos[0].id,
      perfil: cuerpo.perfil ?? suscripcionConfig.perfiles[0].id,
      estado: "activa",
      proximo_envio: despacho,
      envios_hechos: 0,
      direccion_id: direccionId,
    })
    .select("id")
    .single();

  if (errorSus || !filaSus) {
    return NextResponse.json({ error: "suscripcion_no_creada" }, { status: 500 });
  }
  const suscripcionId = filaSus.id as string;

  // ── 3. El primer envío, con las libras ───────────────────
  // Va con la service key: `suscripcion_envios` es de solo lectura para el
  // cliente (ver la policy envios_propios_lectura en suscripciones.sql), así
  // que con su token el insert se cae por RLS.
  const comoSuscripcion = { enviosHechos: 0, estado: "activa" } as Suscripcion;
  const libras = librasDelEnvio(comoSuscripcion, nivel, suscripcionConfig);
  const total = cobroPrepago(nivel, prepago, suscripcionConfig).total;

  const admin = crearClienteAdmin();
  let avisoEnvio: string | null = null;

  const { error: errorEnvio } = await admin.from("suscripcion_envios").upsert(
    {
      suscripcion_id: suscripcionId,
      numero: 1,
      fecha_programada: despacho,
      estado: "programado",
      cafe: suscripcionConfig.operacion.productoNombre,
      regalo: libras > nivel.libras,
      libras,
      total_cop: total,
    },
    { onConflict: "suscripcion_id,numero" }
  );
  if (errorEnvio) {
    avisoEnvio = errorEnvio.message;
    console.error(`[suscribir] No se registró el envío de ${suscripcionId}:`, errorEnvio.message);
  }

  // ── 4. El pedido para el software de gestión ─────────────
  // `pedidos` no acepta escrituras por RLS: va con la service key.
  const { operacion } = suscripcionConfig;
  let pedido: string | null = null;
  let avisoPedido: string | null = null;

  try {
    const numero = await siguienteNumeroPedido(admin, operacion.prefijoPedido);
    const { error } = await admin.from("pedidos").insert({
      numero,
      cliente: d.nombre,
      producto_id: operacion.productoId,
      libras,
      // Precio por libra del plan. El primer envío nunca lleva la libra de
      // regalo —esa cae en el séptimo— así que libras × pvp_lb cuadra con
      // lo que se cobra.
      pvp_lb: Math.round(nivel.precioCop / nivel.libras),
      // Con la pasarela apagada nadie ha pagado todavía.
      pagado: FEATURE_PAGOS,
      canal: operacion.canal,
      fecha: despacho,
      notas: [
        `Suscripción ${nivel.label_es}`,
        frecuencia.label_es,
        cuerpo.molienda === "molido" ? `molido para ${cuerpo.metodo}` : "en grano",
        `${d.ciudad}, ${d.departamento}`,
        d.telefono,
      ].join(" · "),
      entregado: false,
    });
    if (error) throw error;
    pedido = numero;
  } catch (e) {
    // La suscripción ya existe y es lo que importa. El pedido se puede
    // recrear a mano desde la tabla de envíos.
    // Los errores de Supabase no son Error: sin esto salía "[object Object]"
    // y no había forma de saber qué columna se quejaba.
    avisoPedido =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e !== null && "message" in e
          ? String((e as { message: unknown }).message)
          : JSON.stringify(e);
    console.error(`[suscribir] No se registró el pedido de ${suscripcionId}:`, avisoPedido);
  }

  // ── 5. El correo ─────────────────────────────────────────
  const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const locale = cuerpo.locale === "en" ? "en" : "es";
  const nombreDe = (lista: readonly { id: string; label_es: string }[], id?: string) =>
    lista.find((x) => x.id === id)?.label_es ?? "";

  const correo = correoBienvenida({
    nombre: d.nombre,
    plan: nivel.label_es,
    libras,
    frecuencia: frecuencia.label_es,
    molienda: nombreDe(suscripcionConfig.moliendas, cuerpo.molienda),
    metodo: nombreDe(suscripcionConfig.metodos, cuerpo.metodo),
    proximoDespacho: despacho,
    direccion: `${d.linea}, ${d.ciudad}, ${d.departamento}`,
    totalCop: total,
    urlCuenta: `${sitio}/${locale}/cuenta`,
  });

  const envio = await enviarCorreo({ ...correo, para: email });

  return NextResponse.json({
    ok: true,
    suscripcionId,
    proximoDespacho: despacho,
    libras,
    pedido,
    // Se devuelve para poder verlo al probar, sin que nada de esto falle la alta.
    avisos: {
      envio: avisoEnvio,
      pedido: avisoPedido,
      correo: envio.enviado ? null : envio.motivo,
    },
  });
}

// Crea el pedido y devuelve los parámetros firmados del Web Checkout de Wompi.
//
// El precio se calcula AQUÍ, desde el catálogo y data/suscripcion.json. Nunca
// se confía en el monto que mande el navegador.

import { NextResponse } from "next/server";
import { crearClienteConToken } from "@/lib/supabase-admin";
import {
  findFrecuencia, findNivel, findPrepago, findProduct, suscripcionConfig,
} from "@/lib/content";
import { cobroPrepago, hoyISO, sumarDias } from "@/lib/suscripcion";
import {
  WOMPI_CHECKOUT_URL, WOMPI_PUBLIC_KEY, aCentavos, firmaIntegridad,
  generarReferencia, wompiConfigurado,
} from "@/lib/wompi";

interface Cuerpo {
  tipo: "suscripcion" | "unico";
  /** Solo para compra única: la bolsa suelta del catálogo. */
  cafe?: string;
  cantidad?: number;
  /** Solo para suscripción. */
  nivel?: string;
  frecuencia?: string;
  prepago?: string;
  molienda?: string;
  metodo?: string;
  perfil?: string;
  locale?: string;
  direccion: {
    nombre: string;
    telefono: string;
    linea: string;
    ciudad: string;
    departamento: string;
    notas?: string;
  };
}

const MONEDA = "COP";

export async function POST(request: Request) {
  if (!wompiConfigurado()) {
    return NextResponse.json({ error: "wompi_sin_configurar" }, { status: 503 });
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "sin_sesion" }, { status: 401 });
  }

  let cuerpo: Cuerpo;
  try {
    cuerpo = (await request.json()) as Cuerpo;
  } catch {
    return NextResponse.json({ error: "cuerpo_invalido" }, { status: 400 });
  }

  const producto = cuerpo.cafe ? findProduct(cuerpo.cafe) : undefined;
  if (cuerpo.tipo === "unico" && !producto) {
    return NextResponse.json({ error: "cafe_desconocido" }, { status: 400 });
  }

  const cantidad = Math.max(1, Math.min(10, Math.floor(cuerpo.cantidad ?? 1)));
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

  // El trigger de auth.users ya debería haber creado la fila; el upsert cubre
  // las bases creadas antes de instalar el SQL.
  await supabase
    .from("clientes")
    .upsert({ id: clienteId, email: auth.user.email ?? "", nombre: d.nombre, telefono: d.telefono });

  // Dirección: se guarda para autocompletar la próxima compra.
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

  let direccionId: string | null = null;
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

  const hoy = hoyISO();
  let totalCop: number;
  let referencia: string;

  if (cuerpo.tipo === "suscripcion") {
    const nivel = findNivel(cuerpo.nivel ?? "");
    const frecuencia = findFrecuencia(cuerpo.frecuencia ?? "");
    const prepago = findPrepago(cuerpo.prepago ?? "");
    if (!nivel || !frecuencia || !prepago) {
      return NextResponse.json({ error: "plan_desconocido" }, { status: 400 });
    }

    // El monto sale del nivel y del prepago, nunca del navegador.
    totalCop = cobroPrepago(nivel, prepago, suscripcionConfig).total;
    referencia = generarReferencia("SUB");

    const { error } = await supabase.from("suscripciones").insert({
      cliente_id: clienteId,
      nivel_id: nivel.id,
      frecuencia_id: frecuencia.id,
      prepago_id: prepago.id,
      molienda: cuerpo.molienda ?? suscripcionConfig.moliendas[0]?.id ?? "grano",
      metodo: cuerpo.metodo ?? suscripcionConfig.metodos[0].id,
      perfil: cuerpo.perfil ?? suscripcionConfig.perfiles[0]?.id ?? "balanceado",
      estado: "pendiente",
      // Se recalcula al confirmar el pago; aquí solo se reserva la fecha.
      proximo_envio: sumarDias(hoy, frecuencia.cadaDias),
      direccion_id: direccionId,
      wompi_referencia: referencia,
    });

    if (error) {
      return NextResponse.json({ error: "suscripcion_no_creada" }, { status: 500 });
    }
  } else {
    totalCop = producto!.precioCop * cantidad;
    referencia = generarReferencia("UNI");

    const { error } = await supabase.from("pedidos_unicos").insert({
      cliente_id: clienteId,
      producto_slug: producto!.id,
      cantidad,
      total_cop: totalCop,
      estado: "pendiente",
      direccion_id: direccionId,
      wompi_referencia: referencia,
    });

    if (error) {
      return NextResponse.json({ error: "pedido_no_creado" }, { status: 500 });
    }
  }

  const montoEnCentavos = aCentavos(totalCop);
  const firma = firmaIntegridad({ referencia, montoEnCentavos, moneda: MONEDA });
  const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  // Las rutas llevan prefijo de idioma; el retorno de Wompi también.
  const locale = cuerpo.locale === "en" ? "en" : "es";

  return NextResponse.json({
    checkoutUrl: WOMPI_CHECKOUT_URL,
    publicKey: WOMPI_PUBLIC_KEY,
    referencia,
    montoEnCentavos,
    moneda: MONEDA,
    firma,
    redirectUrl: `${sitio}/${locale}/confirmacion?ref=${referencia}`,
    totalCop,
  });
}

// Compra única de una bolsa suelta por Web Checkout de Wompi: crea el pedido
// y devuelve los parámetros firmados.
//
// Las suscripciones NO pasan por aquí: usan cobro recurrente con fuente de
// pago, en /api/suscripciones.
//
// El precio se calcula AQUÍ, desde el catálogo. Nunca se confía en el monto
// que mande el navegador.

import { NextResponse } from "next/server";
import { crearClienteConToken } from "@/lib/supabase-admin";
import { findProduct } from "@/lib/content";
import {
  WOMPI_CHECKOUT_URL, WOMPI_PUBLIC_KEY, aCentavos, firmaIntegridad,
  generarReferencia, wompiConfigurado,
} from "@/lib/wompi";
import { guardarDireccionPrincipal, leerDireccion } from "@/lib/servidor/direccion";

interface Cuerpo {
  cafe?: string;
  cantidad?: number;
  locale?: string;
  direccion?: unknown;
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
  if (!producto) {
    return NextResponse.json({ error: "cafe_desconocido" }, { status: 400 });
  }

  const cantidad = Math.max(1, Math.min(10, Math.floor(cuerpo.cantidad ?? 1)));
  const d = leerDireccion(cuerpo.direccion);
  if (!d) {
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

  let direccionId: string;
  try {
    direccionId = await guardarDireccionPrincipal(supabase, clienteId, d);
  } catch {
    return NextResponse.json({ error: "direccion_no_guardada" }, { status: 500 });
  }

  const totalCop = producto.precioCop * cantidad;
  const referencia = generarReferencia("UNI");

  const { error } = await supabase.from("pedidos_unicos").insert({
    cliente_id: clienteId,
    producto_slug: producto.id,
    cantidad,
    total_cop: totalCop,
    estado: "pendiente",
    direccion_id: direccionId,
    wompi_referencia: referencia,
  });
  if (error) {
    return NextResponse.json({ error: "pedido_no_creado" }, { status: 500 });
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

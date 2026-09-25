// Pago de una compra única (bolsa suelta), aislado del formulario.
//
// La pantalla no sabe que existe Wompi: llama a `iniciarPago` y se va donde le
// digan. El monto NO viaja desde aquí — lo calcula app/api/checkout/route.ts
// desde el catálogo, porque el navegador no es de fiar.
//
// Las suscripciones van por otro camino (tokenización y cobro recurrente):
// ver lib/wompi-navegador.ts y app/api/suscripciones.

import { getSupabase } from "@/lib/supabase";
import type { Direccion } from "@/lib/types";

export interface DatosEnvio extends Omit<Direccion, "id" | "clienteId" | "esPrincipal"> {}

export interface PedidoUnico {
  cafe: string;
  cantidad: number;
}

export type ResultadoPago =
  | { ok: true; url: string }
  | { ok: false; motivo: "sin_sesion" | "sin_configurar" | "error" };

interface RespuestaCheckout {
  checkoutUrl: string;
  publicKey: string;
  referencia: string;
  montoEnCentavos: number;
  moneda: string;
  firma: string;
  redirectUrl: string;
}

/**
 * Prepara el pago y devuelve la URL a la que hay que mandar al cliente.
 * No navega: eso lo decide quien llama.
 */
export async function iniciarPago(
  pedido: PedidoUnico,
  direccion: DatosEnvio,
  locale: string,
  email?: string
): Promise<ResultadoPago> {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, motivo: "sin_sesion" };

  let respuesta: Response;
  try {
    respuesta = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...pedido, locale, direccion }),
    });
  } catch {
    return { ok: false, motivo: "error" };
  }

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({}));
    if (cuerpo.error === "wompi_sin_configurar") {
      return { ok: false, motivo: "sin_configurar" };
    }
    return { ok: false, motivo: cuerpo.error === "sin_sesion" ? "sin_sesion" : "error" };
  }

  const pago = (await respuesta.json()) as RespuestaCheckout;

  // Web Checkout de Wompi: los parámetros van firmados desde el servidor.
  const url = new URL(pago.checkoutUrl);
  url.searchParams.set("public-key", pago.publicKey);
  url.searchParams.set("currency", pago.moneda);
  url.searchParams.set("amount-in-cents", String(pago.montoEnCentavos));
  url.searchParams.set("reference", pago.referencia);
  url.searchParams.set("signature:integrity", pago.firma);
  url.searchParams.set("redirect-url", pago.redirectUrl);
  if (email) url.searchParams.set("customer-data:email", email);
  url.searchParams.set("customer-data:full-name", direccion.nombre);
  url.searchParams.set("customer-data:phone-number", direccion.telefono);

  return { ok: true, url: url.toString() };
}

/**
 * Llama a una ruta de la API con el token de la sesión. Para las pantallas
 * de la suscripción, que no escriben en Supabase directo: todo pasa por el
 * servidor.
 */
export async function llamarApi<T = Record<string, unknown>>(
  ruta: string,
  init: { method?: string; body?: unknown } = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string; mensaje?: string }> {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, status: 401, error: "sin_sesion" };

  try {
    const r = await fetch(ruta, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, status: r.status, error: cuerpo.error ?? "error", mensaje: cuerpo.mensaje };
    return { ok: true, data: cuerpo as T };
  } catch {
    return { ok: false, status: 0, error: "red" };
  }
}

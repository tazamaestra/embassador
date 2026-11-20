// Pago de un pedido del carrito, aislado de la pantalla, y la llamada
// genérica a la API con la sesión.
//
// La pantalla no sabe que existe Wompi: llama a `iniciarPago` y se va donde
// le digan. El monto NO viaja desde aquí: lo calcula app/api/checkout desde
// el catálogo, porque el navegador no es de fiar.

import { getSupabase } from "@/lib/supabase";
import type { Contacto } from "@/lib/pedidos";

export interface LineaCarrito {
  cafe: string;
  presentacion: "bolsa" | "negocio";
  cantidad: number;
}

export type ResultadoPago =
  | { ok: true; url: string }
  | { ok: false; motivo: "campo_invalido" | "error"; campo?: string };

interface RespuestaCheckout {
  referencia: string;
  redirectUrl: string;
  sinPasarela?: boolean;
  checkoutUrl?: string;
  publicKey?: string;
  montoEnCentavos?: number;
  moneda?: string;
  firma?: string;
}

async function tokenDeSesion(): Promise<string | undefined> {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

/**
 * Crea el pedido y devuelve a dónde mandar al cliente: a Wompi si la
 * pasarela está configurada, o directo a la confirmación si no. No navega.
 */
export async function iniciarPago(items: LineaCarrito[], contacto: Contacto, locale: string): Promise<ResultadoPago> {
  const token = await tokenDeSesion();

  let respuesta: Response;
  try {
    respuesta = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ items, contacto, locale }),
    });
  } catch {
    return { ok: false, motivo: "error" };
  }

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({}));
    return cuerpo.error === "campo_invalido"
      ? { ok: false, motivo: "campo_invalido", campo: cuerpo.campo }
      : { ok: false, motivo: "error" };
  }

  const pago = (await respuesta.json()) as RespuestaCheckout;
  if (pago.sinPasarela || !pago.checkoutUrl) return { ok: true, url: pago.redirectUrl };

  // Web Checkout de Wompi: los parámetros van firmados desde el servidor.
  const url = new URL(pago.checkoutUrl);
  url.searchParams.set("public-key", pago.publicKey ?? "");
  url.searchParams.set("currency", pago.moneda ?? "COP");
  url.searchParams.set("amount-in-cents", String(pago.montoEnCentavos ?? 0));
  url.searchParams.set("reference", pago.referencia);
  url.searchParams.set("signature:integrity", pago.firma ?? "");
  url.searchParams.set("redirect-url", pago.redirectUrl);
  url.searchParams.set("customer-data:email", contacto.email);
  url.searchParams.set("customer-data:full-name", contacto.nombre);
  url.searchParams.set("customer-data:phone-number", contacto.telefono);
  return { ok: true, url: url.toString() };
}

/**
 * Llama a una ruta de la API con el token de la sesión. La usan el panel
 * del equipo y la cuenta del cliente.
 */
export async function llamarApi<T = Record<string, unknown>>(
  ruta: string,
  init: { method?: string; body?: unknown } = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string; mensaje?: string; campo?: string }> {
  const token = await tokenDeSesion();
  if (!token) return { ok: false, status: 401, error: "sin_sesion" };

  try {
    const r = await fetch(ruta, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const cuerpo = await r.json().catch(() => ({}));
    // Sin `error` en el cuerpo, la respuesta no vino de nuestro handler (página
    // de error de Next o de Vercel): el código HTTP es la única pista.
    if (!r.ok) return { ok: false, status: r.status, error: cuerpo.error ?? "error", mensaje: cuerpo.mensaje ?? (cuerpo.error ? undefined : `HTTP ${r.status}`), campo: cuerpo.campo };
    return { ok: true, data: cuerpo as T };
  } catch {
    return { ok: false, status: 0, error: "red" };
  }
}

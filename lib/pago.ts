// El pago, aislado del formulario.
//
// La pantalla no sabe que existe Wompi: llama a `iniciarPago` y se va donde le
// digan. El monto NO viaja desde aquí — lo calcula app/api/checkout/route.ts
// desde data/suscripcion.json, porque el navegador no es de fiar.
//
// Para cambiar de pasarela se reescribe este archivo y la ruta, y nada más.

import { getSupabase } from "@/lib/supabase";
import type { Direccion } from "@/lib/types";

export interface DatosEnvio extends Omit<Direccion, "id" | "clienteId" | "esPrincipal"> {}

export interface PedidoSuscripcion {
  tipo: "suscripcion";
  nivel: string;
  frecuencia: string;
  prepago: string;
  molienda: string;
  metodo: string;
  perfil: string;
}

export interface PedidoUnico {
  tipo: "unico";
  cafe: string;
  cantidad: number;
}

export type Pedido = PedidoSuscripcion | PedidoUnico;

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

export type ResultadoSuscripcion =
  | { ok: true; suscripcionId: string; proximoDespacho: string; pedido: string | null }
  | { ok: false; motivo: "sin_sesion" | "error" };

/**
 * Alta sin cobrar, con FEATURE_PAGOS apagado. Deja la suscripción activa, el
 * envío registrado y el correo mandado. No navega a ninguna pasarela.
 */
export async function suscribirSinPago(
  pedido: PedidoSuscripcion,
  direccion: DatosEnvio,
  locale: string
): Promise<ResultadoSuscripcion> {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, motivo: "sin_sesion" };

  try {
    const respuesta = await fetch("/api/suscribir", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...pedido, locale, direccion }),
    });

    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => ({}));
      return { ok: false, motivo: cuerpo.error === "sin_sesion" ? "sin_sesion" : "error" };
    }

    const r = await respuesta.json();
    return {
      ok: true,
      suscripcionId: r.suscripcionId,
      proximoDespacho: r.proximoDespacho,
      pedido: r.pedido ?? null,
    };
  } catch {
    return { ok: false, motivo: "error" };
  }
}

/**
 * Prepara el pago y devuelve la URL a la que hay que mandar al cliente.
 * No navega: eso lo decide quien llama.
 */
export async function iniciarPago(
  pedido: Pedido,
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

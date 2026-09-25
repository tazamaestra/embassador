// Wompi desde el navegador, SOLO con la llave pública.
//
// El número de la tarjeta va del formulario directo a Wompi y vuelve un
// token: nunca pasa por nuestro servidor ni queda en nuestra base. El token
// se le entrega a /api/suscripciones, que con la llave privada lo convierte
// en una fuente de pago. Referencia:
// https://docs.wompi.co/docs/colombia/fuentes-de-pago/

const LLAVE_PUBLICA = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ?? "";

const API = LLAVE_PUBLICA.startsWith("pub_prod_")
  ? "https://production.wompi.co/v1"
  : "https://sandbox.wompi.co/v1";

export function wompiDisponible(): boolean {
  return LLAVE_PUBLICA.length > 0;
}

async function llamar<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${API}${ruta}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLAVE_PUBLICA}`,
      ...init.headers,
    },
  });
  const cuerpo = await r.json().catch(() => null);
  if (!r.ok) {
    const mensajes = cuerpo?.error?.messages;
    throw new Error(
      mensajes && typeof mensajes === "object"
        ? Object.values(mensajes).flat().join(" ")
        : `Wompi respondió ${r.status}`
    );
  }
  return (cuerpo as { data: T }).data;
}

export interface Aceptacion {
  acceptanceToken: string;
  permalinkTerminos: string;
  personalAuthToken: string;
  permalinkDatos: string;
}

/**
 * Los dos contratos que el cliente acepta con sus casillas: términos de uso
 * y tratamiento de datos personales. Sin sus tokens Wompi no crea la fuente.
 *
 * Se usa `/merchants/info` con el header: la ruta vieja
 * `/merchants/:llave_publica` deja de existir el 31 de octubre de 2026.
 */
export async function obtenerAceptacion(): Promise<Aceptacion> {
  const data = await llamar<{
    presigned_acceptance: { acceptance_token: string; permalink: string };
    presigned_personal_data_auth: { acceptance_token: string; permalink: string };
  }>("/merchants/info", { headers: { "x-merchant-public-key": LLAVE_PUBLICA } });

  return {
    acceptanceToken: data.presigned_acceptance.acceptance_token,
    permalinkTerminos: data.presigned_acceptance.permalink,
    personalAuthToken: data.presigned_personal_data_auth.acceptance_token,
    permalinkDatos: data.presigned_personal_data_auth.permalink,
  };
}

export interface DatosTarjeta {
  numero: string;
  cvc: string;
  mes: string;
  anio: string;
  titular: string;
}

export interface TarjetaTokenizada {
  token: string;
  marca: string;
  ultimos4: string;
}

export async function tokenizarTarjeta(t: DatosTarjeta): Promise<TarjetaTokenizada> {
  const data = await llamar<{ id: string; brand: string; last_four: string }>("/tokens/cards", {
    method: "POST",
    body: JSON.stringify({
      number: t.numero.replace(/\s+/g, ""),
      cvc: t.cvc.trim(),
      exp_month: t.mes.padStart(2, "0"),
      exp_year: t.anio.slice(-2),
      card_holder: t.titular.trim(),
    }),
  });
  return { token: data.id, marca: data.brand, ultimos4: data.last_four };
}

export type EstadoNequi = "PENDING" | "APPROVED" | "DECLINED";

export async function tokenizarNequi(celular: string): Promise<{ token: string; estado: EstadoNequi }> {
  const data = await llamar<{ id: string; status: EstadoNequi }>("/tokens/nequi", {
    method: "POST",
    body: JSON.stringify({ phone_number: celular.replace(/\D/g, "") }),
  });
  return { token: data.id, estado: data.status };
}

export async function estadoTokenNequi(token: string): Promise<EstadoNequi> {
  const data = await llamar<{ status: EstadoNequi }>(`/tokens/nequi/${encodeURIComponent(token)}`);
  return data.status;
}

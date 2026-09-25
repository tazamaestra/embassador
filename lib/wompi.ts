// Wompi. SOLO SERVIDOR: aquí se usan los secretos de integridad y de eventos,
// que nunca pueden salir al navegador. Los route handlers de app/api son los
// únicos que importan este módulo.

import { createHash } from "node:crypto";

export const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY ?? "";
const INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET ?? "";
const EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET ?? "";

export const WOMPI_CHECKOUT_URL = "https://checkout.wompi.co/p/";

/**
 * Sandbox o producción según la llave: cada ambiente solo acepta sus
 * propias llaves (pub_test_ / pub_prod_), así que no hace falta otra variable
 * que pueda quedar desalineada.
 */
export function urlApiWompi(llavePublica: string = WOMPI_PUBLIC_KEY): string {
  return llavePublica.startsWith("pub_prod_")
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";
}

export function wompiConfigurado(): boolean {
  return Boolean(WOMPI_PUBLIC_KEY && INTEGRITY_SECRET);
}

/** Cobro recurrente: además de lo anterior, la llave privada. */
export function cobroRecurrenteConfigurado(): boolean {
  return wompiConfigurado() && Boolean(PRIVATE_KEY);
}

function sha256(texto: string): string {
  return createHash("sha256").update(texto, "utf8").digest("hex");
}

/** Referencia única del pago. Va también en la fila de la suscripción. */
export function generarReferencia(prefijo: string): string {
  const aleatorio = Math.random().toString(36).slice(2, 10);
  return `${prefijo}-${Date.now().toString(36)}-${aleatorio}`.toUpperCase();
}

/**
 * Firma de integridad del Web Checkout:
 * SHA-256 de referencia + monto en centavos + moneda + (vencimiento) + secreto.
 */
export function firmaIntegridad({
  referencia,
  montoEnCentavos,
  moneda,
  vencimiento,
}: {
  referencia: string;
  montoEnCentavos: number;
  moneda: string;
  vencimiento?: string;
}): string {
  const cadena = `${referencia}${montoEnCentavos}${moneda}${vencimiento ?? ""}${INTEGRITY_SECRET}`;
  return sha256(cadena);
}

// ── Eventos (webhook) ──────────────────────────────────────────────────────

export interface EventoWompi {
  event: string;
  data: { transaction?: TransaccionWompi };
  signature: { properties: string[]; checksum: string };
  timestamp: number;
  sent_at?: string;
}

export interface TransaccionWompi {
  id: string;
  reference: string;
  status: "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "PENDING";
  amount_in_cents: number;
  currency: string;
  customer_email?: string;
  payment_method?: { type?: string; extra?: Record<string, unknown> };
  payment_source_id?: number | string | null;
}

function valorEnRuta(objeto: unknown, ruta: string): string {
  return (
    ruta.split(".").reduce<unknown>((actual, parte) => {
      if (actual && typeof actual === "object") {
        return (actual as Record<string, unknown>)[parte];
      }
      return undefined;
    }, objeto) as string | undefined
  )?.toString() ?? "";
}

/**
 * Valida que el evento venga de Wompi: concatena los valores de las
 * propiedades que el propio evento indica, el timestamp y el secreto de
 * eventos, y compara el SHA-256 con el checksum recibido.
 */
export function eventoValido(evento: EventoWompi): boolean {
  if (!EVENTS_SECRET) return false;
  if (!evento?.signature?.properties || !evento.signature.checksum) return false;

  const concatenado = evento.signature.properties
    .map((ruta) => valorEnRuta(evento.data, ruta))
    .join("");

  const esperado = sha256(`${concatenado}${evento.timestamp}${EVENTS_SECRET}`);
  return esperado.toLowerCase() === evento.signature.checksum.toLowerCase();
}

/** Los montos de Wompi van en centavos. */
export function aCentavos(montoCop: number): number {
  return Math.round(montoCop * 100);
}

// ── API con llave privada ──────────────────────────────────────────────────
// Fuentes de pago y transacciones recurrentes. Referencia:
// https://docs.wompi.co/docs/colombia/fuentes-de-pago/

export class ErrorWompi extends Error {
  constructor(public readonly estadoHttp: number, public readonly detalle: unknown) {
    super(`Wompi respondió ${estadoHttp}`);
    this.name = "ErrorWompi";
  }
}

async function llamarWompi<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`${urlApiWompi()}${ruta}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PRIVATE_KEY}`,
      ...init.headers,
    },
    cache: "no-store",
  });
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new ErrorWompi(respuesta.status, cuerpo);
  return (cuerpo as { data: T }).data;
}

export type TipoFuente = "CARD" | "NEQUI";

export interface FuenteDePago {
  id: string;
  status: string;
  tipo: TipoFuente;
  marca: string;
  ultimos4: string;
  telefono: string;
}

/**
 * Convierte un token (tarjeta o Nequi, creado en el navegador con la llave
 * pública) en una fuente de pago reutilizable. Exige los dos tokens de
 * aceptación que el cliente aceptó en pantalla.
 */
export async function crearFuenteDePago(p: {
  tipo: TipoFuente;
  token: string;
  email: string;
  acceptanceToken: string;
  personalAuthToken: string;
}): Promise<FuenteDePago> {
  const data = await llamarWompi<{
    id: number | string;
    status: string;
    public_data?: Record<string, unknown>;
  }>("/payment_sources", {
    method: "POST",
    body: JSON.stringify({
      type: p.tipo,
      token: p.token,
      customer_email: p.email,
      acceptance_token: p.acceptanceToken,
      accept_personal_auth: p.personalAuthToken,
    }),
  });

  const publico = data.public_data ?? {};
  const texto = (k: string) => (typeof publico[k] === "string" ? (publico[k] as string) : "");
  return {
    id: String(data.id),
    status: data.status,
    tipo: p.tipo,
    marca: texto("brand"),
    ultimos4: texto("last_four"),
    telefono: texto("phone_number"),
  };
}

export async function anularFuenteDePago(id: string): Promise<void> {
  await llamarWompi(`/payment_sources/${encodeURIComponent(id)}/void`, { method: "PUT" });
}

export interface TransaccionCreada {
  id: string;
  status: TransaccionWompi["status"];
  statusMessage: string | null;
  amountInCents: number;
  reference: string;
}

function aTransaccion(d: Record<string, unknown>): TransaccionCreada {
  return {
    id: String(d.id),
    status: d.status as TransaccionWompi["status"],
    statusMessage: (d.status_message as string | null | undefined) ?? null,
    amountInCents: Number(d.amount_in_cents),
    reference: String(d.reference),
  };
}

/**
 * Cobra una fuente de pago guardada. Toda transacción nace PENDING; el
 * estado final llega por el webhook `transaction.updated` o consultándola.
 */
export async function cobrarFuenteDePago(p: {
  referencia: string;
  montoCop: number;
  email: string;
  fuenteId: string;
  tipo: TipoFuente;
}): Promise<TransaccionCreada> {
  const montoEnCentavos = aCentavos(p.montoCop);
  const moneda = "COP";

  const cuerpo: Record<string, unknown> = {
    amount_in_cents: montoEnCentavos,
    currency: moneda,
    signature: firmaIntegridad({ referencia: p.referencia, montoEnCentavos, moneda }),
    customer_email: p.email,
    reference: p.referencia,
    payment_source_id: Number(p.fuenteId),
  };
  // `recurrent` e `installments` son de tarjeta (COF). Nequi no los lleva.
  if (p.tipo === "CARD") {
    cuerpo.payment_method = { installments: 1 };
    cuerpo.recurrent = true;
  }

  const data = await llamarWompi<Record<string, unknown>>("/transactions", {
    method: "POST",
    body: JSON.stringify(cuerpo),
  });
  return aTransaccion(data);
}

export async function consultarTransaccion(id: string): Promise<TransaccionCreada> {
  const data = await llamarWompi<Record<string, unknown>>(`/transactions/${encodeURIComponent(id)}`);
  return aTransaccion(data);
}

/**
 * Espera unos segundos a que la transacción deje PENDING, para contestarle
 * al cliente en la misma pantalla. Si no alcanza, el webhook termina el trabajo.
 */
export async function esperarTransaccion(
  id: string,
  { intentos = 5, esperaMs = 1500 } = {}
): Promise<TransaccionCreada | null> {
  for (let i = 0; i < intentos; i++) {
    await new Promise((r) => setTimeout(r, esperaMs));
    try {
      const t = await consultarTransaccion(id);
      if (t.status !== "PENDING") return t;
    } catch {
      // Un fallo de red al consultar no cambia nada: se intenta otra vez.
    }
  }
  return null;
}

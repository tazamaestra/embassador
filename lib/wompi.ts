// Wompi. SOLO SERVIDOR: aquí se usan los secretos de integridad y de eventos,
// que nunca pueden salir al navegador. Los route handlers de app/api son los
// únicos que importan este módulo.

import { createHash } from "node:crypto";

export const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ?? "";
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

function sha256(texto: string): string {
  return createHash("sha256").update(texto, "utf8").digest("hex");
}

/** Referencia única del pago. Va también en la fila del pedido. */
export function generarReferencia(prefijo: string): string {
  const aleatorio = Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 8);
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

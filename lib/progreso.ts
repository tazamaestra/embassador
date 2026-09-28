// Avance del quiz y del checkout guardado en el navegador, para que un corte
// —recargar, cerrar la pestaña, volver de entrar con Google, un pago que no
// pasa— no obligue a empezar de cero. Va en localStorage con vencimiento: pasado
// ese plazo se descarta, así una dirección no queda rondando para siempre.
// Nunca se guarda nada del pago.
//
// Además, una cookie dice a dónde volver ("checkout" o "quiz"). La lee el
// servidor en /suscripcion para redirigir antes de pintar la página: desde el
// navegador el salto se notaba como un parpadeo de los planes.

import { QUIZ_PROGRESO } from "./quiz";

const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000;

/** Borrador del checkout (components/checkout/CheckoutScreen). */
export const CHECKOUT_BORRADOR = "tm-checkout";

/** Cookie con el destino al volver a /suscripcion. */
export const COOKIE_RETOMAR = "tm-retomar";
export type DestinoRetomar = "checkout" | "quiz";

interface Guardado<T> {
  en: number;
  valor: T;
}

export function leerProgreso<T>(clave: string): T | null {
  try {
    const crudo = window.localStorage.getItem(clave);
    if (!crudo) return null;
    const g = JSON.parse(crudo) as Guardado<T>;
    if (typeof g?.en !== "number" || Date.now() - g.en > VIGENCIA_MS) {
      window.localStorage.removeItem(clave);
      return null;
    }
    return g.valor;
  } catch {
    return null;
  }
}

export function guardarProgreso<T>(clave: string, valor: T): void {
  try {
    window.localStorage.setItem(clave, JSON.stringify({ en: Date.now(), valor } satisfies Guardado<T>));
  } catch {
    // Modo privado o almacenamiento lleno: se sigue sin guardar.
  }
  sincronizarCookie();
}

export function borrarProgreso(...claves: string[]): void {
  try {
    for (const clave of claves) window.localStorage.removeItem(clave);
  } catch {
    // Sin almacenamiento no hay nada que borrar.
  }
  sincronizarCookie();
}

// La cookie se recalcula desde lo guardado, nunca se escribe suelta: así no
// puede decir algo distinto de lo que hay. El checkout manda sobre el quiz;
// un quiz sin ninguna respuesta no cuenta como empezado.
function sincronizarCookie(): void {
  let destino: DestinoRetomar | null = null;
  if (leerProgreso(CHECKOUT_BORRADOR)) destino = "checkout";
  else if ((leerProgreso<{ paso?: number }>(QUIZ_PROGRESO)?.paso ?? 0) > 0) destino = "quiz";

  try {
    document.cookie = destino
      ? `${COOKIE_RETOMAR}=${destino}; path=/; max-age=${VIGENCIA_MS / 1000}; samesite=lax`
      : `${COOKIE_RETOMAR}=; path=/; max-age=0; samesite=lax`;
  } catch {
    // Sin cookies se ve la página de planes; el avance sigue guardado.
  }
}

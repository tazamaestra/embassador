// Avance del quiz y del checkout guardado en el navegador, para que un corte
// —recargar, cerrar la pestaña, volver de entrar con Google, un pago que no
// pasa— no obligue a empezar de cero. Va en localStorage con vencimiento: pasado
// ese plazo se descarta, así una dirección no queda rondando para siempre.
// Nunca se guarda nada del pago.

const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000;

/** Borrador del checkout (components/checkout/CheckoutScreen). */
export const CHECKOUT_BORRADOR = "tm-checkout";

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
}

export function borrarProgreso(...claves: string[]): void {
  try {
    for (const clave of claves) window.localStorage.removeItem(clave);
  } catch {
    // Sin almacenamiento no hay nada que borrar.
  }
}

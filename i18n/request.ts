import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { FEATURE_AMBASSADORS } from "../lib/flags";

type Messages = Record<string, unknown>;

/** Mezcla un nivel de namespaces, para poder añadir claves sueltas (nav). */
function mezclar(base: Messages, extra: Messages): Messages {
  const salida: Messages = { ...base };
  for (const [clave, valor] of Object.entries(extra)) {
    const actual = salida[clave];
    salida[clave] =
      actual && typeof actual === "object" && typeof valor === "object"
        ? { ...(actual as Messages), ...(valor as Messages) }
        : valor;
  }
  return salida;
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "es" | "en")) {
    locale = routing.defaultLocale;
  }

  const messages: Messages = (await import(`../messages/${locale}.json`)).default;

  // El copy del programa de embajadores vive aparte y solo se carga con el
  // flag encendido: apagado, no llega ni al bundle del cliente.
  if (FEATURE_AMBASSADORS) {
    const extra = (await import(`../messages/embajadores/${locale}.json`)).default;
    return { locale, messages: mezclar(messages, extra) };
  }

  return { locale, messages };
});

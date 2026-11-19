export function formatCOP(amount: number): string {
  return "$" + amount.toLocaleString("es-CO");
}

/** 12.5 → "USD 12,50" (es) / "USD 12.50" (en). Enteros sin decimales. */
export function formatUSD(amount: number, locale: string): string {
  const decimales = Number.isInteger(amount) ? 0 : 2;
  return "USD " + amount.toLocaleString(locale === "en" ? "en-US" : "es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: 2,
  });
}

export function formatPrice(cop: number, usd: number | undefined, locale: string): string {
  if (locale === "en" && usd !== undefined) {
    return "$" + usd.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return formatCOP(cop);
}

/** Nombre de una opción del catálogo en el idioma de la pantalla. */
export function etiqueta(
  lista: readonly { id: string; label_es: string; label_en: string }[],
  id: string | null | undefined,
  es: boolean
): string {
  const o = lista.find((x) => x.id === id);
  return o ? (es ? o.label_es : o.label_en) : id ?? "";
}

/**
 * 2026-10-05 → "5 oct 2026" / "Oct 5, 2026" (sin año: "5 oct"). Las fechas
 * son ISO de solo día, en UTC.
 */
export function formatFecha(iso: string | null | undefined, es: boolean, conAnio = true): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(es ? "es-CO" : "en-US", {
    day: "numeric", month: "short", ...(conAnio ? { year: "numeric" } : {}), timeZone: "UTC",
  });
}

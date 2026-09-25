export function formatCOP(amount: number): string {
  return "$" + amount.toLocaleString("es-CO");
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

/** 2026-10-05 → "5 oct" / "Oct 5". Las fechas son ISO de solo día, en UTC. */
export function formatFecha(iso: string | null | undefined, es: boolean): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString(es ? "es-CO" : "en-US", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatCOP(amount: number): string {
  return "$" + amount.toLocaleString("es-CO");
}

export function formatPrice(cop: number, usd: number | undefined, locale: string): string {
  if (locale === "en" && usd !== undefined) {
    return "$" + usd.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return formatCOP(cop);
}

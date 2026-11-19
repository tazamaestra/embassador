import { setRequestLocale } from "next-intl/server";
import CuentaCliente from "@/components/cuenta/CuentaCliente";
import type { Locale } from "@/lib/types";

// Depende de la sesión: se arma en cada visita y no se indexa.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mi cuenta · Taza Maestra",
  robots: { index: false, follow: false },
};

export default async function CuentaPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CuentaCliente locale={locale} />;
}

import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import CheckoutScreen from "@/components/checkout/CheckoutScreen";
import { obtenerCatalogo } from "@/lib/catalogo";
import type { Locale } from "@/lib/types";

// Esta pantalla depende de los parámetros de la URL, de la sesión y de los
// precios vigentes en la base: se arma en el servidor en cada visita.
export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const catalogo = await obtenerCatalogo();

  return (
    <Suspense>
      <CheckoutScreen locale={locale} catalogo={catalogo} />
    </Suspense>
  );
}

import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import ConfirmacionScreen from "@/components/checkout/ConfirmacionScreen";
import type { Locale } from "@/lib/types";

// Esta pantalla depende de los parámetros de la URL y de la sesión: es
// distinta para cada visitante, así que se arma en el servidor en cada
// visita. Prerenderizarla solo dejaría una cáscara vacía en el HTML.
export const dynamic = "force-dynamic";

export default async function ConfirmacionPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense>
      <ConfirmacionScreen locale={locale} />
    </Suspense>
  );
}

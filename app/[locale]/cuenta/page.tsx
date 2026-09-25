import cargarDespues from "next/dynamic";
import { setRequestLocale } from "next-intl/server";
import SubscriberDashboard from "@/components/account/SubscriberDashboard";
import { obtenerCatalogo } from "@/lib/catalogo";
import { FEATURE_AMBASSADORS } from "@/lib/flags";
import type { Locale } from "@/lib/types";

// El panel de embajador se carga bajo demanda: con el flag apagado no entra
// al bundle ni existe para el visitante.
const AmbassadorDashboard = cargarDespues(
  () => import("@/components/dashboard/AmbassadorDashboard")
);

// Depende de la sesión y de los precios vigentes: se arma en cada visita.
export const dynamic = "force-dynamic";

export default async function CuentaPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (FEATURE_AMBASSADORS) {
    return <AmbassadorDashboard locale={locale} />;
  }

  return <SubscriberDashboard locale={locale} catalogo={await obtenerCatalogo()} />;
}

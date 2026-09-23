import dynamic from "next/dynamic";
import { setRequestLocale } from "next-intl/server";
import SubscriberDashboard from "@/components/account/SubscriberDashboard";
import { FEATURE_AMBASSADORS } from "@/lib/flags";
import type { Locale } from "@/lib/types";

// El panel de embajador se carga bajo demanda: con el flag apagado no entra
// al bundle ni existe para el visitante.
const AmbassadorDashboard = dynamic(
  () => import("@/components/dashboard/AmbassadorDashboard")
);

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

  return <SubscriberDashboard locale={locale} />;
}

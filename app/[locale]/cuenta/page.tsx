import { getLocale } from "next-intl/server";
import AmbassadorDashboard from "@/components/dashboard/AmbassadorDashboard";
import type { Locale } from "@/lib/types";

export default async function CuentaPage() {
  const locale = (await getLocale()) as Locale;
  return <AmbassadorDashboard locale={locale} />;
}

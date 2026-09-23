import { setRequestLocale } from "next-intl/server";
import TiendaScreen from "@/components/shop/TiendaScreen";
import type { Locale } from "@/lib/types";

export default async function TiendaPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TiendaScreen />;
}

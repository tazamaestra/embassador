import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import EmbajadoresScreen from "@/components/ambassador/EmbajadoresScreen";
import { FEATURE_AMBASSADORS } from "@/lib/flags";
import type { Locale } from "@/lib/types";

export default async function EmbajadoresPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Al visitante lo desvía el proxy antes de llegar aquí. Esta guarda es para
  // el build: sin ella se intentaba prerenderizar la página con el copy del
  // programa apagado, que no está cargado, y salía una página rota.
  if (!FEATURE_AMBASSADORS) notFound();

  return <EmbajadoresScreen />;
}

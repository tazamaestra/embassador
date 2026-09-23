import { setRequestLocale } from "next-intl/server";
import AdminFincas from "@/components/admin/AdminFincas";
import type { Locale } from "@/lib/types";

// Panel interno: depende de la sesión y no debe quedar en ninguna caché,
// así que se arma en cada visita. Quién puede entrar lo decide Postgres
// (función es_equipo, ver supabase/sql/finca_fotos.sql), no esta página.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Panel · Taza Maestra",
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminFincas locale={locale} />;
}

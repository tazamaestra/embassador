import { setRequestLocale } from "next-intl/server";
import CheckoutScreen from "@/components/checkout/CheckoutScreen";
import type { Locale } from "@/lib/types";

export const metadata = {
  title: "Finalizar compra · Taza Maestra",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CheckoutScreen locale={locale} />;
}

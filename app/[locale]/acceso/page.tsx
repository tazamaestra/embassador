import { getLocale } from "next-intl/server";
import AuthForm from "@/components/auth/AuthForm";
import type { Locale } from "@/lib/types";

export default async function AccesoPage() {
  const locale = (await getLocale()) as Locale;
  return <AuthForm locale={locale} />;
}

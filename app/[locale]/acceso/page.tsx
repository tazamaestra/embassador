import { Suspense } from "react";
import { getLocale } from "next-intl/server";
import AuthForm from "@/components/auth/AuthForm";
import type { Locale } from "@/lib/types";

export default async function AccesoPage() {
  const locale = (await getLocale()) as Locale;
  return (
    <Suspense>
      <AuthForm locale={locale} />
    </Suspense>
  );
}

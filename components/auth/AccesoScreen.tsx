"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth-store";
import AuthPanel from "@/components/auth/AuthPanel";
import type { Locale } from "@/lib/types";

export default function AccesoScreen({ locale }: { locale: Locale }) {
  const t = useTranslations("acceso");
  const router = useRouter();
  const searchParams = useSearchParams();
  const siguiente = searchParams.get("next") || "/cuenta";
  const idioma = useLocale();
  const { user, init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  // Si ya hay sesión, no tiene sentido pedir un código.
  useEffect(() => {
    if (user) router.replace(siguiente as "/cuenta");
  }, [user, router, siguiente]);

  return (
    <div className="bg-fondo min-h-[70vh] flex items-center justify-center px-[22px] py-16">
      <div className="w-full max-w-[420px]">
        <h1 className="font-display font-bold text-tinta text-3xl mb-2">{t("h1")}</h1>
        <p className="font-body text-tinta-suave text-base mb-6">{t("subRegistro")}</p>

        <AuthPanel
          locale={locale}
          destino={`/${idioma}${siguiente}`}
          onListo={() => router.replace(siguiente as "/cuenta")}
        />
      </div>
    </div>
  );
}

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
  const pedido = searchParams.get("next");
  const idioma = useLocale();
  const { user, esEquipo, init } = useAuthStore();
  // Sin destino pedido: el equipo va al panel y el cliente a su cuenta.
  const siguiente = pedido || (esEquipo ? "/admin" : "/cuenta");

  useEffect(() => {
    init();
  }, [init]);

  // Con sesión (recién entrado o de antes), se sigue en cuanto se sabe el rol.
  useEffect(() => {
    if (user && esEquipo !== null) router.replace(siguiente as "/cuenta");
  }, [user, esEquipo, router, siguiente]);

  return (
    <div className="bg-fondo min-h-[70vh] flex items-center justify-center px-[22px] py-16">
      <div className="w-full max-w-[420px]">
        <h1 className="font-display font-bold text-tinta text-3xl mb-2">{t("h1")}</h1>
        <p className="font-body text-tinta-suave text-base mb-6">{t("subLogin")}</p>

        <AuthPanel
          locale={locale}
          destino={`/${idioma}${siguiente}`}
          onListo={() => {
            // La redirección la hace el efecto de arriba, cuando llega el rol.
          }}
        />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth-store";
import { llamarApi } from "@/lib/pago";
import type { Cobro, Locale, Suscripcion } from "@/lib/types";

type Estado = "esperando" | "lista" | "pendiente" | "rechazado" | "unico";

// Aquí llega el cliente tras el alta (o tras el Web Checkout de una compra
// única). Quien activa la suscripción es el cobro aprobado —por la respuesta
// de Wompi o por el webhook—, así que se consulta un par de veces antes de
// dar una respuesta.
export default function ConfirmacionScreen({ locale }: { locale: Locale }) {
  const t = useTranslations("confirmacion");
  const tc = useTranslations("checkout");
  const es = locale !== "en";
  const searchParams = useSearchParams();
  const referencia = searchParams.get("ref") ?? "";
  const { user, init } = useAuthStore();

  const [estado, setEstado] = useState<Estado>("esperando");
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!user) return;

    if (referencia.startsWith("UNI-")) {
      setEstado("unico");
      return;
    }

    let cancelado = false;
    let intentos = 0;

    async function revisar() {
      if (cancelado || !user) return;
      intentos += 1;
      const r = await llamarApi<{ suscripcion: Suscripcion | null; cobros: Cobro[] }>("/api/suscripciones/mia");
      if (cancelado) return;

      const s = r.ok ? r.data.suscripcion : null;
      if (s?.estado === "activa") {
        setSuscripcion(s);
        setEstado("lista");
        return;
      }
      const ultimo = r.ok ? r.data.cobros[0] : undefined;
      if (s?.estado === "pago_pendiente" && ultimo && ["DECLINED", "ERROR", "VOIDED"].includes(ultimo.estado)) {
        setEstado("rechazado");
        return;
      }

      if (intentos < 6) {
        setTimeout(revisar, 2000);
      } else {
        setEstado("pendiente");
      }
    }

    revisar();
    return () => {
      cancelado = true;
    };
  }, [user, referencia]);

  return (
    <div className="bg-fondo min-h-[70vh] flex items-center justify-center px-[22px] py-20">
      <div className="w-full max-w-[460px] text-center">
        {estado === "esperando" ? (
          <>
            <p className="font-body text-tinta-suave text-base mb-4">{tc("procesando")}</p>
            <div className="h-1 bg-arena rounded-pill overflow-hidden" aria-hidden="true">
              <div
                className="h-full bg-naranja"
                style={{ animation: "llenando 1.4s ease-in-out infinite" }}
              />
            </div>
          </>
        ) : (
          <div className="animate-[fadeUp_.3s_ease-out]" role="status">
            <h1 className="font-display font-bold text-tinta text-4xl mb-3">
              {estado === "rechazado" ? (es ? "Falta el pago" : "Payment pending") : t("h1")}
            </h1>

            <p className="font-body text-tinta-suave text-base mb-3">
              {estado === "lista" && suscripcion
                ? t("suscripcion", { fecha: suscripcion.proximoEnvio })
                : estado === "unico"
                  ? t("unico")
                  : estado === "rechazado"
                    ? es
                      ? "El banco no aprobó el pago. Tu suscripción quedó guardada: prueba con otra tarjeta o con Nequi desde tu cuenta."
                      : "The bank didn't approve the payment. Your subscription is saved: try another card or Nequi from your account."
                    : t("pendiente")}
            </p>

            {estado === "lista" ? (
              <p className="font-body text-tinta-suave text-sm mb-8">{t("correoEnviado")}</p>
            ) : (
              <div className="mb-8" />
            )}

            <Link
              href="/cuenta"
              className="inline-block bg-vino hover:bg-vino-800 text-crema-papel font-body font-700 text-base px-6 py-3 rounded-btn transition-colors"
            >
              {t("cuenta")}
            </Link>
          </div>
        )}

        {referencia && (
          <p className="font-mono text-[10px] tracking-[.14em] text-tinta-suave/70 mt-8">
            {referencia}
          </p>
        )}
      </div>
    </div>
  );
}

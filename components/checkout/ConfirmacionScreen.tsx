"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth-store";
import { FEATURE_PAGOS } from "@/lib/flags";
import { obtenerSuscripcion } from "@/lib/suscripcion-db";
import type { Locale, Suscripcion } from "@/lib/types";

type Estado = "esperando" | "lista" | "pendiente" | "unico";

// Wompi devuelve al usuario aquí; quien activa la suscripción es el webhook,
// así que se consulta un par de veces antes de dar una respuesta.
export default function ConfirmacionScreen({ locale }: { locale: Locale }) {
  const t = useTranslations("confirmacion");
  const tc = useTranslations("checkout");
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
      try {
        const s = await obtenerSuscripcion(user.id);
        if (cancelado) return;
        if (s && s.estado === "activa") {
          setSuscripcion(s);
          setEstado("lista");
          return;
        }
      } catch {
        // Si la consulta falla se reintenta; el webhook manda.
      }
      if (intentos < 5) {
        setTimeout(revisar, 1500);
      } else if (!cancelado) {
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
          <div className="animate-[fadeUp_.3s_ease-out]">
            <h1 className="font-display font-bold text-tinta text-4xl mb-3">
              {t("h1")}
            </h1>

            <p className="font-body text-tinta-suave text-base mb-3">
              {estado === "lista" && suscripcion
                ? t("suscripcion", { fecha: suscripcion.proximoEnvio })
                : estado === "unico"
                  ? t("unico")
                  : t("pendiente")}
            </p>

            {/* Con la pasarela apagada, el cliente tiene que saber que el
                cobro se coordina aparte. No dejarlo claro sería engañarlo. */}
            {estado === "lista" && (
              <p className="font-body text-tinta-suave text-sm mb-8">
                {FEATURE_PAGOS ? t("correoEnviado") : t("sinPago")}
              </p>
            )}
            {estado !== "lista" && <div className="mb-8" />}

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

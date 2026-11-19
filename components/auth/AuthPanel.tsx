"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  LARGO_MINIMO_PASSWORD, traducirErrorAuth, useAuthStore,
} from "@/lib/auth-store";
import OtpForm from "@/components/auth/OtpForm";
import type { Locale } from "@/lib/types";

// Solo entrar: correo y contraseña, o un código al correo. Las cuentas las
// crea el equipo y se las envía a cada cliente (parte de la posventa), así
// que aquí no hay registro. Se usa suelto en /acceso y embebido en el checkout.

const ENTRADA =
  "w-full bg-white border border-borde rounded-input px-4 py-3 font-body text-tinta text-base placeholder:text-tinta-suave/50 focus:outline-none focus:border-naranja focus:ring-1 focus:ring-naranja transition-colors";
const ETIQUETA =
  "block font-mono text-[11px] tracking-[.15em] text-tinta-suave uppercase mb-1";

export default function AuthPanel({
  locale,
  onListo,
  emailInicial = "",
}: {
  locale: Locale;
  /** Se llama cuando ya hay sesión (correo/contraseña o código). */
  onListo?: () => void;
  /** Ya no se usa (era el regreso de Google); se acepta para no romper a quien lo pasa. */
  destino?: string;
  emailInicial?: string;
}) {
  const t = useTranslations("acceso");
  const es = locale !== "en";
  const { entrarConPassword } = useAuthStore();

  const [conCodigo, setConCodigo] = useState(false);
  const [email, setEmail] = useState(emailInicial);
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState<"" | "correo">("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAviso("");

    if (!email.includes("@")) {
      setError(t("emailInvalido"));
      return;
    }
    if (password.length < LARGO_MINIMO_PASSWORD) {
      setError(t("passwordCorta"));
      return;
    }

    setCargando("correo");
    const r = await entrarConPassword(email.trim(), password);
    setCargando("");

    if (!r.ok) {
      setError(traducirErrorAuth(r.error, es));
      return;
    }

    onListo?.();
  }

  if (conCodigo) {
    return (
      <div>
        <OtpForm locale={locale} onListo={onListo} emailInicial={email} />
        <button
          type="button"
          onClick={() => setConCodigo(false)}
          className="mt-4 font-body text-sm text-tinta-suave hover:text-vino transition-colors underline"
        >
          {t("volverPassword")}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* noValidate: la validación nativa sale en el idioma del navegador, que
          no tiene por qué ser el de la página. Los mensajes los damos nosotros. */}
      <form onSubmit={enviar} noValidate className="space-y-3">
        <div>
          <label htmlFor="auth-email" className={ETIQUETA}>{t("emailLabel")}</label>
          <input
            id="auth-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            aria-invalid={Boolean(error)}
            className={ENTRADA}
          />
        </div>

        <div>
          <label htmlFor="auth-password" className={ETIQUETA}>{t("passwordLabel")}</label>
          <div className="relative">
            <input
              id="auth-password"
              type={verPassword ? "text" : "password"}
              // Le dice al gestor de contraseñas si guarda una nueva o usa la de siempre.
              autoComplete="current-password"
              minLength={LARGO_MINIMO_PASSWORD}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
                            aria-invalid={Boolean(error)}
              className={`${ENTRADA} pr-24`}
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] tracking-[.1em] uppercase text-tinta-suave hover:text-vino px-2 py-1 transition-colors"
            >
              {verPassword ? t("ocultarPassword") : t("verPassword")}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="font-body text-sm text-vino">{error}</p>
        )}
        {aviso && (
          <p role="status" className="font-body text-sm text-verde">{aviso}</p>
        )}

        <button
          type="submit"
          disabled={cargando !== ""}
          className="w-full bg-vino hover:bg-vino-800 disabled:opacity-70 text-crema-papel font-body font-700 text-base px-6 py-3 rounded-btn transition-colors"
        >
          {cargando === "correo" ? t("entrando") : t("entrar")}
        </button>
      </form>

      <button
        type="button"
        onClick={() => { setConCodigo(true); setError(""); setAviso(""); }}
        className="mt-4 font-body text-sm text-tinta-suave hover:text-vino transition-colors underline"
      >
        {t("preferoCodigo")}
      </button>

      <p className="mt-6 pt-5 border-t border-borde font-body text-sm text-tinta-suave leading-relaxed">
        {t("cuentaPorNosotros")}
      </p>
    </div>
  );
}

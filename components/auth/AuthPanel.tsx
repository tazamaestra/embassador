"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  LARGO_MINIMO_PASSWORD, traducirErrorAuth, useAuthStore,
} from "@/lib/auth-store";
import OtpForm from "@/components/auth/OtpForm";
import type { Locale } from "@/lib/types";

// Las tres puertas en una sola pantalla: Google arriba, correo y contraseña
// debajo, y el código por correo como escape para quien no quiera inventar
// otra clave. Se usa suelto en /acceso y embebido en el checkout.

type Modo = "registro" | "login";

const ENTRADA =
  "w-full bg-white border border-borde rounded-input px-4 py-3 font-body text-tinta text-base placeholder:text-tinta-suave/50 focus:outline-none focus:border-naranja focus:ring-1 focus:ring-naranja transition-colors";
const ETIQUETA =
  "block font-mono text-[11px] tracking-[.15em] text-tinta-suave uppercase mb-1";

function IconoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export default function AuthPanel({
  locale,
  onListo,
  destino = "/cuenta",
  emailInicial = "",
}: {
  locale: Locale;
  /** Se llama cuando ya hay sesión (correo/contraseña o código). */
  onListo?: () => void;
  /** A dónde vuelve Google. Debe ser una ruta con prefijo de idioma. */
  destino?: string;
  emailInicial?: string;
}) {
  const t = useTranslations("acceso");
  const es = locale !== "en";
  const { registrar, entrarConPassword, entrarConGoogle } = useAuthStore();

  const [modo, setModo] = useState<Modo>("registro");
  const [conCodigo, setConCodigo] = useState(false);
  const [email, setEmail] = useState(emailInicial);
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState<"" | "google" | "correo">("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  async function conGoogle() {
    setError("");
    setCargando("google");
    const r = await entrarConGoogle(destino);
    // Si sale bien, el navegador ya se fue a Google y esto no se ejecuta.
    if (!r.ok) {
      setCargando("");
      setError(traducirErrorAuth(r.error, es));
    }
  }

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
    const r =
      modo === "registro"
        ? await registrar(email.trim(), password)
        : await entrarConPassword(email.trim(), password);
    setCargando("");

    if (!r.ok) {
      setError(traducirErrorAuth(r.error, es));
      return;
    }

    // Registro con confirmación de correo encendida: hay cuenta pero no
    // sesión, así que no se puede seguir al pago todavía.
    if ("faltaConfirmar" in r && r.faltaConfirmar) {
      setAviso(t("revisaCorreo"));
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
      <button
        type="button"
        onClick={conGoogle}
        disabled={cargando !== ""}
        className="w-full flex items-center justify-center gap-2.5 bg-white border border-borde-2 hover:border-vino text-tinta font-body font-700 text-base px-6 py-3 rounded-btn transition-colors disabled:opacity-60"
      >
        <IconoGoogle />
        {cargando === "google" ? t("abriendoGoogle") : t("conGoogle")}
      </button>

      <div className="flex items-center gap-3 my-5" aria-hidden="true">
        <span className="h-px bg-borde flex-1" />
        <span className="font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase">
          {t("oBien")}
        </span>
        <span className="h-px bg-borde flex-1" />
      </div>

      {/* Crear cuenta o entrar */}
      <div role="tablist" aria-label={t("h1")} className="flex gap-2 mb-5">
        {(["registro", "login"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={modo === m}
            onClick={() => { setModo(m); setError(""); setAviso(""); }}
            className={`font-body font-600 text-sm px-4 py-2 rounded-pill border transition-colors ${
              modo === m
                ? "bg-vino text-crema-papel border-vino"
                : "bg-white text-tinta-cafe border-borde hover:border-vino"
            }`}
          >
            {m === "registro" ? t("tabRegistro") : t("tabLogin")}
          </button>
        ))}
      </div>

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
              autoComplete={modo === "registro" ? "new-password" : "current-password"}
              minLength={LARGO_MINIMO_PASSWORD}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={modo === "registro" ? t("passwordPlaceholder") : undefined}
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
          {cargando === "correo"
            ? modo === "registro" ? t("creando") : t("entrando")
            : modo === "registro" ? t("crearCuenta") : t("entrar")}
        </button>
      </form>

      <button
        type="button"
        onClick={() => { setConCodigo(true); setError(""); setAviso(""); }}
        className="mt-4 font-body text-sm text-tinta-suave hover:text-vino transition-colors underline"
      >
        {t("preferoCodigo")}
      </button>
    </div>
  );
}

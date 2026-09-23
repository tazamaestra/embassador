"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { traducirErrorAuth, useAuthStore } from "@/lib/auth-store";
import type { Locale } from "@/lib/types";

// Acceso sin contraseña, en dos campos y sin salir de la pantalla.
// Se usa suelto en /acceso y embebido dentro del checkout.
export default function OtpForm({
  locale,
  onListo,
  emailInicial = "",
}: {
  locale: Locale;
  onListo?: () => void;
  emailInicial?: string;
}) {
  const t = useTranslations("acceso");
  const es = locale !== "en";
  const { pedirCodigo, verificarCodigo } = useAuthStore();

  const [fase, setFase] = useState<"correo" | "codigo">("correo");
  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function enviarCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setError(t("emailInvalido"));
      return;
    }
    setCargando(true);
    setError("");
    const r = await pedirCodigo(email.trim());
    setCargando(false);
    if (!r.ok) {
      setError(traducirErrorAuth(r.error, es));
      return;
    }
    setFase("codigo");
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    if (codigo.trim().length < 6) {
      setError(t("codigoCorto"));
      return;
    }
    setCargando(true);
    setError("");
    const r = await verificarCodigo(email.trim(), codigo);
    setCargando(false);
    if (!r.ok) {
      setError(traducirErrorAuth(r.error, es));
      return;
    }
    onListo?.();
  }

  const inputClass =
    "w-full bg-white border border-borde rounded-input px-4 py-3 font-body text-tinta text-base placeholder:text-tinta-suave/50 focus:outline-none focus:border-naranja focus:ring-1 focus:ring-naranja transition-colors";
  const labelClass =
    "block font-mono text-[11px] tracking-[.15em] text-tinta-suave uppercase mb-1";

  if (fase === "correo") {
    return (
      <form onSubmit={enviarCodigo} className="space-y-3">
        <div>
          <label htmlFor="otp-email" className={labelClass}>
            {t("emailLabel")}
          </label>
          <input
            id="otp-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            aria-invalid={!!error}
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="font-body text-sm text-vino">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-vino hover:bg-vino-800 disabled:opacity-70 text-crema-papel font-body font-700 text-base px-6 py-3 rounded-btn transition-colors"
        >
          {cargando ? t("enviando") : t("enviar")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verificar} className="space-y-3">
      <p className="font-body text-sm text-tinta-suave" aria-live="polite">
        {t("codigoEnviado")}
      </p>

      <div>
        <label htmlFor="otp-codigo" className={labelClass}>
          {t("codigoLabel")}
        </label>
        <input
          id="otp-codigo"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          autoFocus
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
          aria-invalid={!!error}
          className={`${inputClass} font-mono tracking-[.4em] text-center text-xl`}
        />
      </div>

      {error && (
        <p role="alert" className="font-body text-sm text-vino">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={cargando}
        className="w-full bg-vino hover:bg-vino-800 disabled:opacity-70 text-crema-papel font-body font-700 text-base px-6 py-3 rounded-btn transition-colors"
      >
        {cargando ? t("verificando") : t("verificar")}
      </button>

      <div className="flex justify-between gap-4 pt-1">
        <button
          type="button"
          onClick={(e) => { setCodigo(""); enviarCodigo(e); }}
          className="font-body text-sm text-tinta-suave hover:text-vino transition-colors"
        >
          {t("reenviar")}
        </button>
        <button
          type="button"
          onClick={() => { setFase("correo"); setCodigo(""); setError(""); }}
          className="font-body text-sm text-tinta-suave hover:text-vino transition-colors"
        >
          {t("cambiarCorreo")}
        </button>
      </div>
    </form>
  );
}

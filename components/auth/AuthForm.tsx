"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth-store";
import type { Locale } from "@/lib/types";

type Tab = "register" | "login";
type RegErrors = Partial<Record<"name" | "email" | "phone" | "city" | "password" | "confirm", string>>;

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block font-mono text-[11px] tracking-[.15em] text-crema/60 uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className="w-full bg-white/5 border border-white/10 rounded-input px-4 py-3 font-body text-crema-papel text-sm placeholder:text-crema/20 focus:outline-none focus:border-naranja focus:ring-1 focus:ring-naranja transition-colors"
        style={{ caretColor: "#E8731E" }}
      />
      {error && (
        <p id={`${id}-err`} role="alert" className="font-body text-xs text-naranja-claro">
          {error}
        </p>
      )}
    </div>
  );
}

export default function AuthForm({ locale }: { locale: Locale }) {
  const es = locale !== "en";
  const router = useRouter();
  const { user, register, login } = useAuthStore();

  const [tab, setTab] = useState<Tab>("register");
  const [loading, setLoading] = useState(false);

  // Register state
  const [reg, setReg] = useState({ name: "", email: "", phone: "", city: "", password: "", confirm: "" });
  const [regErrors, setRegErrors] = useState<RegErrors>({});

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (user) router.push("/embajadores");
  }, [user, router]);

  function setRegField(key: keyof typeof reg) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setReg((prev) => ({ ...prev, [key]: e.target.value }));
      setRegErrors((prev) => ({ ...prev, [key]: undefined }));
    };
  }

  function validateReg(): boolean {
    const errs: RegErrors = {};
    if (!reg.name.trim()) errs.name = es ? "Requerido" : "Required";
    if (!reg.email.includes("@")) errs.email = es ? "Email inválido" : "Invalid email";
    if (!reg.phone.trim()) errs.phone = es ? "Requerido" : "Required";
    if (!reg.city.trim()) errs.city = es ? "Requerido" : "Required";
    if (reg.password.length < 8) errs.password = es ? "Mínimo 8 caracteres" : "At least 8 characters";
    if (reg.confirm !== reg.password) errs.confirm = es ? "Las contraseñas no coinciden" : "Passwords don't match";
    setRegErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!validateReg()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const result = register({ name: reg.name, email: reg.email, phone: reg.phone, city: reg.city });
    setLoading(false);
    if (!result.success) {
      setRegErrors({ email: es ? "Este correo ya está registrado" : "Email already registered" });
    }
    // If success, useEffect above will redirect
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail.includes("@")) {
      setLoginError(es ? "Email inválido" : "Invalid email");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const result = login(loginEmail);
    setLoading(false);
    if (!result.success) {
      setLoginError(
        es
          ? "Correo no encontrado. ¿Ya tienes cuenta?"
          : "Email not found. Do you have an account?"
      );
    }
    // If success, useEffect above will redirect
  }

  const inputCls =
    "w-full bg-white/5 border border-white/10 rounded-input px-4 py-3 font-body text-crema-papel text-sm placeholder:text-crema/20 focus:outline-none focus:border-naranja focus:ring-1 focus:ring-naranja transition-colors";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5.5 py-12"
      style={{ background: "#2A1410" }}
    >
      {/* Brand */}
      <div className="mb-8 text-center" aria-hidden="true">
        <p className="font-mono text-[11px] tracking-[.25em] text-naranja uppercase mb-1">
          {es ? "Programa" : "Program"}
        </p>
        <p className="font-display font-bold text-crema-papel" style={{ fontSize: "clamp(26px,4vw,36px)" }}>
          Taza Maestra
        </p>
        <p className="font-body text-crema/50 text-sm mt-1">
          {es ? "Embajadores" : "Ambassadors"}
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-card-lg border border-white/10 overflow-hidden"
        style={{ background: "rgba(255,255,255,.04)" }}
      >
        {/* Tabs */}
        <div
          role="tablist"
          aria-label={es ? "Tipo de acceso" : "Access type"}
          className="grid grid-cols-2 border-b border-white/10"
        >
          {(["register", "login"] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-controls={`auth-panel-${t}`}
              id={`auth-tab-${t}`}
              onClick={() => {
                setTab(t);
                setRegErrors({});
                setLoginError("");
              }}
              className={[
                "py-4 font-body text-sm font-semibold transition-colors border-b-2",
                tab === t
                  ? "text-crema-papel border-naranja"
                  : "text-crema/40 border-transparent hover:text-crema/70",
              ].join(" ")}
            >
              {t === "register" ? (es ? "Regístrate" : "Sign up") : (es ? "Iniciar sesión" : "Log in")}
            </button>
          ))}
        </div>

        {/* Register panel */}
        <div
          role="tabpanel"
          id="auth-panel-register"
          aria-labelledby="auth-tab-register"
          hidden={tab !== "register"}
        >
          <form
            onSubmit={handleRegister}
            noValidate
            aria-label={es ? "Formulario de registro" : "Registration form"}
            className="p-6 md:p-8 space-y-4"
          >
            <Field
              id="r-name"
              label={es ? "Nombre completo" : "Full name"}
              value={reg.name}
              onChange={setRegField("name")}
              error={regErrors.name}
              autoComplete="name"
            />
            <Field
              id="r-email"
              label="Email"
              type="email"
              value={reg.email}
              onChange={setRegField("email")}
              error={regErrors.email}
              autoComplete="email"
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                id="r-phone"
                label="WhatsApp"
                type="tel"
                value={reg.phone}
                onChange={setRegField("phone")}
                error={regErrors.phone}
                autoComplete="tel"
              />
              <Field
                id="r-city"
                label={es ? "Ciudad" : "City"}
                value={reg.city}
                onChange={setRegField("city")}
                error={regErrors.city}
                autoComplete="address-level2"
              />
            </div>
            <Field
              id="r-password"
              label={es ? "Contraseña" : "Password"}
              type="password"
              value={reg.password}
              onChange={setRegField("password")}
              error={regErrors.password}
              autoComplete="new-password"
            />
            <Field
              id="r-confirm"
              label={es ? "Confirmar contraseña" : "Confirm password"}
              type="password"
              value={reg.confirm}
              onChange={setRegField("confirm")}
              error={regErrors.confirm}
              autoComplete="new-password"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-naranja hover:bg-naranja-700 disabled:opacity-60 text-white font-body font-semibold text-base py-3.5 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5 mt-2"
            >
              {loading
                ? es ? "Creando cuenta…" : "Creating account…"
                : es ? "Crear mi cuenta →" : "Create my account →"}
            </button>

            <p className="text-center font-body text-crema/40 text-xs pt-1">
              {es ? "¿Ya tienes cuenta?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => { setTab("login"); setRegErrors({}); }}
                className="text-naranja-claro hover:underline"
              >
                {es ? "Inicia sesión" : "Log in"}
              </button>
            </p>
          </form>
        </div>

        {/* Login panel */}
        <div
          role="tabpanel"
          id="auth-panel-login"
          aria-labelledby="auth-tab-login"
          hidden={tab !== "login"}
        >
          <form
            onSubmit={handleLogin}
            noValidate
            aria-label={es ? "Formulario de inicio de sesión" : "Login form"}
            className="p-6 md:p-8 space-y-4"
          >
            {loginError && (
              <p
                role="alert"
                className="font-body text-sm text-naranja-claro rounded-input border border-naranja/20 px-4 py-3"
                style={{ background: "rgba(232,115,30,.08)" }}
              >
                {loginError}
              </p>
            )}

            <div className="space-y-1">
              <label
                htmlFor="l-email"
                className="block font-mono text-[11px] tracking-[.15em] text-crema/60 uppercase"
              >
                Email
              </label>
              <input
                id="l-email"
                type="email"
                value={loginEmail}
                onChange={(e) => { setLoginEmail(e.target.value); setLoginError(""); }}
                autoComplete="email"
                className={inputCls}
                style={{ caretColor: "#E8731E" }}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="l-password"
                className="block font-mono text-[11px] tracking-[.15em] text-crema/60 uppercase"
              >
                {es ? "Contraseña" : "Password"}
              </label>
              <input
                id="l-password"
                type="password"
                value={loginPassword}
                onChange={(e) => { setLoginPassword(e.target.value); setLoginError(""); }}
                autoComplete="current-password"
                className={inputCls}
                style={{ caretColor: "#E8731E" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-naranja hover:bg-naranja-700 disabled:opacity-60 text-white font-body font-semibold text-base py-3.5 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5 mt-2"
            >
              {loading
                ? es ? "Entrando…" : "Signing in…"
                : es ? "Entrar →" : "Sign in →"}
            </button>

            <p className="text-center font-body text-crema/40 text-xs pt-1">
              {es ? "¿Eres nuevo?" : "New here?"}{" "}
              <button
                type="button"
                onClick={() => { setTab("register"); setLoginError(""); }}
                className="text-naranja-claro hover:underline"
              >
                {es ? "Regístrate" : "Sign up"}
              </button>
            </p>
          </form>
        </div>
      </div>

      {/* Back link */}
      <p className="mt-6 font-body text-crema/40 text-xs">
        <a href="/" className="hover:text-crema/60 transition-colors">
          ← {es ? "Volver al inicio" : "Back to home"}
        </a>
      </p>
    </div>
  );
}

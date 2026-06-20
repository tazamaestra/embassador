"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { steps, blogPosts, aiFeatures, aiChat } from "@/lib/content";
import { Link } from "@/lib/nav";
import type { Locale } from "@/lib/types";

const PLANS = [
  {
    id: "inicio",
    name_es: "Plan Inicio",
    name_en: "Starter Plan",
    range_es: "1 – 60 libras",
    range_en: "1 – 60 pounds",
    pct: "15%",
    highlight: false,
    perks_es: [
      "Precio mayorista desde tu primera libra",
      "Tu marca o la nuestra",
      "Asesor personal asignado",
    ],
    perks_en: [
      "Wholesale price from your first pound",
      "Your brand or ours",
      "Personal advisor assigned",
    ],
  },
  {
    id: "crecimiento",
    name_es: "Plan Crecimiento",
    name_en: "Growth Plan",
    range_es: "+ 60 libras",
    range_en: "+ 60 pounds",
    pct: "20%",
    highlight: true,
    perks_es: [
      "Precio mayorista preferencial",
      "Condiciones y descuentos exclusivos",
      "Asesor dedicado + soporte prioritario",
    ],
    perks_en: [
      "Preferential wholesale price",
      "Exclusive terms and discounts",
      "Dedicated advisor + priority support",
    ],
  },
];

const STEP1_PERKS = {
  es: [
    { icon: "🚫", title: "Sin franquicia", desc: "Cero inversión fija para arrancar. Solo el café que decides comprar." },
    { icon: "💰", title: "Sin cuotas ocultas", desc: "Precio transparente, sin sorpresas. Pagas lo que vendes." },
    { icon: "🧑‍💼", title: "Asesor asignado", desc: "Te acompañamos desde el primer día con soporte personalizado." },
  ],
  en: [
    { icon: "🚫", title: "No franchise", desc: "Zero fixed investment to start. Only the coffee you decide to buy." },
    { icon: "💰", title: "No hidden fees", desc: "Transparent pricing, no surprises. You pay for what you sell." },
    { icon: "🧑‍💼", title: "Advisor assigned", desc: "We support you from day one with personalized guidance." },
  ],
};

const WA_GUIDE = {
  es: [
    { n: "01", t: "Recibe tu enlace", d: "Tras registrarte te enviamos el link del agente IA por correo." },
    { n: "02", t: "Guarda el número", d: "Agrega el contacto en WhatsApp para recibir mensajes y alertas." },
    { n: "03", t: 'Escríbele "Hola"', d: "El agente se activa y te explica todo lo que puede hacer por ti." },
    { n: "04", t: "Deja que trabaje", d: "Monitoreará tus clientes y te avisará cuándo es momento de vender." },
  ],
  en: [
    { n: "01", t: "Receive your link", d: "After sign-up we send you the AI agent link by email." },
    { n: "02", t: "Save the number", d: "Add the contact in WhatsApp to receive messages and alerts." },
    { n: "03", t: 'Write "Hello"', d: "The agent activates and walks you through everything it can do." },
    { n: "04", t: "Let it work", d: "It monitors your clients and alerts you when it's time to sell." },
  ],
};

export default function HowItWorks({ locale }: { locale: Locale }) {
  const [active, setActive] = useState(1);
  const t = useTranslations("how");
  const es = locale !== "en";
  const step1Perks = es ? STEP1_PERKS.es : STEP1_PERKS.en;
  const waGuide = es ? WA_GUIDE.es : WA_GUIDE.en;

  return (
    <section
      className="py-20"
      style={{ background: "#2A1410" }}
      aria-labelledby="flow-heading"
    >
      <div className="max-w-310 mx-auto px-5.5">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="font-mono text-[11px] tracking-[.2em] text-naranja uppercase mb-2">
            {t("kicker")}
          </p>
          <h2
            id="flow-heading"
            className="font-display font-bold text-crema-papel"
            style={{ fontSize: "clamp(30px,4vw,46px)" }}
          >
            {t("h2")}
          </h2>
        </div>

        {/* Step tabs */}
        <div
          role="tablist"
          aria-label={es ? "Pasos para ser embajador" : "Steps to become an ambassador"}
          className="flex gap-2 overflow-x-auto pb-2 mb-6"
        >
          {steps.map((step, i) => {
            const n = i + 1;
            const isActive = active === n;
            return (
              <button
                key={step.n}
                role="tab"
                id={`flow-tab-${n}`}
                aria-selected={isActive}
                aria-controls={`flow-panel-${n}`}
                onClick={() => setActive(n)}
                className={[
                  "shrink-0 flex items-center gap-2.5 px-5 py-3 rounded-pill font-body text-sm font-semibold transition-all duration-200 border outline-none focus-visible:ring-2 focus-visible:ring-naranja",
                  isActive
                    ? "bg-naranja border-naranja text-white"
                    : "border-white/10 text-crema/60 hover:text-crema hover:border-white/20",
                ].join(" ")}
                style={isActive ? {} : { background: "rgba(255,255,255,.05)" }}
              >
                <span
                  className={[
                    "w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] font-bold",
                    isActive ? "bg-white/20 text-white" : "bg-white/10 text-crema/50",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {n}
                </span>
                {es ? step.t_es : step.t_en}
              </button>
            );
          })}
        </div>

        {/* Panel container */}
        <div
          className="rounded-card-lg border border-white/10"
          style={{ background: "rgba(255,255,255,.03)" }}
        >

          {/* Panel 1 – Regístrate */}
          <div
            role="tabpanel"
            id="flow-panel-1"
            aria-labelledby="flow-tab-1"
            hidden={active !== 1}
            className="p-8 md:p-10"
          >
            <p className="font-body text-crema/70 text-base mb-8 max-w-xl">
              {es
                ? "Sin franquicia, sin cuotas ocultas. Cuéntanos de ti y te asignamos un asesor que te acompaña desde el primer día."
                : "No franchise, no hidden fees. Tell us about yourself and we'll assign an advisor who supports you from day one."}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {step1Perks.map((perk) => (
                <div
                  key={perk.title}
                  className="rounded-card border border-white/10 p-5"
                  style={{ background: "rgba(255,255,255,.04)" }}
                >
                  <span className="text-2xl mb-3 block" aria-hidden="true">{perk.icon}</span>
                  <h3 className="font-display font-bold text-crema-papel text-lg mb-1">{perk.title}</h3>
                  <p className="font-body text-crema/60 text-sm leading-relaxed">{perk.desc}</p>
                </div>
              ))}
            </div>
            <Link
              href="/acceso"
              className="inline-flex items-center gap-2 bg-naranja hover:bg-naranja-700 text-white font-body font-semibold text-base px-7 py-3.5 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5"
            >
              {es ? "Quiero ser embajador →" : "I want to be an ambassador →"}
            </Link>
          </div>

          {/* Panel 2 – Elige tu plan */}
          <div
            role="tabpanel"
            id="flow-panel-2"
            aria-labelledby="flow-tab-2"
            hidden={active !== 2}
            className="p-8 md:p-10"
          >
            <p className="font-body text-crema/70 text-base mb-8 max-w-xl">
              {es
                ? "Compra a precio mayorista y define tu margen. Sin mínimos fijos, sin sorpresas."
                : "Buy at wholesale price and set your margin. No fixed minimums, no surprises."}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={[
                    "rounded-card-lg border p-6 relative",
                    plan.highlight ? "border-naranja" : "border-white/10",
                  ].join(" ")}
                  style={{ background: plan.highlight ? "rgba(232,115,30,.1)" : "rgba(255,255,255,.04)" }}
                >
                  {plan.highlight && (
                    <span className="absolute top-4 right-4 font-mono text-[10px] tracking-[.15em] bg-naranja text-white px-3 py-1 rounded-pill uppercase">
                      {es ? "Más popular" : "Most popular"}
                    </span>
                  )}
                  <p className="font-mono text-[11px] tracking-[.18em] text-naranja-claro uppercase mb-2">
                    {es ? plan.range_es : plan.range_en}
                  </p>
                  <h3 className="font-display font-bold text-crema-papel text-2xl mb-1">
                    {es ? plan.name_es : plan.name_en}
                  </h3>
                  <div className="flex items-baseline gap-2 my-5">
                    <span
                      className="font-display font-bold text-naranja leading-none"
                      style={{ fontSize: "clamp(44px,6vw,62px)" }}
                    >
                      {plan.pct}
                    </span>
                    <span className="font-body text-crema/60 text-sm">
                      {es ? "de margen" : "margin"}
                    </span>
                  </div>
                  <ul className="space-y-2.5" aria-label={es ? "Beneficios" : "Benefits"}>
                    {(es ? plan.perks_es : plan.perks_en).map((perk) => (
                      <li key={perk} className="flex items-start gap-2.5 font-body text-crema/80 text-sm">
                        <span className="text-naranja-claro shrink-0 font-bold mt-0.5" aria-hidden="true">✓</span>
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Panel 3 – Capacítate */}
          <div
            role="tabpanel"
            id="flow-panel-3"
            aria-labelledby="flow-tab-3"
            hidden={active !== 3}
            className="p-8 md:p-10"
          >
            <p className="font-body text-crema/70 text-base mb-8 max-w-xl">
              {es
                ? "Como embajador tendrás acceso gratuito a todo nuestro material: guías, videos de tueste y estrategia de ventas."
                : "As an ambassador you get free access to all our material: guides, roasting videos and sales strategy."}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {blogPosts.map((post, i) => (
                <article
                  key={i}
                  className="rounded-card overflow-hidden"
                  style={{ background: post.sw }}
                >
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      {post.isVideo && (
                        <span
                          className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] text-white font-bold"
                          aria-label={es ? "Video" : "Video"}
                        >
                          ▶
                        </span>
                      )}
                      <span className="font-mono text-[10px] tracking-[.15em] text-white/60 uppercase">
                        {post.tag}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-white text-lg leading-snug mb-2">
                      {es ? post.t_es : post.t_en}
                    </h3>
                    <p className="font-body text-white/60 text-xs leading-relaxed">
                      {es ? post.d_es : post.d_en}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Panel 4 – Vende y crece */}
          <div
            role="tabpanel"
            id="flow-panel-4"
            aria-labelledby="flow-tab-4"
            hidden={active !== 4}
            className="p-8 md:p-10"
          >
            <p className="font-body text-crema/70 text-base mb-8 max-w-xl">
              {es
                ? "Tu asistente de WhatsApp monitorea tus ventas y te avisa cuándo actuar. Cuatro pasos y ya está listo."
                : "Your WhatsApp assistant monitors your sales and alerts you when to act. Four steps and it's ready to go."}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">

              {/* Activation guide */}
              <div>
                <h3 className="font-mono text-[11px] tracking-[.18em] text-naranja uppercase mb-5">
                  {es ? "Cómo activarlo" : "How to activate it"}
                </h3>
                <ol className="space-y-5" aria-label={es ? "Pasos de activación" : "Activation steps"}>
                  {waGuide.map((step) => (
                    <li key={step.n} className="flex gap-4">
                      <span
                        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-mono text-[11px] font-bold border"
                        style={{
                          background: "rgba(31,138,76,.15)",
                          borderColor: "rgba(31,138,76,.35)",
                          color: "#1F8A4C",
                        }}
                        aria-hidden="true"
                      >
                        {step.n}
                      </span>
                      <div className="pt-1">
                        <h4 className="font-body font-semibold text-crema-papel text-sm mb-0.5">{step.t}</h4>
                        <p className="font-body text-crema/60 text-sm leading-relaxed">{step.d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Features + simulated chat */}
              <div>
                <h3 className="font-mono text-[11px] tracking-[.18em] text-naranja uppercase mb-5">
                  {es ? "Qué puede hacer" : "What it can do"}
                </h3>
                <ul className="space-y-3 mb-6" aria-label={es ? "Funciones del asistente" : "Assistant features"}>
                  {aiFeatures.map((feat, i) => (
                    <li key={i} className="flex gap-3">
                      <span
                        className="shrink-0 font-bold text-sm mt-0.5"
                        style={{ color: "#1F8A4C" }}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <p className="font-body text-sm text-crema/80">
                        <span className="font-semibold text-crema-papel">
                          {es ? feat.t_es : feat.t_en}
                        </span>
                        {" — "}
                        {es ? feat.d_es : feat.d_en}
                      </p>
                    </li>
                  ))}
                </ul>

                {/* Simulated chat */}
                <div
                  className="rounded-card overflow-hidden"
                  style={{ background: "#ECE5DD" }}
                  aria-label={es ? "Conversación de ejemplo con el asistente" : "Example conversation with the assistant"}
                >
                  <div
                    className="px-4 py-2.5 flex items-center gap-3"
                    style={{ background: "#075E54" }}
                    aria-hidden="true"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ background: "rgba(255,255,255,.12)" }}
                    >
                      ☕
                    </div>
                    <div>
                      <p className="font-body font-semibold text-white text-xs leading-none">Taza Maestra IA</p>
                      <p className="font-body text-white/60 text-[10px] leading-tight">
                        {es ? "en línea" : "online"}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    {aiChat.map((msg, i) => {
                      const isBot = msg.from === "bot";
                      return (
                        <div
                          key={i}
                          className={["flex", isBot ? "justify-start" : "justify-end"].join(" ")}
                        >
                          <p
                            className="max-w-[82%] px-3 py-2 font-body text-xs leading-relaxed text-tinta"
                            style={{
                              background: isBot ? "#fff" : "#DCF8C6",
                              borderRadius: isBot
                                ? "12px 12px 12px 2px"
                                : "12px 12px 2px 12px",
                            }}
                            aria-label={
                              isBot
                                ? es ? "Mensaje del asistente" : "Assistant message"
                                : es ? "Tu mensaje" : "Your message"
                            }
                          >
                            {es ? msg.text_es : msg.text_en}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-10">
          <Link
            href="/acceso"
            className="inline-flex items-center gap-2 bg-naranja hover:bg-naranja-700 text-white font-body font-semibold text-base px-7 py-3.5 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5"
          >
            {t("cta")}
          </Link>
        </div>

      </div>
    </section>
  );
}

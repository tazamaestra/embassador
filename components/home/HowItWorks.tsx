"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  UserPlus, Layers, GraduationCap,
  ShieldOff, Receipt, UserCheck,
  PlayCircle, BookOpen,
  Check,
} from "lucide-react";
import { steps, blogPosts } from "@/lib/content";
import { Link } from "@/lib/nav";
import type { Locale } from "@/lib/types";

/* ── Icon maps ─────────────────────────────────────────────────── */
const TAB_ICONS = [UserPlus, Layers, GraduationCap];

type PerkKey = "franchise" | "fees" | "advisor";
const PERK_ICONS: Record<PerkKey, React.ElementType> = {
  franchise: ShieldOff,
  fees: Receipt,
  advisor: UserCheck,
};

/* ── Static data ────────────────────────────────────────────────── */
const PLANS = [
  {
    id: "inicio",
    name_es: "Plan Inicio", name_en: "Starter Plan",
    range_es: "1 – 60 libras", range_en: "1 – 60 pounds",
    pct: "15%", highlight: false,
    perks_es: ["Precio mayorista desde tu primera libra", "Tu marca o la nuestra", "Asesor personal asignado"],
    perks_en: ["Wholesale price from your first pound", "Your brand or ours", "Personal advisor assigned"],
  },
  {
    id: "crecimiento",
    name_es: "Plan Crecimiento", name_en: "Growth Plan",
    range_es: "+ 60 libras", range_en: "+ 60 pounds",
    pct: "20%", highlight: true,
    perks_es: ["Precio mayorista preferencial", "Condiciones y descuentos exclusivos", "Asesor dedicado + soporte prioritario"],
    perks_en: ["Preferential wholesale price", "Exclusive terms and discounts", "Dedicated advisor + priority support"],
  },
];

const STEP1_PERKS = {
  es: [
    { key: "franchise" as PerkKey, title: "Sin franquicia",    desc: "Cero inversión fija para arrancar. Solo el café que decides comprar." },
    { key: "fees"      as PerkKey, title: "Sin cuotas ocultas", desc: "Precio transparente, sin sorpresas. Pagas lo que vendes." },
    { key: "advisor"   as PerkKey, title: "Asesor asignado",   desc: "Te acompañamos desde el primer día con soporte personalizado." },
  ],
  en: [
    { key: "franchise" as PerkKey, title: "No franchise",    desc: "Zero fixed investment to start. Only the coffee you decide to buy." },
    { key: "fees"      as PerkKey, title: "No hidden fees",  desc: "Transparent pricing, no surprises. You pay for what you sell." },
    { key: "advisor"   as PerkKey, title: "Advisor assigned", desc: "We support you from day one with personalized guidance." },
  ],
};

/* ── Component ──────────────────────────────────────────────────── */
export default function HowItWorks({ locale }: { locale: Locale }) {
  const [active, setActive] = useState(1);
  const t = useTranslations("how");
  const es = locale !== "en";
  const step1Perks = es ? STEP1_PERKS.es : STEP1_PERKS.en;

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

        {/* ── Step tabs ── */}
        <div
          role="tablist"
          aria-label={es ? "Pasos para ser embajador" : "Steps to become an ambassador"}
          className="flex gap-2 overflow-x-auto pb-2 mb-6"
        >
          {steps.map((step, i) => {
            const n = i + 1;
            const isActive = active === n;
            const TabIcon = TAB_ICONS[i];
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
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                    isActive ? "bg-white/20" : "bg-white/10",
                  ].join(" ")}
                >
                  <TabIcon
                    size={14}
                    aria-hidden="true"
                    className={isActive ? "text-white" : "text-crema/50"}
                  />
                </span>
                {es ? step.t_es : step.t_en}
              </button>
            );
          })}
        </div>

        {/* ── Panel container ── */}
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
              {step1Perks.map((perk) => {
                const Icon = PERK_ICONS[perk.key];
                return (
                  <div
                    key={perk.key}
                    className="rounded-card border border-white/10 p-6"
                    style={{ background: "rgba(255,255,255,.04)" }}
                  >
                    {/* Icon container */}
                    <div
                      className="w-11 h-11 rounded-card flex items-center justify-center mb-4"
                      style={{ background: "rgba(232,115,30,.15)" }}
                    >
                      <Icon
                        size={22}
                        aria-hidden="true"
                        className="text-naranja"
                        strokeWidth={1.75}
                      />
                    </div>
                    <h3 className="font-display font-bold text-crema-papel text-lg mb-1">
                      {perk.title}
                    </h3>
                    <p className="font-body text-crema/60 text-sm leading-relaxed">
                      {perk.desc}
                    </p>
                  </div>
                );
              })}
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
                  className={["rounded-card-lg border p-6 relative", plan.highlight ? "border-naranja" : "border-white/10"].join(" ")}
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
                    <span className="font-display font-bold text-naranja leading-none" style={{ fontSize: "clamp(44px,6vw,62px)" }}>
                      {plan.pct}
                    </span>
                    <span className="font-body text-crema/60 text-sm">
                      {es ? "de margen" : "margin"}
                    </span>
                  </div>
                  <ul className="space-y-2.5" aria-label={es ? "Beneficios" : "Benefits"}>
                    {(es ? plan.perks_es : plan.perks_en).map((perk) => (
                      <li key={perk} className="flex items-start gap-2.5 font-body text-crema/80 text-sm">
                        <Check
                          size={15}
                          aria-hidden="true"
                          className="text-naranja-claro shrink-0 mt-0.5"
                          strokeWidth={2.5}
                        />
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
              {blogPosts.map((post, i) => {
                const TypeIcon = post.isVideo ? PlayCircle : BookOpen;
                const typeLabel = post.isVideo
                  ? (es ? "Video" : "Video")
                  : (es ? "Guía de lectura" : "Reading guide");
                return (
                  <article
                    key={i}
                    className="rounded-card overflow-hidden"
                    style={{ background: post.sw }}
                  >
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0"
                          role="img"
                          aria-label={typeLabel}
                        >
                          <TypeIcon size={13} className="text-white" aria-hidden="true" />
                        </span>
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
                );
              })}
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

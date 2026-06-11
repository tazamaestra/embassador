"use client";

import { useTranslations } from "next-intl";
import { aiChat, aiFeatures } from "@/lib/content";
import type { Locale } from "@/lib/types";

export default function WhatsAppMock({ locale }: { locale: Locale }) {
  const t = useTranslations("ambassador");

  return (
    <section className="py-20 bg-fondo">
      <div className="max-w-[1240px] mx-auto px-[22px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Copy */}
          <div>
            <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">{t("aiKicker")}</p>
            <h2 className="font-display font-bold text-tinta mb-4" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
              {t("aiH2a")} <span className="text-vino">{t("aiH2b")}</span>
            </h2>
            <p className="font-body text-tinta-suave text-base leading-relaxed mb-7">{t("aiSub")}</p>
            <ul className="space-y-4">
              {aiFeatures.map((feat, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-wa-btn text-white flex items-center justify-center text-xs shrink-0 mt-0.5" aria-hidden="true">✓</span>
                  <div>
                    <span className="font-body font-700 text-tinta text-sm">
                      {locale === "en" ? feat.t_en : feat.t_es}
                    </span>
                    <span className="font-body text-tinta-suave text-sm"> — </span>
                    <span className="font-body text-tinta-suave text-sm">
                      {locale === "en" ? feat.d_en : feat.d_es}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* WhatsApp mockup */}
          <div
            className="rounded-card-lg overflow-hidden shadow-wa border border-borde max-w-[360px] mx-auto w-full"
            aria-label="Mockup del asistente IA de WhatsApp"
            role="img"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: "#075E54" }}>
              <div
                className="w-9 h-9 rounded-full bg-wa-btn flex items-center justify-center text-white font-display font-bold text-sm shrink-0"
                aria-hidden="true"
              >
                TM
              </div>
              <div>
                <p className="font-body font-700 text-white text-sm">{t("aiChatName")}</p>
                <p className="font-body text-white/60 text-xs">{t("aiChatStatus")}</p>
              </div>
            </div>

            {/* Chat body */}
            <div className="p-4 space-y-3 min-h-[280px]" style={{ background: "#ECE5DD" }}>
              {aiChat.map((msg, i) => {
                const text = locale === "en" ? msg.text_en : msg.text_es;
                const isBot = msg.from === "bot";
                return (
                  <div key={i} className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-card font-body text-sm text-tinta leading-relaxed shadow-sm ${
                        isBot ? "bg-white rounded-tl-none" : "rounded-tr-none"
                      }`}
                      style={!isBot ? { background: "#DCF8C6" } : undefined}
                    >
                      {text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input bar */}
            <div
              className="flex items-center gap-2 px-3 py-2 border-t border-borde"
              style={{ background: "#F0F0F0" }}
              aria-hidden="true"
            >
              <div className="flex-1 bg-white rounded-pill px-4 py-2 font-body text-sm text-tinta-suave">
                {t("aiChatInput")}
              </div>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-base"
                style={{ background: "#075E54" }}
              >
                ➤
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

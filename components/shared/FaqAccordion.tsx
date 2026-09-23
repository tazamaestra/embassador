"use client";

import { useState } from "react";
import type { Faq, Locale } from "@/lib/types";

// Recibe las preguntas y los títulos por props, para que lo usen tanto la
// página de suscripción como la de embajadores (dormida).
export default function FaqAccordion({
  faqs,
  locale,
  kicker,
  titulo,
}: {
  faqs: Faq[];
  locale: Locale;
  kicker: string;
  titulo: string;
}) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-20 bg-arena">
      <div className="max-w-[780px] mx-auto px-[22px]">
        <div className="text-center mb-10">
          <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">{kicker}</p>
          <h2 className="font-display font-bold text-tinta" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
            {titulo}
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            const panelId = `faq-panel-${i}`;
            const btnId = `faq-btn-${i}`;
            const question = locale === "en" ? faq.q_en : faq.q_es;
            const answer = locale === "en" ? faq.a_en : faq.a_es;

            return (
              <div key={i} className="bg-white rounded-card border border-borde overflow-hidden">
                <h3>
                  <button
                    id={btnId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left font-body font-700 text-tinta text-base hover:bg-arena/50 transition-colors"
                  >
                    {question}
                    <span
                      className={`text-vino text-xl font-mono shrink-0 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  hidden={!isOpen}
                  className="px-6 pb-5"
                >
                  <p className="font-body text-tinta-suave text-sm leading-relaxed">{answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

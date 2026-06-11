"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/nav";

export default function Footer() {
  const t = useTranslations("footer");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSubscribed(true);
  }

  const shopLinks = t.raw("shopLinks") as string[];
  const ambLinks = t.raw("ambLinks") as string[];

  return (
    <footer className="bg-footer text-[#C9A977]">
      <div className="max-w-[1240px] mx-auto px-[22px] py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <Image src="/logo-stacked.png" alt="Taza Maestra" width={32} height={38} className="h-[38px] w-auto opacity-90" />
              <div>
                <div className="font-display font-bold text-crema text-lg tracking-[.06em] leading-none">TAZA MAESTRA</div>
                <div className="font-mono text-dorado text-[8px] tracking-[.3em] mt-0.5">CAFÉ DE ESPECIALIDAD</div>
              </div>
            </div>
            <p className="font-body text-sm leading-relaxed text-[#C9A977] max-w-[220px]">{t("about")}</p>
            <div className="flex gap-3 mt-5">
              {["instagram", "facebook", "tiktok"].map((sn) => (
                <span
                  key={sn}
                  className="w-8 h-8 rounded-full border border-[#3A2418] flex items-center justify-center text-xs text-[#C9A977] opacity-50"
                  aria-hidden="true"
                >
                  {sn[0].toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          {/* Tienda */}
          <div>
            <h3 className="font-mono text-[11px] tracking-[.2em] text-crema mb-4">{t("shopTitle")}</h3>
            <ul className="space-y-2">
              {shopLinks.map((link, i) => (
                <li key={i}>
                  <Link href="/tienda" className="font-body text-sm hover:text-crema transition-colors">{link}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Embajadores */}
          <div>
            <h3 className="font-mono text-[11px] tracking-[.2em] text-crema mb-4">{t("ambTitle")}</h3>
            <ul className="space-y-2">
              {ambLinks.map((link, i) => (
                <li key={i}>
                  <Link href="/embajadores" className="font-body text-sm hover:text-crema transition-colors">{link}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-mono text-[11px] tracking-[.2em] text-crema mb-2">{t("nlTitle")}</h3>
            <p className="font-body text-sm mb-4 text-[#C9A977]">{t("nlSub")}</p>
            {subscribed ? (
              <p className="font-body text-sm font-700 text-naranja-claro" aria-live="polite">{t("nlDone")}</p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <label htmlFor="nl-email" className="sr-only">{t("nlPlaceholder")}</label>
                <input
                  id="nl-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("nlPlaceholder")}
                  className="w-full bg-[#2A1410] border border-[#3A2418] rounded-input px-3 py-2 font-body text-sm text-crema-papel placeholder:text-[#5A4636] focus-visible:outline-naranja"
                />
                <button
                  type="submit"
                  className="bg-naranja hover:bg-naranja-700 text-white font-body font-700 text-sm py-2 px-4 rounded-btn transition-all duration-150 hover:-translate-y-0.5 shadow-cta"
                >
                  {t("nlButton")}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#2A1410] py-4">
        <div className="max-w-[1240px] mx-auto px-[22px] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-mono text-[10px] tracking-[.15em] text-[#5A4636]">{t("copyright")}</span>
          <span className="font-mono text-[10px] tracking-[.1em] text-[#5A4636]">{t("madeIn")}</span>
        </div>
      </div>
    </footer>
  );
}

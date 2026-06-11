"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/nav";

export default function FloatingAI() {
  const t = useTranslations();

  return (
    <Link
      href="/embajadores"
      aria-label={t("a11y.aiAgent")}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-wa-btn text-white font-body font-700 text-sm px-4 py-3 rounded-pill shadow-wa hover:-translate-y-1 transition-transform duration-150"
    >
      🤖 <span>{t("floatingAI")}</span>
    </Link>
  );
}

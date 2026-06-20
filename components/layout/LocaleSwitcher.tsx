"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/lib/nav";

function FlagES() {
  return (
    <svg viewBox="0 0 20 14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full h-full">
      <rect width="20" height="14" fill="#AA151B" />
      <rect y="3.5" width="20" height="7" fill="#F1BF00" />
      {/* Coat of arms hint — vertical bar */}
      <rect x="7.5" y="3.5" width="1.2" height="7" fill="#AA151B" opacity=".35" />
    </svg>
  );
}

function FlagEN() {
  return (
    <svg viewBox="0 0 20 14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full h-full">
      <rect width="20" height="14" fill="#B22234" />
      {[1.08, 3.23, 5.38, 7.54, 9.69, 11.85].map((y) => (
        <rect key={y} y={y} width="20" height="1.08" fill="#fff" />
      ))}
      <rect width="8" height="7.54" fill="#3C3B6E" />
      {[1.1, 2.3, 3.5, 4.7, 5.9, 7.1].map((cy) =>
        [0.7, 1.5, 2.3, 3.1, 3.9, 4.7, 5.5, 6.3, 7.1]
          .slice(0, cy % 2.4 < 1.2 ? 6 : 5)
          .map((cx) => (
            <circle key={`${cy}-${cx}`} cx={cx} cy={cy} r="0.3" fill="#fff" />
          ))
      )}
    </svg>
  );
}

const LOCALES = [
  { code: "es" as const, Flag: FlagES, label: "ES", ariaLabel: "Cambiar a español" },
  { code: "en" as const, Flag: FlagEN, label: "EN", ariaLabel: "Switch to English" },
];

export default function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  function switchLocale(locale: "es" | "en") {
    router.replace(pathname as "/", { locale });
  }

  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label="Selector de idioma / Language selector"
    >
      {LOCALES.map(({ code, Flag, label, ariaLabel }) => {
        const isActive = currentLocale === code;
        return (
          <button
            key={code}
            onClick={() => switchLocale(code)}
            aria-label={ariaLabel}
            aria-pressed={isActive}
            title={ariaLabel}
            className={[
              "group flex items-center gap-2 px-3 py-1.5 rounded-btn border transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vino focus-visible:ring-offset-1",
              isActive
                ? "bg-white border-vino shadow-sm"
                : "border-transparent hover:bg-arena/70 hover:border-borde",
            ].join(" ")}
          >
            {/* Flag */}
            <span
              className="w-8 h-5 rounded overflow-hidden shrink-0 block"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,.3)" }}
            >
              <Flag />
            </span>

            {/* Language code */}
            <span
              className={[
                "font-mono text-[11px] font-bold tracking-[.12em] leading-none select-none",
                isActive
                  ? "text-vino"
                  : "text-tinta-suave group-hover:text-tinta",
              ].join(" ")}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

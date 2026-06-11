"use client";

import { useTranslations } from "next-intl";
import { useMode } from "@/contexts/ModeContext";
import type { Mode } from "@/lib/types";

export default function ModeToggle() {
  const t = useTranslations("mode");
  const { mode, setMode } = useMode();

  const options: { value: Mode; label: string }[] = [
    { value: "cliente", label: t("cliente") },
    { value: "embajador", label: t("embajador") },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t("ariaLabel")}
      className="flex rounded-pill bg-arena p-1 gap-1 text-sm"
    >
      {options.map(({ value, label }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            onClick={() => setMode(value)}
            className={`px-3 py-1.5 rounded-pill font-body font-700 text-xs transition-all duration-150 cursor-pointer ${
              active
                ? "bg-vino text-crema shadow-sm"
                : "text-tinta-cafe hover:bg-borde"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

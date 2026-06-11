"use client";

import { useTranslations } from "next-intl";

export default function TrustBar() {
  const t = useTranslations();
  const items = t.raw("trustBar") as string[];

  return (
    <div className="bg-vino py-3.5">
      <div className="max-w-[1240px] mx-auto px-[22px]">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
          {items.map((item, i) => (
            <span
              key={i}
              className="font-mono text-[10px] md:text-[11px] tracking-[.18em] text-crema/90 whitespace-nowrap"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

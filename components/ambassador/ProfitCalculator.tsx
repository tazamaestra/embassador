"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { calculator } from "@/lib/content";
import { formatCOP } from "@/lib/format";

export default function ProfitCalculator() {
  const t = useTranslations("ambassador");
  const { costoEmbajador, libras: libCfg, precio: priceCfg } = calculator;

  const [libras, setLibras] = useState(libCfg.default);
  const [precio, setPrecio] = useState(priceCfg.default);

  const utilLibra = Math.max(0, precio - costoEmbajador);
  const utilMes = utilLibra * libras;
  const inversion = costoEmbajador * libras;
  const margen = Math.round((utilLibra / precio) * 100);

  return (
    <section id="tm-calc" className="py-20" style={{ background: "#2A1410" }}>
      <div className="max-w-[1240px] mx-auto px-[22px]">
        <div className="text-center mb-10">
          <p className="font-mono text-[11px] tracking-[.2em] text-naranja uppercase mb-2">{t("calcKicker")}</p>
          <h2 className="font-display font-bold text-crema-papel" style={{ fontSize: "clamp(30px,4vw,46px)" }}>
            {t("calcH2")}
          </h2>
          <p className="font-body text-crema/60 text-base mt-3 max-w-[480px] mx-auto">{t("calcSub")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="bg-white/5 rounded-card-lg border border-white/10 p-8 space-y-8">
            {/* Libras slider */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label htmlFor="slider-libras" className="font-body font-600 text-crema-papel text-sm">
                  {t("calcLabelLibras")}
                </label>
                <span className="font-display font-bold text-dorado-claro text-2xl">{libras}</span>
              </div>
              <input
                id="slider-libras"
                type="range"
                min={libCfg.min}
                max={libCfg.max}
                step={libCfg.step}
                value={libras}
                onChange={(e) => setLibras(Number(e.target.value))}
                aria-valuetext={`${libras} libras`}
                className="w-full accent-naranja cursor-pointer"
              />
              <div className="flex justify-between font-mono text-[10px] text-crema/30 mt-1 tracking-[.1em]">
                <span>{libCfg.min}</span><span>{libCfg.max}</span>
              </div>
            </div>

            {/* Precio slider */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label htmlFor="slider-precio" className="font-body font-600 text-crema-papel text-sm">
                  {t("calcLabelPrecio")}
                </label>
                <span className="font-display font-bold text-dorado-claro text-2xl">{formatCOP(precio)}</span>
              </div>
              <input
                id="slider-precio"
                type="range"
                min={priceCfg.min}
                max={priceCfg.max}
                step={priceCfg.step}
                value={precio}
                onChange={(e) => setPrecio(Number(e.target.value))}
                aria-valuetext={`${formatCOP(precio)} por libra`}
                className="w-full accent-naranja cursor-pointer"
              />
              <div className="flex justify-between font-mono text-[10px] text-crema/30 mt-1 tracking-[.1em]">
                <span>{formatCOP(priceCfg.min)}</span><span>{formatCOP(priceCfg.max)}</span>
              </div>
            </div>

            <p className="font-mono text-[10px] tracking-[.1em] text-crema/30">{t("calcNote")}</p>
          </div>

          {/* Results */}
          <div aria-live="polite" aria-label="Resultados de la calculadora">
            {/* Main result */}
            <div className="bg-naranja rounded-card-lg p-8 mb-5">
              <p className="font-mono text-[10px] tracking-[.22em] text-white/70 uppercase mb-1">{t("calcResultLabel")}</p>
              <p className="font-display font-bold text-white leading-none" style={{ fontSize: "clamp(40px,6vw,64px)" }}>
                {formatCOP(utilMes)}
              </p>
            </div>

            {/* Mini-cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: t("calcUtilLibra"), value: formatCOP(utilLibra) },
                { label: t("calcMargen"), value: `${margen}%` },
                { label: t("calcInversion"), value: formatCOP(inversion) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-card p-4 text-center">
                  <div className="font-display font-bold text-dorado-claro text-xl">{value}</div>
                  <div className="font-mono text-[9px] tracking-[.15em] text-crema/40 uppercase mt-1">{label}</div>
                </div>
              ))}
            </div>

            <button className="w-full bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base py-4 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5">
              {t("calcCta")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

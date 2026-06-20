"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/lib/nav";
import { useCartStore } from "@/lib/cart-store";
import { formatCOP } from "@/lib/format";
import type { Locale } from "@/lib/types";

export default function CartDrawer() {
  const locale = useLocale() as Locale;
  const es = locale !== "en";
  const { items, open, closeCart, setQty, removeItem, clear } = useCartStore();
  const closeRef = useRef<HTMLButtonElement>(null);

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeCart(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeCart]);

  // Focus close button when opened
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-oscuro/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={es ? "Carrito de compras" : "Shopping cart"}
        inert={!open || undefined}
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-[420px] bg-fondo shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-borde shrink-0">
          <div className="flex items-center gap-2.5">
            <h2 className="font-display font-bold text-tinta text-xl">
              {es ? "Carrito" : "Cart"}
            </h2>
            {count > 0 && (
              <span className="font-mono text-[10px] tracking-[.1em] bg-arena text-tinta-suave px-2 py-0.5 rounded-pill">
                {count} lb{count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button
            ref={closeRef}
            onClick={closeCart}
            className="w-8 h-8 rounded-full flex items-center justify-center text-tinta-suave hover:bg-arena hover:text-tinta transition-colors"
            aria-label={es ? "Cerrar carrito" : "Close cart"}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <span className="text-5xl mb-4" aria-hidden="true">☕</span>
              <p className="font-display font-bold text-tinta text-lg mb-1">
                {es ? "Tu carrito está vacío" : "Your cart is empty"}
              </p>
              <p className="font-body text-tinta-suave text-sm mb-6">
                {es ? "Descubre nuestros cafés de especialidad" : "Discover our specialty coffees"}
              </p>
              <Link
                href="/tienda"
                onClick={closeCart}
                className="font-body font-semibold text-sm bg-naranja hover:bg-naranja-700 text-white px-5 py-2.5 rounded-btn transition-colors"
              >
                {es ? "Ver café →" : "Browse coffee →"}
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-borde" aria-label={es ? "Productos en el carrito" : "Cart items"}>
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 py-4">
                  {/* Swatch */}
                  <div
                    className="w-12 h-12 rounded-card shrink-0 mt-0.5"
                    style={{ background: item.swatch }}
                    aria-hidden="true"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-tinta text-base leading-tight truncate">
                      {item.name}
                    </p>
                    <p className="font-mono text-[10px] tracking-[.1em] text-tinta-suave mt-0.5">
                      {formatCOP(item.price)} / lb
                    </p>

                    {/* Qty controls */}
                    <div className="flex items-center gap-1.5 mt-2.5" role="group" aria-label={es ? `Cantidad de ${item.name}` : `${item.name} quantity`}>
                      <button
                        onClick={() => setQty(item.id, item.qty - 1)}
                        className="w-7 h-7 rounded-full border border-borde flex items-center justify-center text-tinta-suave hover:border-vino hover:text-vino transition-colors text-base font-bold leading-none"
                        aria-label={es ? "Quitar una libra" : "Remove one pound"}
                      >
                        −
                      </button>
                      <span
                        className="font-mono text-sm font-bold text-tinta w-7 text-center tabular-nums"
                        aria-live="polite"
                      >
                        {item.qty}
                      </span>
                      <button
                        onClick={() => setQty(item.id, item.qty + 1)}
                        className="w-7 h-7 rounded-full border border-borde flex items-center justify-center text-tinta-suave hover:border-vino hover:text-vino transition-colors text-base font-bold leading-none"
                        aria-label={es ? "Añadir una libra" : "Add one pound"}
                      >
                        +
                      </button>
                      <span className="font-mono text-[10px] text-tinta-suave">lb</span>
                    </div>
                  </div>

                  {/* Subtotal + remove */}
                  <div className="flex flex-col items-end justify-between shrink-0 pl-1">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-tinta-suave hover:text-vino transition-colors text-xl leading-none"
                      aria-label={es ? `Eliminar ${item.name}` : `Remove ${item.name}`}
                    >
                      ×
                    </button>
                    <p className="font-display font-bold text-vino text-base">
                      {formatCOP(item.price * item.qty)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-borde px-6 py-5 shrink-0" style={{ background: "rgba(239,227,200,.4)" }}>
            <div className="flex items-baseline justify-between mb-0.5">
              <span className="font-body text-tinta-suave text-sm">
                {es ? "Total estimado" : "Estimated total"}
              </span>
              <span className="font-display font-bold text-tinta text-2xl">
                {formatCOP(total)}
              </span>
            </div>
            <p className="font-body text-tinta-suave text-xs mb-4">
              {es ? "Envío calculado al finalizar el pedido" : "Shipping calculated at checkout"}
            </p>
            <button
              className="w-full bg-vino hover:bg-vino-900 text-crema-papel font-body font-semibold text-base py-3.5 rounded-btn transition-colors duration-150 mb-2"
            >
              {es ? "Proceder al pago →" : "Proceed to checkout →"}
            </button>
            <button
              onClick={clear}
              className="w-full font-body text-tinta-suave text-xs py-1 hover:text-vino transition-colors"
            >
              {es ? "Vaciar carrito" : "Clear cart"}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

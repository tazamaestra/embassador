"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/nav";
import ModeToggle from "./ModeToggle";
import { useCartStore } from "@/lib/cart-store";
import LocaleSwitcher from "./LocaleSwitcher";

const NAV_KEYS = ["inicio", "tienda", "embajadores", "blog"] as const;
const NAV_PATHS: Record<string, string> = {
  inicio: "/",
  tienda: "/tienda",
  embajadores: "/embajadores",
  blog: "/blog",
};

export default function Header() {
  const t = useTranslations("nav");
  const tA11y = useTranslations("a11y");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { items, openCart } = useCartStore();
  const cartCount = items.reduce((s, i) => s + i.qty, 0);

  function isActive(key: string) {
    const path = NAV_PATHS[key];
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  }

  return (
    <header
      className="sticky top-0 z-50 h-18.5 flex items-center border-b border-borde-header"
      style={{ background: "rgba(250,246,238,.92)", backdropFilter: "blur(10px)" }}
    >
      <div className="w-full max-w-310 mx-auto px-5.5 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 focus-visible:rounded-btn">
          <Image
            src="/logo-stacked.png"
            alt="Taza Maestra"
            width={38}
            height={46}
            className="h-11.5 w-auto object-contain"
          />
          <div className="leading-tight">
            <div className="font-display font-bold text-vino tracking-[.06em] text-[21px] leading-none">
              TAZA MAESTRA
            </div>
            <div className="font-mono text-dorado text-[9px] tracking-[.34em] uppercase leading-tight mt-0.5">
              CAFÉ DE ESPECIALIDAD
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal">
          {NAV_KEYS.map((key) => (
            <Link
              key={key}
              href={NAV_PATHS[key] as "/"}
              aria-current={isActive(key) ? "page" : undefined}
              className={`px-3 py-1.5 rounded-pill font-body font-600 text-sm transition-colors duration-150 ${
                isActive(key) ? "bg-arena text-vino" : "text-[#5A4636] hover:bg-arena/60"
              }`}
            >
              {t(key)}
            </Link>
          ))}
        </nav>

        {/* Cart + Locale + Mode toggle + hamburger */}
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <LocaleSwitcher />

          {/* Cart button */}
          <button
            onClick={openCart}
            className="relative p-2 rounded-btn text-vino hover:bg-arena transition-colors"
            aria-label={cartCount > 0 ? `Carrito, ${cartCount} libra${cartCount !== 1 ? "s" : ""}` : "Carrito vacío"}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {cartCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 rounded-pill bg-naranja text-white font-mono text-[10px] font-bold flex items-center justify-center px-1 leading-none"
                aria-hidden="true"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>

          <div className="hidden sm:block">
            <ModeToggle />
          </div>

          {/* Hamburger */}
          <button
            className="md:hidden p-2 rounded-btn text-vino hover:bg-arena transition-colors"
            aria-expanded={menuOpen}
            aria-label={tA11y("openMenu")}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              {menuOpen ? (
                <path d="M4 4l14 14M18 4L4 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <>
                  <line x1="3" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="3" y1="15" x2="19" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="absolute top-18.5 left-0 right-0 bg-fondo border-b border-borde shadow-md py-4 px-5.5 flex flex-col gap-3 md:hidden">
          {NAV_KEYS.map((key) => (
            <Link
              key={key}
              href={NAV_PATHS[key] as "/"}
              aria-current={isActive(key) ? "page" : undefined}
              className={`px-3 py-2 rounded-btn font-body font-600 text-sm transition-colors ${
                isActive(key) ? "bg-arena text-vino" : "text-tinta-cafe"
              }`}
              onClick={() => setMenuOpen(false)}
            >
              {t(key)}
            </Link>
          ))}
          <div className="pt-2 border-t border-borde">
            <ModeToggle />
          </div>
        </div>
      )}
    </header>
  );
}

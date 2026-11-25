import type { Metadata } from "next";
import { notFound } from "next/navigation";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/shop/CartDrawer";
import { CafesProvider } from "@/components/shared/CafesProvider";
import { obtenerCafes } from "@/lib/servidor/cafes";
import "../globals.css";

// Este es el layout raíz: `<html>` y `<body>` viven aquí, bajo [locale], y no
// en un app/layout.tsx aparte. Aquel tenía que llamar a getLocale() para poner
// el `lang`, y esa sola llamada obligaba a renderizar TODAS las páginas en cada
// visita. Con el idioma leído de la ruta, el sitio entero se genera en el build.

// Fuentes servidas desde el proyecto (app/fonts, subconjunto latin de Google
// Fonts). Con next/font/google, Turbopack las descargaba en cada compilación
// y cualquier falla de red rompía el dev con "Can't resolve
// '@vercel/turbopack-next/internal/font/google/font'".
// Cormorant y Mulish son variables: un solo archivo cubre todos los pesos.
const cormorant = localFont({
  variable: "--font-display",
  src: [{ path: "../fonts/cormorant-garamond.woff2", weight: "600 700", style: "normal" }],
  display: "swap",
});

const mulish = localFont({
  variable: "--font-body",
  src: [{ path: "../fonts/mulish.woff2", weight: "400 800", style: "normal" }],
  display: "swap",
});

const spaceMono = localFont({
  variable: "--font-mono",
  src: [
    { path: "../fonts/space-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/space-mono-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Taza Maestra · Café de especialidad",
  description:
    "Café colombiano de finca propia: Casa Roja y Chambrana, en bolsa de 340 g o cuarterón para cafeterías. Pide una muestra gratis.",
};

/** Las dos versiones del sitio se arman en el build, no en cada visita. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  // Precios, nombres y fotos editados en el panel. Cacheado: ver lib/servidor/cafes.ts.
  const cafes = await obtenerCafes();

  return (
    <html
      lang={locale}
      className={`${cormorant.variable} ${mulish.variable} ${spaceMono.variable}`}
    >
      <body className="bg-fondo text-tinta font-body antialiased">
        <NextIntlClientProvider messages={messages}>
          <CafesProvider cafes={cafes}>
            <a href="#tm-main" className="skip-link">
              {(messages as { skip?: string }).skip ?? "Saltar al contenido"}
            </a>
            <Header />
            <main id="tm-main" tabIndex={-1}>
              {children}
            </main>
            <Footer />
            <CartDrawer />
          </CafesProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cormorant_Garamond, Mulish, Space_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ModeProvider } from "@/contexts/ModeContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/shop/CartDrawer";
import "../globals.css";

// Este es el layout raíz: `<html>` y `<body>` viven aquí, bajo [locale], y no
// en un app/layout.tsx aparte. Aquel tenía que llamar a getLocale() para poner
// el `lang`, y esa sola llamada obligaba a renderizar TODAS las páginas en cada
// visita. Con el idioma leído de la ruta, el sitio entero se genera en el build.

// Solo los pesos que se usan de verdad. Cada peso extra es una descarga más
// en el camino crítico del home.
const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const mulish = Mulish({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Taza Maestra · Café de especialidad por suscripción",
  description:
    "Café de cinco fincas colombianas, por suscripción. Llega antes de que se acabe la bolsa. Pausas o cancelas en dos clics.",
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

  return (
    <html
      lang={locale}
      className={`${cormorant.variable} ${mulish.variable} ${spaceMono.variable}`}
    >
      <body className="bg-fondo text-tinta font-body antialiased">
        <NextIntlClientProvider messages={messages}>
          <ModeProvider>
            <a href="#tm-main" className="skip-link">
              {(messages as { skip?: string }).skip ?? "Saltar al contenido"}
            </a>
            <Header />
            <main id="tm-main" tabIndex={-1}>
              {children}
            </main>
            <Footer />
            <CartDrawer />
          </ModeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

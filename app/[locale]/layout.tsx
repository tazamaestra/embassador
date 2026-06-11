import type { Metadata } from "next";
import { Cormorant_Garamond, Mulish, Space_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { ModeProvider } from "@/contexts/ModeContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FloatingAI from "@/components/layout/FloatingAI";
import "../globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const mulish = Mulish({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Taza Maestra · Café de Especialidad Colombia",
  description:
    "Café de especialidad colombiano con programa de embajadores. Tueste fresco semanal, origen trazable, envío nacional.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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
            <FloatingAI />
          </ModeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

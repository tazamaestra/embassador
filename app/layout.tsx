import type { Metadata } from "next";
import { Cormorant_Garamond, Mulish, Space_Mono } from "next/font/google";
import { getLocale } from "next-intl/server";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${cormorant.variable} ${mulish.variable} ${spaceMono.variable}`}
    >
      <body className="bg-fondo text-tinta font-body antialiased">
        {children}
      </body>
    </html>
  );
}

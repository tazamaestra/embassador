import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ModeProvider } from "@/contexts/ModeContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/shop/CartDrawer";
import "../globals.css";

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
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
  );
}

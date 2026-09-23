import { setRequestLocale } from "next-intl/server";
import Hero from "@/components/home/Hero";
import TrustBar from "@/components/home/TrustBar";
import MomentQuiz from "@/components/home/MomentQuiz";
import Stories from "@/components/home/Stories";
import HowItWorks from "@/components/home/HowItWorks";
import Origins from "@/components/home/Origins";
import type { Locale } from "@/lib/types";

// Todo servidor menos MomentQuiz, que es la única isla cliente del home.
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero locale={locale} />
      <TrustBar />
      <MomentQuiz locale={locale} />
      <Stories locale={locale} />
      <HowItWorks locale={locale} />
      <Origins locale={locale} />
    </>
  );
}

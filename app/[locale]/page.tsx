import { getLocale } from "next-intl/server";
import Hero from "@/components/home/Hero";
import TrustBar from "@/components/home/TrustBar";
import MethodCarousel from "@/components/home/MethodCarousel";
import HowItWorks from "@/components/home/HowItWorks";
import Origins from "@/components/home/Origins";
import Testimonials from "@/components/home/Testimonials";
import type { Locale } from "@/lib/types";

export default async function HomePage() {
  const locale = (await getLocale()) as Locale;

  return (
    <>
      <Hero locale={locale} />
      <TrustBar />
      <MethodCarousel locale={locale} />
      <HowItWorks locale={locale} />
      <Origins locale={locale} />
      <Testimonials locale={locale} />
    </>
  );
}

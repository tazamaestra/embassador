import { setRequestLocale } from "next-intl/server";
import QuizSuscripcion from "@/components/quiz/QuizSuscripcion";
import { obtenerCatalogo } from "@/lib/catalogo";
import type { Locale } from "@/lib/types";

// Las reglas y los precios vienen de la base: se lee en cada visita para que
// un cambio en el panel de Supabase se vea de una.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "¿Qué plan te sirve? · Taza Maestra",
};

export default async function QuizPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale !== "en";
  const catalogo = await obtenerCatalogo();

  return (
    <section className="bg-fondo min-h-screen py-14">
      <div className="max-w-[1240px] mx-auto px-[22px]">
        <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2 text-center">
          {es ? "60 SEGUNDOS" : "60 SECONDS"}
        </p>
        <h1 className="font-display font-bold text-tinta text-center mb-10" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
          {es ? "Cinco preguntas y sale tu plan" : "Five questions and out comes your plan"}
        </h1>
        <QuizSuscripcion locale={locale} catalogo={catalogo} />
      </div>
    </section>
  );
}

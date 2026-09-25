import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/nav";
import { faqsSuscripcion } from "@/lib/content";
import { obtenerCatalogo } from "@/lib/catalogo";
import { formatCOP } from "@/lib/format";
import Revelar from "@/components/shared/Revelar";
import FaqAccordion from "@/components/shared/FaqAccordion";
import ComoFunciona from "@/components/suscripcion/ComoFunciona";
import Planes from "@/components/suscripcion/Planes";
import Beneficios from "@/components/suscripcion/Beneficios";
import OrigenDelMes from "@/components/suscripcion/OrigenDelMes";
import type { Locale } from "@/lib/types";

// Los precios vienen de la base: se lee en cada visita para que un cambio en
// el panel de Supabase se vea de una.
export const dynamic = "force-dynamic";

export default async function SuscripcionPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale !== "en";

  const catalogo = await obtenerCatalogo();
  const desde = Math.min(...catalogo.planes.map((p) => p.precioEnvioCop));

  return (
    <>
      {/* Hero */}
      <section
        className="py-20 md:py-28"
        style={{ background: "radial-gradient(120% 130% at 80% 0%, #7E181C, #5E0F13 55%, #4A0B0F)" }}
      >
        <div className="max-w-[1240px] mx-auto px-[22px]">
          <Revelar>
            <p className="font-mono text-[11px] tracking-[.22em] text-dorado-claro uppercase mb-4">
              {es ? "SUSCRIPCIÓN · CAFÉ DE FINCA PROPIA" : "SUBSCRIPTION · OUR OWN FARM"}
            </p>
            <h1
              className="font-display font-bold text-crema-papel leading-[1.02] mb-5 max-w-[760px]"
              style={{ fontSize: "clamp(36px,5.5vw,64px)" }}
            >
              {es ? "Café fresco en la casa, " : "Fresh coffee at home, "}
              <em className="text-naranja-claro not-italic">
                {es ? "sin volver a pedirlo" : "without reordering"}
              </em>
            </h1>
            <p className="font-body text-crema/75 text-base md:text-lg leading-relaxed mb-8 max-w-[520px]">
              {es
                ? `Desde ${formatCOP(desde)} por envío, con el envío incluido. Cada semana, cada 15 días o cada mes. Saltas o pausas con un clic.`
                : `From ${formatCOP(desde)} per shipment, shipping included. Weekly, every 2 weeks or monthly. Skip or pause with one click.`}
            </p>
          </Revelar>

          <Revelar retrasoMs={90}>
            <div className="flex flex-wrap gap-3">
              <a
                href="#quiz"
                className="bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
              >
                {es ? "Encontrar mi plan" : "Find my plan"}
              </a>
              <a
                href="#planes"
                className="border border-crema/50 text-crema hover:bg-white/10 font-body font-700 text-base px-6 py-3 rounded-btn transition-all duration-150"
              >
                {es ? "Ver los planes" : "See the plans"}
              </a>
            </div>
          </Revelar>
        </div>
      </section>

      <ComoFunciona locale={locale} reglas={catalogo.reglas} />

      {/* Quiz */}
      <section id="quiz" className="py-20 bg-fondo scroll-mt-20">
        <div className="max-w-[720px] mx-auto px-[22px] text-center">
          <Revelar>
            <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">
              {es ? "60 SEGUNDOS" : "60 SECONDS"}
            </p>
            <h2 className="font-display font-bold text-tinta mb-3" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
              {es ? "¿No sabes cuál te sirve?" : "Not sure which one fits?"}
            </h2>
            <p className="font-body text-tinta-suave text-base mb-8">
              {es
                ? "Cinco preguntas —cómo lo preparas, si le echas leche, qué sabor buscas, cuántas tazas y cuántos en la casa— y sale el plan, la frecuencia y la molienda."
                : "Five questions —how you brew, milk or not, which flavor, how many cups and how many people— and out come the plan, frequency and grind."}
            </p>
            <Link
              href="/quiz"
              className="inline-block bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-8 py-3.5 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
            >
              {es ? "Hacer el quiz" : "Take the quiz"}
            </Link>
          </Revelar>
        </div>
      </section>

      <Planes locale={locale} catalogo={catalogo} />
      <Beneficios locale={locale} />
      <OrigenDelMes locale={locale} />

      <FaqAccordion
        faqs={faqsSuscripcion}
        locale={locale}
        kicker={es ? "PREGUNTAS" : "QUESTIONS"}
        titulo={es ? "Lo que suelen preguntar" : "What people usually ask"}
      />

      {/* CTA final */}
      <section className="py-20" style={{ background: "linear-gradient(150deg,#7E181C,#4A0B0F)" }}>
        <div className="max-w-[720px] mx-auto px-[22px] text-center">
          <Revelar>
            <h2
              className="font-display font-bold text-crema-papel mb-4"
              style={{ fontSize: "clamp(28px,4vw,46px)" }}
            >
              {es ? "Empieza este mes" : "Start this month"}
            </h2>
            <p className="font-body text-crema/75 text-base mb-8">
              {es
                ? "Sin permanencia. Pausas, saltas o cancelas desde tu cuenta."
                : "No commitment. Pause, skip or cancel from your account."}
            </p>
            <Link
              href="/checkout"
              className="inline-block bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-8 py-3.5 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
            >
              {es ? "Armar mi suscripción" : "Set up my subscription"}
            </Link>
          </Revelar>
        </div>
      </section>
    </>
  );
}

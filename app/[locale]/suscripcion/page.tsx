import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/nav";
import { faqsSuscripcion, niveles, suscripcionConfig } from "@/lib/content";
import { mejorAhorroSuelta } from "@/lib/suscripcion";
import { formatCOP } from "@/lib/format";
import Revelar from "@/components/shared/Revelar";
import FaqAccordion from "@/components/shared/FaqAccordion";
import ComoFunciona from "@/components/suscripcion/ComoFunciona";
import Calculadora from "@/components/suscripcion/Calculadora";
import Planes from "@/components/suscripcion/Planes";
import Comparativa from "@/components/suscripcion/Comparativa";
import Beneficios from "@/components/suscripcion/Beneficios";
import OrigenDelMes from "@/components/suscripcion/OrigenDelMes";
import type { Locale } from "@/lib/types";

export default async function SuscripcionPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale !== "en";

  const ahorro = mejorAhorroSuelta(suscripcionConfig);
  const desde = Math.min(...niveles.map((n) => n.precioCop));

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
                ? `Desde ${formatCOP(desde)} al mes con envío incluido. Se tuesta la semana del despacho. Saltas o cancelas en dos clics.`
                : `From ${formatCOP(desde)} a month, shipping included. Roasted the week it ships. Skip or cancel in two clicks.`}
            </p>
          </Revelar>

          <Revelar retrasoMs={90}>
            <div className="flex flex-wrap gap-3">
              <a
                href="#calculadora"
                className="bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
              >
                {es ? "Calcular mi plan" : "Work out my plan"}
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

      <ComoFunciona locale={locale} />

      {/* Calculadora */}
      <section id="calculadora" className="py-20 bg-fondo scroll-mt-20">
        <div className="max-w-[1240px] mx-auto px-[22px]">
          <Revelar>
            <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">
              {es ? "LA CALCULADORA" : "THE CALCULATOR"}
            </p>
            <h2
              className="font-display font-bold text-tinta mb-3"
              style={{ fontSize: "clamp(28px,4vw,44px)" }}
            >
              {es ? "¿Cuánto café gastas?" : "How much coffee do you use?"}
            </h2>
            <p className="font-body text-tinta-suave text-base max-w-[560px] mb-10">
              {es
                ? "Dos preguntas y sale el plan que te sirve. Si te queda corto o largo, lo cambias después."
                : "Two questions and out comes the plan that fits. If it's short or long, change it later."}
            </p>
          </Revelar>

          <Revelar retrasoMs={80}>
            <Calculadora locale={locale} />
          </Revelar>
        </div>
      </section>

      <Planes locale={locale} />
      <Comparativa locale={locale} />
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
                ? `Ahorras hasta ${formatCOP(ahorro.ahorro)} por envío frente a comprarlo suelto. Sin permanencia.`
                : `Save up to ${formatCOP(ahorro.ahorro)} per shipment versus buying loose. No commitment.`}
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

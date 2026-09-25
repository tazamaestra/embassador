import { Link } from "@/lib/nav";
import { costoMensual } from "@/lib/suscripcion";
import { formatCOP } from "@/lib/format";
import Revelar from "@/components/shared/Revelar";
import type { Catalogo, Locale } from "@/lib/types";

// Los planes salen de la base. El segundo pesa más —fondo vino, más aire—:
// tarjetas calcadas no ayudan a elegir.
export default function Planes({ locale, catalogo }: { locale: Locale; catalogo: Catalogo }) {
  const es = locale !== "en";
  const { planes, frecuencias, reglas } = catalogo;
  const columnas = planes.length >= 3 ? "md:grid-cols-3" : planes.length === 2 ? "md:grid-cols-2 max-w-[880px]" : "max-w-[440px]";

  return (
    <section id="planes" className="py-20 bg-fondo scroll-mt-20">
      <div className="max-w-[1240px] mx-auto px-[22px]">
        <Revelar>
          <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">
            {es ? "LOS PLANES" : "THE PLANS"}
          </p>
          <h2 className="font-display font-bold text-tinta mb-3" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
            {es ? "Bolsas de la finca. El envío va incluido." : "Bags from the farm. Shipping included."}
          </h2>
          <p className="font-body text-tinta-suave text-base max-w-[560px] mb-10">
            {es
              ? "Pagas por envío. Eliges si llega cada semana, cada 15 días o cada mes, y lo cambias desde tu cuenta."
              : "You pay per shipment. Choose weekly, every 2 weeks or monthly, and change it from your account."}
          </p>
        </Revelar>

        <div className={`grid grid-cols-1 ${columnas} gap-5 items-start mx-auto`}>
          {planes.map((plan, i) => {
            const destacado = planes.length > 1 && i === 1;
            const sugerida = frecuencias.find((f) => f.id === plan.frecuenciaDefectoId) ?? frecuencias[0];
            const incluye = es ? plan.incluye_es : plan.incluye_en;

            return (
              <Revelar key={plan.id} retrasoMs={i * 70}>
                <div
                  className={[
                    "rounded-card-lg border h-full flex flex-col transition-all duration-200",
                    "hover:-translate-y-1 hover:shadow-card-hover",
                    destacado ? "border-vino p-8 md:-mt-4 md:pb-10" : "border-borde bg-white p-7",
                  ].join(" ")}
                  style={destacado ? { background: "linear-gradient(150deg,#7E181C,#4A0B0F)" } : undefined}
                >
                  <h3 className={`font-display font-bold mb-1 ${destacado ? "text-crema-papel text-3xl" : "text-tinta text-2xl"}`}>
                    {es ? plan.label_es : plan.label_en}
                  </h3>
                  <p className={`font-body text-sm mb-6 ${destacado ? "text-crema/70" : "text-tinta-suave"}`}>
                    {es ? plan.desc_es : plan.desc_en}
                  </p>

                  <p className={`font-display font-bold leading-none mb-1 ${destacado ? "text-crema-papel text-5xl" : "text-vino text-4xl"}`}>
                    {formatCOP(plan.precioEnvioCop)}
                  </p>
                  <p className={`font-mono text-[11px] mb-6 ${destacado ? "text-crema/60" : "text-tinta-suave"}`}>
                    {es ? "por envío · envío incluido" : "per shipment · shipping included"}
                  </p>

                  <ul className="space-y-2 mb-6 flex-1">
                    {incluye.map((linea) => (
                      <li key={linea} className={`font-body text-sm flex gap-2 ${destacado ? "text-crema/85" : "text-tinta"}`}>
                        <span aria-hidden="true" className={destacado ? "text-dorado-claro" : "text-verde"}>·</span>
                        {linea}
                      </li>
                    ))}
                  </ul>

                  {sugerida && (
                    <p className={`font-mono text-[11px] mb-5 ${destacado ? "text-dorado-claro" : "text-verde"}`}>
                      {es
                        ? `${sugerida.label_es}: ≈ ${formatCOP(costoMensual(plan, sugerida, reglas))} al mes`
                        : `${sugerida.label_en}: ≈ ${formatCOP(costoMensual(plan, sugerida, reglas))} a month`}
                    </p>
                  )}

                  <Link
                    href={{ pathname: "/checkout", query: { plan: plan.id } }}
                    className={[
                      "block text-center font-body font-800 text-base px-6 py-3 rounded-btn",
                      "transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0",
                      destacado
                        ? "bg-naranja hover:bg-naranja-700 text-white shadow-cta"
                        : "border border-borde-2 text-tinta-cafe hover:border-vino hover:text-vino",
                    ].join(" ")}
                  >
                    {es ? "Elegir este plan" : "Choose this plan"}
                  </Link>
                </div>
              </Revelar>
            );
          })}
        </div>

        {catalogo.prepagos.some((p) => p.descuentoPct > 0) && (
          <p className="font-body text-tinta-suave text-sm mt-8 text-center">
            {es ? "Si prepagas, baja: " : "Prepay and it drops: "}
            {catalogo.prepagos
              .filter((p) => p.descuentoPct > 0)
              .map((p) => (es ? `${p.label_es} con ${p.descuentoPct}% menos` : `${p.label_en} at ${p.descuentoPct}% off`))
              .join(es ? " · " : " · ")}
            .
          </p>
        )}
      </div>
    </section>
  );
}

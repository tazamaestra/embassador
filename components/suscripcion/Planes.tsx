import { Link } from "@/lib/nav";
import { niveles, suscripcionConfig } from "@/lib/content";
import { compararConSuelta } from "@/lib/suscripcion";
import { formatCOP } from "@/lib/format";
import Revelar from "@/components/shared/Revelar";
import type { Locale } from "@/lib/types";

// El del medio es el que más piden, así que pesa más: fondo vino, más aire y
// la etiqueta encima. Los otros dos quedan en blanco, más discretos. Tres
// tarjetas calcadas no ayudarían a elegir.
const DESTACADO = "2-libras";

export default function Planes({ locale }: { locale: Locale }) {
  const es = locale !== "en";

  return (
    <section id="planes" className="py-20 bg-fondo scroll-mt-20">
      <div className="max-w-[1240px] mx-auto px-[22px]">
        <Revelar>
          <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">
            {es ? "LOS PLANES" : "THE PLANS"}
          </p>
          <h2
            className="font-display font-bold text-tinta mb-3"
            style={{ fontSize: "clamp(28px,4vw,44px)" }}
          >
            {es ? "Tres tamaños. El envío va incluido." : "Three sizes. Shipping included."}
          </h2>
          <p className="font-body text-tinta-suave text-base max-w-[560px] mb-10">
            {es
              ? "El precio es mensual y no cambia. Cambias de plan o cancelas desde tu cuenta."
              : "The price is monthly and doesn't change. Switch plans or cancel from your account."}
          </p>
        </Revelar>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {niveles.map((nivel, i) => {
            const destacado = nivel.id === DESTACADO;
            const ahorro = compararConSuelta(nivel, suscripcionConfig);
            const incluye = es ? nivel.incluye_es : nivel.incluye_en;

            return (
              <Revelar key={nivel.id} retrasoMs={i * 70}>
                <div
                  className={[
                    "rounded-card-lg border h-full flex flex-col transition-all duration-200",
                    "hover:-translate-y-1 hover:shadow-card-hover",
                    destacado
                      ? "border-vino p-8 md:-mt-4 md:pb-10"
                      : "border-borde bg-white p-7",
                  ].join(" ")}
                  style={
                    destacado
                      ? { background: "linear-gradient(150deg,#7E181C,#4A0B0F)" }
                      : undefined
                  }
                >
                  {destacado && (
                    <p className="font-mono text-[10px] tracking-[.2em] text-dorado-claro uppercase mb-3">
                      {es ? "La que más piden" : "Most chosen"}
                    </p>
                  )}

                  <h3
                    className={`font-display font-bold mb-1 ${
                      destacado ? "text-crema-papel text-3xl" : "text-tinta text-2xl"
                    }`}
                  >
                    {es ? nivel.label_es : nivel.label_en}
                  </h3>
                  <p
                    className={`font-body text-sm mb-6 ${
                      destacado ? "text-crema/70" : "text-tinta-suave"
                    }`}
                  >
                    {es ? nivel.nota_es : nivel.nota_en}
                  </p>

                  <p
                    className={`font-display font-bold leading-none mb-1 ${
                      destacado ? "text-crema-papel text-5xl" : "text-vino text-4xl"
                    }`}
                  >
                    {formatCOP(nivel.precioCop)}
                  </p>
                  <p
                    className={`font-mono text-[11px] mb-6 ${
                      destacado ? "text-crema/60" : "text-tinta-suave"
                    }`}
                  >
                    {es ? "al mes · envío incluido" : "a month · shipping included"}
                  </p>

                  <ul className="space-y-2 mb-6 flex-1">
                    {incluye.map((linea) => (
                      <li
                        key={linea}
                        className={`font-body text-sm flex gap-2 ${
                          destacado ? "text-crema/85" : "text-tinta"
                        }`}
                      >
                        <span aria-hidden="true" className={destacado ? "text-dorado-claro" : "text-verde"}>
                          ·
                        </span>
                        {linea}
                      </li>
                    ))}
                  </ul>

                  <p
                    className={`font-mono text-[11px] mb-5 ${
                      destacado ? "text-dorado-claro" : "text-verde"
                    }`}
                  >
                    {es
                      ? `Ahorras ${formatCOP(ahorro.ahorro)} frente a comprarlo suelto`
                      : `You save ${formatCOP(ahorro.ahorro)} versus buying it loose`}
                  </p>

                  <Link
                    href={{ pathname: "/checkout", query: { nivel: nivel.id } }}
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
      </div>
    </section>
  );
}

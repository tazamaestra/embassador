import { niveles, suscripcionConfig } from "@/lib/content";
import { compararConSuelta } from "@/lib/suscripcion";
import { formatCOP } from "@/lib/format";
import Revelar from "@/components/shared/Revelar";
import type { Locale } from "@/lib/types";

// Una tabla, no dos columnas de adjetivos. La diferencia es un número al mes
// y se lee de un vistazo.
export default function Comparativa({ locale }: { locale: Locale }) {
  const es = locale !== "en";
  const { precioLibraCop, envioCop } = suscripcionConfig.suelta;

  return (
    <section className="py-20 bg-arena">
      <div className="max-w-[900px] mx-auto px-[22px]">
        <Revelar>
          <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">
            {es ? "LAS CUENTAS" : "THE MATH"}
          </p>
          <h2
            className="font-display font-bold text-tinta mb-3"
            style={{ fontSize: "clamp(28px,4vw,44px)" }}
          >
            {es ? "Suscrito o suelto" : "Subscribed or loose"}
          </h2>
          <p className="font-body text-tinta-suave text-base mb-8">
            {es
              ? `Suelto, la libra cuesta ${formatCOP(precioLibraCop)} y el envío ${formatCOP(envioCop)}. Suscrito, el envío no se cobra.`
              : `Loose, a pound is ${formatCOP(precioLibraCop)} plus ${formatCOP(envioCop)} shipping. Subscribed, shipping is free.`}
          </p>
        </Revelar>

        <Revelar retrasoMs={80}>
          <div className="rounded-card-lg border border-borde bg-white overflow-hidden">
            <table className="w-full border-collapse">
              <caption className="sr-only">
                {es
                  ? "Comparación del precio mensual entre comprar suelto y estar suscrito"
                  : "Monthly price comparison between buying loose and subscribing"}
              </caption>
              <thead>
                <tr className="border-b border-borde">
                  <th scope="col" className="text-left font-mono text-[10px] tracking-[.18em] text-tinta-suave uppercase px-5 py-4">
                    {es ? "Plan" : "Plan"}
                  </th>
                  <th scope="col" className="text-right font-mono text-[10px] tracking-[.18em] text-tinta-suave uppercase px-5 py-4">
                    {es ? "Suelto" : "Loose"}
                  </th>
                  <th scope="col" className="text-right font-mono text-[10px] tracking-[.18em] text-tinta-suave uppercase px-5 py-4">
                    {es ? "Suscrito" : "Subscribed"}
                  </th>
                  <th scope="col" className="text-right font-mono text-[10px] tracking-[.18em] text-verde uppercase px-5 py-4">
                    {es ? "Ahorras" : "You save"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {niveles.map((nivel) => {
                  const c = compararConSuelta(nivel, suscripcionConfig);
                  return (
                    <tr key={nivel.id} className="border-b border-borde last:border-0">
                      <th scope="row" className="text-left px-5 py-4">
                        <span className="font-display font-bold text-tinta text-lg">
                          {es ? nivel.label_es : nivel.label_en}
                        </span>
                      </th>
                      <td className="text-right px-5 py-4 font-body text-tinta-suave text-sm line-through">
                        {formatCOP(c.suelta)}
                      </td>
                      <td className="text-right px-5 py-4 font-display font-bold text-tinta text-lg">
                        {formatCOP(c.suscrito)}
                      </td>
                      <td className="text-right px-5 py-4">
                        <span className="font-display font-bold text-verde text-lg">
                          {formatCOP(c.ahorro)}
                        </span>
                        <span className="font-mono text-[10px] text-verde/80 block leading-tight">
                          −{c.ahorroPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="font-body text-tinta-suave text-sm mt-4">
            {es
              ? "El ahorro es por envío. Si prepagas 3 o 6 meses, baja más."
              : "That saving is per shipment. Prepaying 3 or 6 months lowers it further."}
          </p>
        </Revelar>
      </div>
    </section>
  );
}

import { club } from "@/lib/content";
import { cuentaAnual } from "@/lib/club";
import Revelar from "@/components/shared/Revelar";
import type { Catalogo, Locale } from "@/lib/types";

// Por qué quedarse vale más que comprar cuando uno se acuerda: niveles que
// suben con los envíos seguidos, puntos que se cambian por premios y la cuenta
// de un año con el plan del medio. Las bolsas de regalo y el prepago salen de
// las reglas en Supabase; niveles y premios, de data/suscripcion.json.
export default function Constancia({ locale, catalogo }: { locale: Locale; catalogo: Catalogo }) {
  const es = locale !== "en";
  const { planes, frecuencias, reglas, prepagos } = catalogo;
  const niveles = [...club.niveles].sort((a, b) => a.desdeEnvio - b.desdeEnvio);
  const num = (n: number) => n.toLocaleString(es ? "es-CO" : "en-US");

  // El mismo plan que Planes destaca, con su frecuencia sugerida.
  const plan = planes[planes.length > 1 ? 1 : 0];
  const frecuencia = plan && (frecuencias.find((f) => f.id === plan.frecuenciaDefectoId) ?? frecuencias[0]);
  const anual = plan && frecuencia ? cuentaAnual(plan, frecuencia.dias, reglas, niveles) : null;
  // Una canasta que cabe de verdad en los puntos del año, del premio grande al chico.
  const alcanzables = [];
  let saldo = anual?.puntos ?? 0;
  for (const p of [...club.premios].sort((a, b) => b.puntos - a.puntos)) {
    if (p.puntos <= saldo) {
      alcanzables.push(p);
      saldo -= p.puntos;
    }
  }

  const maxPrepago = Math.max(0, ...prepagos.map((p) => p.descuentoPct));
  const { cadaEnvios, bolsas: bolsasRegalo } = reglas.regalo;

  const comparacion: { k: string; suelto: string; suscrito: string }[] = es
    ? [
        { k: "Precio", suelto: "El de la tienda", suscrito: "Precio de suscriptor" },
        { k: "Envío", suelto: "Se cobra aparte", suscrito: "Incluido" },
        { k: "Cuándo llega", suelto: "Cuando te acuerdas de pedir", suscrito: "Antes de que se acabe la bolsa" },
        { k: "Puntos", suelto: "No suma", suscrito: "Cada envío suma, y más entre más tiempo llevas" },
        ...(cadaEnvios > 0
          ? [{ k: "Café de regalo", suelto: "—", suscrito: `${bolsasRegalo === 1 ? "Una bolsa" : `${bolsasRegalo} bolsas`} cada ${cadaEnvios} envíos seguidos` }]
          : []),
        { k: "Microlotes", suelto: "Si quedan", suscrito: "Primero para ti" },
        ...(maxPrepago > 0 ? [{ k: "Prepago", suelto: "—", suscrito: `Hasta ${maxPrepago}% menos` }] : []),
      ]
    : [
        { k: "Price", suelto: "Shop price", suscrito: "Subscriber price" },
        { k: "Shipping", suelto: "Charged separately", suscrito: "Included" },
        { k: "When it arrives", suelto: "Whenever you remember to order", suscrito: "Before the bag runs out" },
        { k: "Points", suelto: "None", suscrito: "Every shipment earns, and more the longer you stay" },
        ...(cadaEnvios > 0
          ? [{ k: "Free coffee", suelto: "—", suscrito: `${bolsasRegalo === 1 ? "One bag" : `${bolsasRegalo} bags`} every ${cadaEnvios} shipments in a row` }]
          : []),
        { k: "Microlots", suelto: "If any are left", suscrito: "Yours first" },
        ...(maxPrepago > 0 ? [{ k: "Prepay", suelto: "—", suscrito: `Up to ${maxPrepago}% off` }] : []),
      ];

  return (
    <section
      id="club"
      className="py-20 md:py-24 scroll-mt-20"
      style={{ background: "linear-gradient(150deg,#7E181C,#4A0B0F)" }}
    >
      <div className="max-w-[1240px] mx-auto px-[22px]">
        <Revelar>
          <p className="font-mono text-[11px] tracking-[.2em] text-dorado-claro uppercase mb-2">
            {es ? "EL CLUB · LA CONSTANCIA SE PAGA" : "THE CLUB · STAYING PAYS OFF"}
          </p>
          <h2
            className="font-display font-bold text-crema-papel mb-4 max-w-[900px]"
            style={{ fontSize: "clamp(30px,4.4vw,50px)" }}
          >
            {es ? "Cada envío suma. " : "Every shipment counts. "}
            <em className="text-naranja-claro not-italic">{es ? "Quedarte, suma más." : "Staying counts more."}</em>
          </h2>
          <p className="font-body text-crema/75 text-base md:text-lg leading-relaxed max-w-[600px] mb-12">
            {es
              ? "Comprar una bolsa cuando te acuerdas no te deja nada. Suscrito, cada envío te da puntos, y entre más envíos seguidos llevas, más vale cada uno. Los cambias por bonos, café y premios."
              : "Buying a bag when you remember leaves you nothing. Subscribed, every shipment earns points, and the longer your streak, the more each one is worth. Trade them for credit, coffee and rewards."}
          </p>
        </Revelar>

        {/* Niveles */}
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
          {niveles.map((n, i) => {
            const siguiente = niveles[i + 1];
            const rango = siguiente
              ? es ? `Envíos ${n.desdeEnvio} a ${siguiente.desdeEnvio - 1}` : `Shipments ${n.desdeEnvio} to ${siguiente.desdeEnvio - 1}`
              : es ? `Desde el envío ${n.desdeEnvio}` : `From shipment ${n.desdeEnvio}`;
            return (
              <Revelar as="li" key={n.id} retrasoMs={i * 80}>
                <div
                  className="h-full rounded-card border border-white/12 p-6 relative overflow-hidden"
                  style={{ background: `rgba(255,255,255,${0.04 + i * 0.04})` }}
                >
                  <div className="flex items-center gap-1.5 mb-5" aria-hidden="true">
                    {niveles.map((_, j) => (
                      <span
                        key={j}
                        className={`h-1.5 flex-1 rounded-pill ${j <= i ? "bg-dorado-claro" : "bg-white/15"}`}
                      />
                    ))}
                  </div>
                  <p className="font-mono text-[10px] tracking-[.15em] text-crema/55 uppercase mb-1">{rango}</p>
                  <h3 className="font-display font-bold text-crema-papel text-3xl mb-3">
                    {es ? n.label_es : n.label_en}
                  </h3>
                  <p className="font-display font-bold text-dorado-claro text-4xl leading-none">
                    {num(n.puntosEnvio)}
                    <span className="font-mono text-[11px] text-crema/60 ml-2 tracking-normal">
                      {es ? "puntos por envío" : "points per shipment"}
                    </span>
                  </p>
                  <p className="font-body text-crema/75 text-sm mt-3 leading-relaxed">{es ? n.desc_es : n.desc_en}</p>
                </div>
              </Revelar>
            );
          })}
        </ol>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 mb-14">
          {/* Premios */}
          <Revelar>
            <div className="h-full rounded-card border border-white/12 p-7" style={{ background: "rgba(255,255,255,.05)" }}>
              <h3 className="font-display font-bold text-crema-papel text-2xl mb-5">
                {es ? "En qué se convierten tus puntos" : "What your points turn into"}
              </h3>
              <ul className="divide-y divide-white/10">
                {club.premios.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-4 py-3">
                    <span className="font-body text-crema/90 text-sm md:text-base">{es ? p.label_es : p.label_en}</span>
                    <span className="font-mono text-xs text-dorado-claro whitespace-nowrap">
                      {num(p.puntos)} {es ? "pts" : "pts"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Revelar>

          {/* Un año suscrito */}
          {anual && plan && frecuencia && (
            <Revelar retrasoMs={90}>
              <div className="h-full rounded-card-lg p-7 bg-crema-papel">
                <p className="font-mono text-[11px] tracking-[.18em] text-dorado uppercase mb-2">
                  {es ? "TU PRIMER AÑO" : "YOUR FIRST YEAR"}
                </p>
                <h3 className="font-display font-bold text-tinta text-2xl mb-6">
                  {es
                    ? `Con ${plan.label_es}, ${frecuencia.label_es.toLowerCase()}`
                    : `With ${plan.label_en}, ${frecuencia.label_en.toLowerCase()}`}
                </h3>
                <dl className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { v: num(anual.bolsas), k: es ? "bolsas en casa" : "bags at home" },
                    { v: `+${num(anual.bolsasRegalo)}`, k: es ? "de regalo" : "free" },
                    { v: num(anual.puntos), k: es ? "puntos" : "points" },
                  ].map((d) => (
                    <div key={d.k}>
                      <dd className="font-display font-bold text-vino text-4xl leading-none">{d.v}</dd>
                      <dt className="font-mono text-[10px] tracking-[.12em] text-tinta-suave uppercase mt-1">{d.k}</dt>
                    </div>
                  ))}
                </dl>
                <p className="font-body text-tinta text-sm leading-relaxed">
                  {es
                    ? `Terminas el año en nivel ${anual.nivel.label_es}.`
                    : `You finish the year at ${anual.nivel.label_en} level.`}{" "}
                  {alcanzables.length > 0 &&
                    (es
                      ? `Te alcanza, por ejemplo, para ${alcanzables.map((p) => p.label_es.toLowerCase()).join(" + ")}.`
                      : `Enough for, say, ${alcanzables.map((p) => p.label_en.toLowerCase()).join(" + ")}.`)}
                </p>
                <p className="font-body text-tinta-suave text-xs mt-4">
                  {es
                    ? "Si cancelas, la racha vuelve a empezar. Pausar no la rompe."
                    : "If you cancel, the streak starts over. Pausing doesn't break it."}
                </p>
              </div>
            </Revelar>
          )}
        </div>

        {/* Comprar suelto vs suscrito */}
        <Revelar>
          <h3 className="font-display font-bold text-crema-papel text-2xl md:text-3xl mb-5">
            {es ? "Comprar cada mes vs. estar suscrito" : "Buying each month vs. subscribing"}
          </h3>
          <div className="rounded-card overflow-hidden border border-white/12">
            <div className="grid grid-cols-[1fr_1fr_1.3fr] font-mono text-[10px] md:text-[11px] tracking-[.12em] uppercase">
              <span className="p-3 md:p-4 text-crema/50" />
              <span className="p-3 md:p-4 text-crema/60">{es ? "Compra suelta" : "One-off"}</span>
              <span className="p-3 md:p-4 text-vino-900 bg-dorado-claro">{es ? "Suscrito" : "Subscribed"}</span>
            </div>
            {comparacion.map((fila) => (
              <div
                key={fila.k}
                className="grid grid-cols-[1fr_1fr_1.3fr] border-t border-white/10 font-body text-sm"
              >
                <span className="p-3 md:p-4 text-crema/60 font-700">{fila.k}</span>
                <span className="p-3 md:p-4 text-crema/55">{fila.suelto}</span>
                <span className="p-3 md:p-4 text-crema-papel bg-white/6">{fila.suscrito}</span>
              </div>
            ))}
          </div>
        </Revelar>
      </div>
    </section>
  );
}

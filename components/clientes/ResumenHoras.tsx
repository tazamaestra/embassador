import { CUARTERONES_MES_REGALO, CUARTERONES_POR_HORA } from "@/lib/capacitacion";
import { formatCOP, formatFecha } from "@/lib/format";
import type { Capacitacion, CompraInventario, HorasCapacitacion, ResumenCliente } from "@/lib/types";

// Piezas que comparten la cuenta del cliente y su ficha en el panel: las
// horas de capacitación, sus compras del inventario y las sesiones dadas.

const horasTxt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

/** "2026-09" → "septiembre de 2026" / "September 2026". */
function nombreMes(mes: string, es: boolean): string {
  const d = new Date(`${mes}-01T00:00:00Z`);
  return d.toLocaleDateString(es ? "es-CO" : "en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function Barra({ valor, max, colores, nombre }: { valor: number; max: number; colores: string; nombre: string }) {
  return (
    <div className="h-2 rounded-pill bg-arena overflow-hidden" role="progressbar" aria-label={nombre} aria-valuemin={0} aria-valuemax={max} aria-valuenow={valor}>
      <div className={`h-full rounded-pill bg-linear-to-r ${colores} transition-[width] duration-700`} style={{ width: `${(valor / max) * 100}%` }} />
    </div>
  );
}

export function TarjetasHoras({ horas, es }: { horas: HorasCapacitacion; es: boolean }) {
  const tarjetas: { valor: string; etiqueta: string; detalle?: string; destacada?: boolean }[] = [
    { valor: String(horas.cuarterones), etiqueta: es ? "Cuarterones comprados" : "Large bags bought" },
    {
      valor: horasTxt(horas.ganadas),
      etiqueta: es ? "Horas ganadas" : "Hours earned",
      detalle:
        horas.regalo > 0
          ? es ? `${horas.base} por compras + ${horas.regalo} de regalo` : `${horas.base} from purchases + ${horas.regalo} bonus`
          : undefined,
    },
    { valor: horasTxt(horas.usadas), etiqueta: es ? "Horas usadas" : "Hours used" },
    { valor: horasTxt(horas.disponibles), etiqueta: es ? "Horas disponibles" : "Hours available", destacada: true },
  ];

  const enHora = CUARTERONES_POR_HORA - horas.faltanParaSiguiente;
  const { mesActual } = horas;
  const regaloEsteMes = Math.floor(mesActual.cuarterones / CUARTERONES_MES_REGALO);
  const enMes = mesActual.cuarterones % CUARTERONES_MES_REGALO;
  // Justo al completar 8 (o 16…), la barra se ve llena en vez de volver a cero.
  const recienGanada = regaloEsteMes > 0 && enMes === 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tarjetas.map((t) => (
          <div
            key={t.etiqueta}
            className={`rounded-card border p-4 ${t.destacada ? "bg-vino border-vino text-crema-papel" : "bg-white border-borde text-tinta"}`}
          >
            <p className="font-display font-bold text-3xl md:text-4xl leading-none tabular-nums">{t.valor}</p>
            <p className={`font-mono text-[10px] tracking-[.14em] uppercase mt-2 ${t.destacada ? "text-crema/75" : "text-tinta-suave"}`}>
              {t.etiqueta}
            </p>
            {t.detalle && <p className="font-body text-xs text-verde mt-1">{t.detalle}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Próxima hora: cada 3 cuarterones */}
        <div className="rounded-card bg-white border border-borde p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="font-body text-sm text-tinta">
              {es
                ? `Te ${horas.faltanParaSiguiente === 1 ? "falta 1 cuarterón" : `faltan ${horas.faltanParaSiguiente} cuarterones`} para tu próxima hora.`
                : `${horas.faltanParaSiguiente} more large bag${horas.faltanParaSiguiente === 1 ? "" : "s"} to your next hour.`}
            </p>
            <p className="font-mono text-[10px] tracking-[.12em] text-tinta-suave uppercase whitespace-nowrap">
              {es ? `${CUARTERONES_POR_HORA} = 1 hora` : `${CUARTERONES_POR_HORA} = 1 hour`}
            </p>
          </div>
          <Barra valor={enHora} max={CUARTERONES_POR_HORA} colores="from-vino to-naranja" nombre={es ? "Avance hacia la próxima hora" : "Progress to next hour"} />
        </div>

        {/* Hora de regalo: 8 cuarterones en el mismo mes */}
        <div className="rounded-card bg-verde-claro/60 border border-verde/30 p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="font-body text-sm text-tinta">
              {recienGanada
                ? es
                  ? `¡Este mes ya ganaste ${regaloEsteMes === 1 ? "tu hora" : `${regaloEsteMes} horas`} de regalo!`
                  : `You've earned ${regaloEsteMes} bonus hour${regaloEsteMes === 1 ? "" : "s"} this month!`
                : es
                  ? `Este mes llevas ${mesActual.cuarterones} ${mesActual.cuarterones === 1 ? "cuarterón" : "cuarterones"}. Con ${mesActual.faltanParaRegalo} más ganas 1 hora de regalo.`
                  : `${mesActual.cuarterones} large bag${mesActual.cuarterones === 1 ? "" : "s"} this month. ${mesActual.faltanParaRegalo} more for a bonus hour.`}
            </p>
            <p className="font-mono text-[10px] tracking-[.12em] text-verde uppercase whitespace-nowrap">
              {es ? `${CUARTERONES_MES_REGALO} en el mes = +1 h` : `${CUARTERONES_MES_REGALO} a month = +1 h`}
            </p>
          </div>
          <Barra valor={recienGanada ? CUARTERONES_MES_REGALO : enMes} max={CUARTERONES_MES_REGALO} colores="from-verde to-dorado" nombre={es ? "Avance hacia la hora de regalo del mes" : "Progress to this month's bonus hour"} />
        </div>
      </div>

      {horas.regaloPorMes.length > 0 && (
        <p className="font-body text-sm text-tinta-suave">
          <span className="font-700 text-verde">{es ? "Horas de regalo: " : "Bonus hours: "}</span>
          {horas.regaloPorMes
            .map((m) => `${nombreMes(m.mes, es)} (${m.cuarterones} ${es ? "cuarterones" : "bags"}, +${m.horas} h)`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

/** Mientras no hay API del inventario, las compras son de ejemplo. */
export function NotaSimuladas({ es }: { es: boolean }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-pill bg-dorado/15 px-3 py-1 font-mono text-[10px] tracking-[.12em] uppercase text-tinta-cafe">
      <span className="w-1.5 h-1.5 rounded-full bg-dorado" aria-hidden="true" />
      {es ? "Compras de ejemplo · el inventario aún no está conectado" : "Sample purchases · inventory not connected yet"}
    </p>
  );
}

export function AvisoInventario({ estado, es }: { estado: ResumenCliente["inventario"]; es: boolean }) {
  if (estado === "ok") return null;
  const texto: Record<Exclude<typeof estado, "ok">, [string, string]> = {
    sin_configurar: [
      "Las compras se leen del inventario, y la conexión todavía no está configurada.",
      "Purchases come from the inventory system, and that connection isn't set up yet.",
    ],
    sin_documento: [
      "Falta el NIT o cédula del cliente: sin él no se pueden buscar sus compras.",
      "The client's tax ID is missing: purchases can't be looked up without it.",
    ],
    error: [
      "No pudimos leer las compras en este momento. Intenta de nuevo en un rato.",
      "We couldn't load purchases right now. Try again in a while.",
    ],
  };
  return (
    <p className="rounded-card bg-naranja/10 border border-naranja/30 px-4 py-3 font-body text-sm text-tinta-cafe">
      {texto[estado][es ? 0 : 1]}
    </p>
  );
}

export function TablaCompras({ compras, es }: { compras: CompraInventario[]; es: boolean }) {
  if (compras.length === 0) {
    return <p className="font-body text-sm text-tinta-suave py-4">{es ? "Todavía no hay compras registradas." : "No purchases yet."}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-card border border-borde bg-white">
      <table className="w-full min-w-[520px]">
        <thead className="bg-arena/50 border-b border-borde">
          <tr>
            {[es ? "Fecha" : "Date", es ? "Producto" : "Product", es ? "Cant." : "Qty", es ? "Total" : "Total"].map((h, i) => (
              <th key={h} className={`font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase px-3 py-2 ${i >= 2 ? "text-right" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-borde">
          {compras.map((c) => (
            <tr key={c.id}>
              <td className="px-3 py-2.5 font-body text-sm text-tinta-suave whitespace-nowrap">{formatFecha(c.fecha, es)}</td>
              <td className="px-3 py-2.5 font-body text-sm text-tinta">
                {c.producto}
                {c.esCuarteron && (
                  <span className="ml-2 font-mono text-[9px] tracking-[.12em] uppercase bg-vino/10 text-vino px-1.5 py-0.5 rounded-pill">
                    {es ? "Cuarterón" : "Large bag"}
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 font-body text-sm text-tinta text-right tabular-nums">{c.cantidad}</td>
              <td className="px-3 py-2.5 font-body text-sm text-tinta text-right tabular-nums whitespace-nowrap">
                {c.totalCop === null ? "—" : formatCOP(c.totalCop)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ListaCapacitaciones({
  capacitaciones, es, onBorrar,
}: {
  capacitaciones: Capacitacion[];
  es: boolean;
  /** Solo en el panel. */
  onBorrar?: (c: Capacitacion) => void;
}) {
  if (capacitaciones.length === 0) {
    return <p className="font-body text-sm text-tinta-suave py-4">{es ? "Aún no hay capacitaciones registradas." : "No training sessions yet."}</p>;
  }
  return (
    <ol className="relative border-l-2 border-borde ml-2 space-y-4">
      {capacitaciones.map((c) => (
        <li key={c.id} className="pl-5 relative">
          <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-vino ring-4 ring-fondo" aria-hidden="true" />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="font-body font-700 text-tinta text-sm">{c.tema}</p>
            <p className="font-mono text-[11px] text-tinta-suave whitespace-nowrap">
              {formatFecha(c.fecha, es)} · {horasTxt(c.horas)} h
            </p>
          </div>
          {c.notas && <p className="font-body text-sm text-tinta-suave mt-0.5">{c.notas}</p>}
          {onBorrar && (
            <button type="button" onClick={() => onBorrar(c)} className="mt-1 font-body text-xs text-tinta-suave hover:text-vino underline">
              {es ? "Borrar registro" : "Delete entry"}
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}

import { formatCOP, formatFecha } from "@/lib/format";
import { formatPeso } from "@/lib/presentaciones";
import { ETIQUETA_ESTADO_PEDIDO } from "@/lib/pedidos";
import type { EstadoPedido, Pedido } from "@/lib/types";

// Pedidos web de un cliente: los ve él en su cuenta y el equipo en su ficha.

export const COLOR_ESTADO_PEDIDO: Record<EstadoPedido, string> = {
  pendiente: "bg-naranja/15 text-naranja-700",
  confirmado: "bg-dorado/20 text-tinta-cafe",
  entregado: "bg-verde text-white",
  pagado: "bg-verde-claro text-verde",
  fallido: "bg-vino/10 text-vino",
  enviado: "bg-dorado/20 text-tinta-cafe",
  cancelado: "bg-borde text-tinta-suave",
};

export default function ListaPedidos({ pedidos, es, vacio }: { pedidos: Pedido[]; es: boolean; vacio?: string }) {
  if (pedidos.length === 0) {
    return <p className="font-body text-sm text-tinta-suave py-4">{vacio ?? (es ? "Aún no hay pedidos." : "No orders yet.")}</p>;
  }
  return (
    <ul className="space-y-3">
      {pedidos.map((p) => (
        <li key={p.id} className="rounded-card border border-borde bg-white p-4 animate-[fadeUp_.25s_ease-out]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="font-mono text-[10px] tracking-[.14em] text-tinta-suave uppercase">
              {formatFecha(p.creadoEn, es)} · {p.referencia}
            </p>
            <span className={`font-mono text-[10px] tracking-[.12em] uppercase px-2 py-0.5 rounded-pill ${COLOR_ESTADO_PEDIDO[p.estado]}`}>
              {ETIQUETA_ESTADO_PEDIDO[p.estado][es ? 0 : 1]}
            </span>
          </div>
          <ul className="font-body text-sm text-tinta space-y-0.5">
            {p.items.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  {l.cantidad} × {l.nombre}{" "}
                  <span className="text-tinta-suave">
                    ({l.presentacion === "negocio" ? (es ? "cuarterón " : "large bag ") : ""}{formatPeso(l.pesoG)}
                    {l.molienda ? ` · ${l.molienda === "molido" ? (es ? "molido" : "ground") : (es ? "en grano" : "whole bean")}` : ""})
                  </span>
                </span>
                <span className="tabular-nums text-tinta-suave">{formatCOP(l.precioCop * l.cantidad)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between gap-3 border-t border-borde mt-2 pt-2 font-body text-sm">
            <span className="text-tinta-suave truncate">{[p.linea, p.ciudad].filter(Boolean).join(", ") || p.notas}</span>
            <span className="font-700 text-tinta tabular-nums whitespace-nowrap">{formatCOP(p.totalCop)} {es ? "+ envío" : "+ shipping"}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

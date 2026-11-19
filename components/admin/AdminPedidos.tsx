"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { llamarApi } from "@/lib/pago";
import { formatCOP, formatFecha } from "@/lib/format";
import { formatPeso } from "@/lib/presentaciones";
import { ESTADOS_PEDIDO, ETIQUETA_ESTADO_PEDIDO } from "@/lib/pedidos";
import type { EstadoPedido, Pedido } from "@/lib/types";

// Pedidos hechos desde el carrito de la tienda. Sin pasarela, llegan
// "pendiente de pago" y el equipo cobra por fuera y los marca "pagado".

const COLOR: Record<EstadoPedido, string> = {
  pendiente: "bg-naranja/15 text-naranja-700",
  confirmado: "bg-dorado/20 text-tinta-cafe",
  entregado: "bg-verde text-white",
  pagado: "bg-verde-claro text-verde",
  fallido: "bg-vino/10 text-vino",
  enviado: "bg-dorado/20 text-tinta-cafe",
  cancelado: "bg-borde text-tinta-suave",
};

export default function AdminPedidos({ es }: { es: boolean }) {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<EstadoPedido | "todos">("todos");
  const [soloClientes, setSoloClientes] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [guardando, setGuardando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await llamarApi<{ pedidos: Pedido[]; inventarioConectado?: boolean }>("/api/admin/pedidos");
    if (r.ok) {
      setPedidos(r.data.pedidos);
      setConectado(Boolean(r.data.inventarioConectado));
      setError("");
    } else {
      setPedidos([]);
      setError(
        r.error === "lectura"
          ? es ? "No se pudo leer la tabla de pedidos. ¿Ya corriste supabase/migracion_clientes.sql?" : "Couldn't read orders. Did you run supabase/migracion_clientes.sql?"
          : es ? "No se pudo cargar." : "Couldn't load."
      );
    }
  }, [es]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function cambiarEstado(id: string, estado: EstadoPedido) {
    setGuardando(id);
    const r = await llamarApi(`/api/admin/pedidos/${id}`, { method: "PATCH", body: { estado } });
    setGuardando(null);
    if (!r.ok) return setError(es ? "No se pudo guardar el estado." : "Couldn't save the status.");
    setPedidos((l) => (l ?? []).map((p) => (p.id === id ? { ...p, estado } : p)));
  }

  const conteo = useMemo(() => {
    const c = Object.fromEntries(ESTADOS_PEDIDO.map((e) => [e, 0])) as Record<EstadoPedido, number>;
    for (const p of pedidos ?? []) c[p.estado]++;
    return c;
  }, [pedidos]);

  const visibles = (pedidos ?? []).filter(
    (p) => (filtro === "todos" || p.estado === filtro) && (!soloClientes || p.clienteId)
  );
  const deClientes = (pedidos ?? []).filter((p) => p.clienteId).length;

  return (
    <div>
      <h2 className="font-display font-bold text-tinta text-2xl mb-1">{es ? "Pedidos de la tienda" : "Store orders"}</h2>
      <p className="font-body text-sm text-tinta-suave mb-5">
        {es
          ? "Compras hechas desde el carrito. Mientras no haya pasarela de pago, cóbralas por fuera y márcalas como pagadas."
          : "Orders placed from the cart. Until a payment gateway is connected, collect payment separately and mark them paid."}
      </p>

      {conectado && (
        <p className="rounded-card border border-verde/30 bg-verde-claro px-4 py-3 font-body text-sm text-tinta mb-5">
          {es
            ? "El inventario está conectado: los pedidos nuevos se crean y se gestionan allá. Aquí solo quedan los anteriores a la conexión."
            : "Inventory is connected: new orders are created and managed there. Only earlier orders remain here."}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label={es ? "Filtrar por estado" : "Filter by status"}>
        {(["todos", ...ESTADOS_PEDIDO] as const).map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={filtro === e}
            onClick={() => setFiltro(e)}
            className={`font-body font-600 text-xs px-3 py-1.5 rounded-pill border transition-colors ${
              filtro === e ? "bg-vino text-crema-papel border-vino" : "bg-white text-tinta-cafe border-borde hover:border-vino"
            }`}
          >
            {e === "todos" ? (es ? "Todos" : "All") : ETIQUETA_ESTADO_PEDIDO[e][es ? 0 : 1]}{" "}
            <span className="font-mono opacity-70">{e === "todos" ? pedidos?.length ?? 0 : conteo[e]}</span>
          </button>
        ))}
        <span className="w-px bg-borde mx-1" aria-hidden="true" />
        <button
          type="button"
          aria-pressed={soloClientes}
          onClick={() => setSoloClientes((v) => !v)}
          className={`font-body font-600 text-xs px-3 py-1.5 rounded-pill border transition-colors ${
            soloClientes ? "bg-verde text-white border-verde" : "bg-white text-tinta-cafe border-borde hover:border-verde"
          }`}
        >
          {es ? "Solo de clientes" : "Clients only"} <span className="font-mono opacity-70">{deClientes}</span>
        </button>
      </div>

      {error && <p role="alert" className="font-body text-sm text-vino mb-4">{error}</p>}

      {pedidos === null ? (
        <p className="font-body text-sm text-tinta-suave py-8">{es ? "Cargando…" : "Loading…"}</p>
      ) : visibles.length === 0 ? (
        <p className="font-body text-sm text-tinta-suave py-8">{es ? "No hay pedidos aquí." : "No orders here."}</p>
      ) : (
        <div className="space-y-3">
          {visibles.map((p) => (
            <article key={p.id} className={`rounded-card border border-borde bg-white p-4 md:p-5 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 ${guardando === p.id ? "opacity-60" : ""}`}>
              <div>
                <p className="font-mono text-[10px] tracking-[.14em] text-tinta-suave uppercase">
                  {formatFecha(p.creadoEn, es)} · {p.referencia}
                </p>
                {p.clienteId && (
                  <span className="inline-flex items-center gap-1.5 mt-1 mb-0.5 font-mono text-[10px] tracking-[.1em] uppercase bg-verde-claro text-verde px-2 py-0.5 rounded-pill">
                    <span className="w-1.5 h-1.5 rounded-full bg-verde" aria-hidden="true" />
                    {es ? "Cliente" : "Client"}
                    {p.cliente?.negocio || p.cliente?.nombre ? ` · ${p.cliente.negocio || p.cliente.nombre}` : ""}
                  </span>
                )}
                <p className="font-body font-700 text-tinta">{p.nombre}</p>
                <p className="font-body text-sm text-tinta-suave break-all">
                  <a href={`mailto:${p.email}`} className="hover:text-vino">{p.email}</a> · {p.telefono}
                </p>
                <p className="font-body text-sm text-tinta-suave">
                  {p.linea}, {p.ciudad}, {p.departamento}{p.notas ? ` · ${p.notas}` : ""}
                </p>
              </div>
              <ul className="font-body text-sm text-tinta space-y-0.5">
                {p.items.map((l, i) => (
                  <li key={i}>
                    {l.cantidad} × {l.nombre}{" "}
                    <span className="text-tinta-suave">
                      ({l.presentacion === "negocio" ? (es ? "cuarterón " : "large bag ") : ""}{formatPeso(l.pesoG)})
                    </span>
                  </li>
                ))}
                <li className="font-700 pt-1">{formatCOP(p.totalCop)} {es ? "+ envío" : "+ shipping"}</li>
              </ul>
              <div>
                <select
                  value={p.estado}
                  disabled={guardando === p.id}
                  onChange={(e) => cambiarEstado(p.id, e.target.value as EstadoPedido)}
                  aria-label={es ? `Estado del pedido de ${p.nombre}` : `${p.nombre} order status`}
                  className={`font-body font-700 text-sm border border-borde rounded-input px-2 py-1.5 ${COLOR[p.estado]}`}
                >
                  {ESTADOS_PEDIDO.map((e) => (
                    <option key={e} value={e}>{ETIQUETA_ESTADO_PEDIDO[e][es ? 0 : 1]}</option>
                  ))}
                </select>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

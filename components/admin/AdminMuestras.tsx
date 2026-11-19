"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { llamarApi } from "@/lib/pago";
import { formatFecha } from "@/lib/format";
import { useCafes } from "@/components/shared/CafesProvider";
import {
  ESTADOS_MUESTRA, ETIQUETA_ESTADO, GRAMOS_MUESTRA,
  type EstadoMuestra, type SolicitudMuestra,
} from "@/lib/muestras";

// Solicitudes de muestra gratis. El estado se guarda al cambiarlo; las notas,
// con su botón. Lo marcado como "negocio" es la puerta a los clientes de
// cafetería (compras y capacitaciones), que vendrán en otra pestaña.

const TH = "text-left font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase px-2 py-2 whitespace-nowrap";
const TD = "px-2 py-3 font-body text-sm text-tinta align-top";
const CONTROL = "font-body text-sm border border-borde rounded-input px-2 py-1 bg-white focus:border-vino focus:outline-none disabled:opacity-60";

const COLOR: Record<EstadoMuestra, string> = {
  pendiente: "bg-naranja/15 text-naranja-700",
  contactado: "bg-dorado/20 text-tinta-cafe",
  enviada: "bg-verde-claro text-verde",
  compro: "bg-vino text-crema-papel",
  descartada: "bg-borde text-tinta-suave",
};

/** Enlace de WhatsApp: sin indicativo se asume Colombia (+57). */
function enlaceWhatsApp(tel: string): string {
  const digitos = tel.replace(/\D/g, "");
  const conPais = tel.startsWith("+") || digitos.length > 10 ? digitos : `57${digitos}`;
  return `https://wa.me/${conPais}`;
}

export default function AdminMuestras({ es }: { es: boolean }) {
  const cafes = useCafes();
  const [muestras, setMuestras] = useState<SolicitudMuestra[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<EstadoMuestra | "todas">("todas");
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    const r = await llamarApi<{ muestras: SolicitudMuestra[] }>("/api/admin/muestras");
    if (r.ok) {
      setMuestras(r.data.muestras);
      setError(null);
    } else {
      setError(r.mensaje ?? r.error);
      setMuestras([]);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardar(id: string, cambio: { estado?: EstadoMuestra; notas?: string }) {
    setGuardando(id);
    const r = await llamarApi(`/api/admin/muestras/${id}`, { method: "PATCH", body: cambio });
    setGuardando(null);
    if (!r.ok) {
      setError(r.mensaje ?? r.error);
      return;
    }
    setMuestras((lista) =>
      (lista ?? []).map((m) =>
        m.id === id ? { ...m, ...(cambio.estado ? { estado: cambio.estado } : {}), ...(cambio.notas !== undefined ? { notas: cambio.notas || null } : {}) } : m
      )
    );
    if (cambio.notas !== undefined) {
      setNotas((n) => {
        const s = { ...n };
        delete s[id];
        return s;
      });
    }
  }

  const conteo = useMemo(() => {
    const c = Object.fromEntries(ESTADOS_MUESTRA.map((e) => [e, 0])) as Record<EstadoMuestra, number>;
    for (const m of muestras ?? []) c[m.estado]++;
    return c;
  }, [muestras]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (muestras ?? []).filter(
      (m) =>
        (filtro === "todas" || m.estado === filtro) &&
        (!q || [m.nombre, m.telefono, m.email ?? "", m.ciudad, m.negocio ?? ""].some((v) => v.toLowerCase().includes(q)))
    );
  }, [muestras, filtro, busqueda]);

  const nombreCafe = (id: string) => cafes.find((c) => c.id === id)?.name ?? id;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="font-display font-bold text-tinta text-2xl">
            {es ? `Muestras de ${GRAMOS_MUESTRA} g` : `${GRAMOS_MUESTRA} g samples`}
          </h2>
          <p className="font-body text-sm text-tinta-suave">
            {es ? "Gratis, el cliente paga el envío. Pídelas desde /tienda#muestra." : "Free, the customer pays shipping. Requested from /tienda#muestra."}
          </p>
        </div>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={es ? "Buscar nombre, teléfono, ciudad…" : "Search name, phone, city…"}
          aria-label={es ? "Buscar solicitudes" : "Search requests"}
          className={`${CONTROL} w-64 py-2`}
        />
      </div>

      {/* Filtro por estado, con cuántas hay en cada uno */}
      <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label={es ? "Filtrar por estado" : "Filter by status"}>
        {(["todas", ...ESTADOS_MUESTRA] as const).map((e) => {
          const activo = filtro === e;
          const n = e === "todas" ? (muestras?.length ?? 0) : conteo[e];
          return (
            <button
              key={e}
              type="button"
              aria-pressed={activo}
              onClick={() => setFiltro(e)}
              className={`font-body font-600 text-xs px-3 py-1.5 rounded-pill border transition-colors ${
                activo ? "bg-vino text-crema-papel border-vino" : "bg-white text-tinta-cafe border-borde hover:border-vino"
              }`}
            >
              {e === "todas" ? (es ? "Todas" : "All") : ETIQUETA_ESTADO[e][es ? 0 : 1]}{" "}
              <span className="font-mono opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="font-body text-sm text-vino mb-4">
          {error === "lectura" || error.includes("solicitudes_muestra")
            ? es
              ? "No se pudo leer la tabla. ¿Ya corriste el SQL de supabase/esquema.sql (solicitudes_muestra)?"
              : "Couldn't read the table. Did you run the solicitudes_muestra SQL in supabase/esquema.sql?"
            : error}
        </p>
      )}

      {muestras === null ? (
        <p className="font-body text-sm text-tinta-suave py-8">{es ? "Cargando…" : "Loading…"}</p>
      ) : visibles.length === 0 ? (
        <p className="font-body text-sm text-tinta-suave py-8">{es ? "No hay solicitudes aquí todavía." : "No requests here yet."}</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-borde bg-white">
          <table className="w-full min-w-[960px]">
            <thead className="bg-arena/50 border-b border-borde">
              <tr>
                <th className={TH}>{es ? "Fecha" : "Date"}</th>
                <th className={TH}>{es ? "Quién" : "Who"}</th>
                <th className={TH}>{es ? "Contacto" : "Contact"}</th>
                <th className={TH}>{es ? "Envío" : "Shipping"}</th>
                <th className={TH}>{es ? "Café" : "Coffee"}</th>
                <th className={TH}>{es ? "Estado" : "Status"}</th>
                <th className={TH}>{es ? "Notas" : "Notes"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {visibles.map((m) => {
                const borrador = notas[m.id];
                const ocupada = guardando === m.id;
                return (
                  <tr key={m.id} className={ocupada ? "opacity-60" : ""}>
                    <td className={`${TD} whitespace-nowrap text-tinta-suave`}>{formatFecha(m.creadoEn, es)}</td>
                    <td className={TD}>
                      <span className="font-700 block">{m.nombre}</span>
                      {m.tipo === "negocio" && (
                        <span className="inline-block mt-1 font-mono text-[10px] tracking-[.1em] uppercase bg-dorado/20 text-tinta-cafe px-2 py-0.5 rounded-pill">
                          {es ? "Negocio" : "Business"}{m.negocio ? ` · ${m.negocio}` : ""}
                        </span>
                      )}
                    </td>
                    <td className={TD}>
                      <a href={enlaceWhatsApp(m.telefono)} target="_blank" rel="noopener noreferrer" className="text-verde font-700 hover:underline block whitespace-nowrap">
                        {m.telefono} ↗
                      </a>
                      {m.email && <a href={`mailto:${m.email}`} className="text-tinta-suave hover:text-vino text-xs break-all">{m.email}</a>}
                    </td>
                    <td className={TD}>
                      <span className="block">{m.ciudad}</span>
                      <span className="block text-xs text-tinta-suave">{m.direccion}</span>
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>{nombreCafe(m.cafe)}</td>
                    <td className={TD}>
                      <select
                        value={m.estado}
                        disabled={ocupada}
                        onChange={(e) => guardar(m.id, { estado: e.target.value as EstadoMuestra })}
                        aria-label={es ? `Estado de ${m.nombre}` : `${m.nombre} status`}
                        className={`${CONTROL} font-700 ${COLOR[m.estado]}`}
                      >
                        {ESTADOS_MUESTRA.map((e) => (
                          <option key={e} value={e}>{ETIQUETA_ESTADO[e][es ? 0 : 1]}</option>
                        ))}
                      </select>
                    </td>
                    <td className={`${TD} min-w-56`}>
                      <textarea
                        rows={2}
                        value={borrador ?? m.notas ?? ""}
                        disabled={ocupada}
                        onChange={(e) => setNotas((n) => ({ ...n, [m.id]: e.target.value }))}
                        aria-label={es ? `Notas de ${m.nombre}` : `${m.nombre} notes`}
                        placeholder={es ? "Guía, costo del envío, qué dijo…" : "Tracking, shipping cost, feedback…"}
                        className={`${CONTROL} w-full resize-y`}
                      />
                      {borrador !== undefined && borrador !== (m.notas ?? "") && (
                        <button
                          type="button"
                          onClick={() => guardar(m.id, { notas: borrador })}
                          disabled={ocupada}
                          className="mt-1 font-body font-700 text-xs px-3 py-1 rounded-btn bg-vino text-crema-papel hover:bg-vino-900 disabled:opacity-50"
                        >
                          {es ? "Guardar nota" : "Save note"}
                        </button>
                      )}
                      {m.mensaje && <p className="mt-1 text-xs text-tinta-suave italic">“{m.mensaje}”</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

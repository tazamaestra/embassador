"use client";

import { useEffect, useState } from "react";
import { llamarApi } from "@/lib/pago";
import type { ClienteInventario } from "@/lib/inventario-contrato";
import type { Cliente } from "@/lib/types";
import { ENTRADA, mensajeError } from "@/components/admin/AdminClientes";

// En la ficha: con qué cliente del inventario está vinculada la cuenta. El
// vínculo es por ID, así que el NIT, el nombre y las compras se leen del
// inventario siempre actualizados. Si el NIT coincide, se vincula solo.

function Datos({ c }: { c: ClienteInventario }) {
  return (
    <span className="min-w-0">
      <span className="block font-body font-700 text-sm text-tinta">{c.negocio || c.nombre}</span>
      <span className="block font-body text-xs text-tinta-suave">
        {[c.negocio ? c.nombre : "", c.documento ? `NIT/CC ${c.documento}` : "sin NIT", c.ciudad ?? "", c.email ?? ""].filter(Boolean).join(" · ")}
      </span>
    </span>
  );
}

export default function VinculoInventario({
  cliente, vinculo, es, onCambio,
}: {
  cliente: Cliente;
  /** El cliente del inventario leído en vivo (null si no está vinculado o no existe). */
  vinculo: ClienteInventario | null;
  es: boolean;
  onCambio: () => void;
}) {
  const [buscando, setBuscando] = useState(false);
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<ClienteInventario[] | null>(null);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  function abrirBuscador() {
    setTexto(cliente.negocio || cliente.nombre);
    setResultados(null);
    setError("");
    setBuscando(true);
  }

  // Busca mientras se escribe, con una pausa corta.
  useEffect(() => {
    if (!buscando) return;
    const t = setTimeout(async () => {
      const r = await llamarApi<{ clientes: ClienteInventario[] }>(`/api/admin/inventario/clientes?q=${encodeURIComponent(texto.trim())}`);
      if (r.ok) {
        setResultados(r.data.clientes);
        setError("");
      } else setError(mensajeError(r.error, r.campo, es));
    }, 300);
    return () => clearTimeout(t);
  }, [texto, buscando, es]);

  async function vincular(inventarioId: string | null) {
    if (inventarioId === null && !window.confirm(es ? "¿Desvincular? Dejará de ver sus compras y horas hasta que lo vuelvas a vincular." : "Unlink? Purchases and hours will stop showing until relinked.")) return;
    setOcupado(true);
    const r = await llamarApi(`/api/admin/clientes/${cliente.id}`, { method: "PATCH", body: { inventarioId } });
    setOcupado(false);
    if (!r.ok) return setError(mensajeError(r.error, r.campo, es));
    setBuscando(false);
    setError("");
    onCambio();
  }

  return (
    <div className="space-y-3">
      {vinculo ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-verde/40 bg-verde-claro/50 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-7 h-7 shrink-0 rounded-full bg-verde text-white flex items-center justify-center text-sm" aria-hidden="true">✓</span>
            <Datos c={vinculo} />
          </div>
          {!buscando && (
            <div className="flex gap-3">
              <button type="button" onClick={abrirBuscador} className="font-body text-sm text-tinta-suave hover:text-vino underline">{es ? "Cambiar" : "Change"}</button>
              <button type="button" onClick={() => vincular(null)} disabled={ocupado} className="font-body text-sm text-tinta-suave hover:text-vino underline">{es ? "Desvincular" : "Unlink"}</button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-naranja/40 bg-naranja/10 px-4 py-3">
          <p className="font-body text-sm text-tinta-cafe">
            {cliente.inventarioId
              ? (es ? "El cliente vinculado no se encontró en el inventario (¿lo borraron?). Vincúlalo de nuevo." : "The linked client wasn't found in the inventory. Link it again.")
              : (es ? "Sin vincular: no se ven sus compras ni suman horas. Búscalo en el inventario y vincúlalo." : "Not linked: purchases and hours won't show. Find it in the inventory and link it.")}
          </p>
          {!buscando && (
            <button type="button" onClick={abrirBuscador} className="font-body font-700 text-sm px-4 py-2 rounded-btn bg-vino text-crema-papel hover:bg-vino-900">
              {es ? "Vincular" : "Link"}
            </button>
          )}
        </div>
      )}

      {buscando && (
        <div className="rounded-card border border-borde bg-white p-3 space-y-2 animate-[fadeUp_.2s_ease-out]">
          <div className="flex gap-2">
            <input
              type="search"
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={es ? "Nombre, negocio, NIT o correo…" : "Name, business, tax ID or email…"}
              aria-label={es ? "Buscar cliente en el inventario" : "Search inventory client"}
              className={ENTRADA}
            />
            <button type="button" onClick={() => setBuscando(false)} className="font-body text-sm px-3 text-tinta-suave hover:text-tinta">{es ? "Cancelar" : "Cancel"}</button>
          </div>
          {resultados === null ? (
            <p className="font-body text-sm text-tinta-suave px-1">{es ? "Buscando…" : "Searching…"}</p>
          ) : resultados.length === 0 ? (
            <p className="font-body text-sm text-tinta-suave px-1">{es ? "No hay clientes con ese texto en el inventario." : "No inventory clients match."}</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-borde">
              {resultados.map((c) => {
                const actual = c.id === vinculo?.id;
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-1 py-2">
                    <Datos c={c} />
                    <button
                      type="button"
                      onClick={() => vincular(c.id)}
                      disabled={ocupado || actual}
                      className="shrink-0 font-body font-700 text-xs px-3 py-1.5 rounded-btn border border-vino text-vino hover:bg-vino hover:text-crema-papel disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-vino"
                    >
                      {actual ? (es ? "Vinculado" : "Linked") : (es ? "Vincular" : "Link")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {error && <p role="alert" className="font-body text-sm text-vino">{error}</p>}
    </div>
  );
}

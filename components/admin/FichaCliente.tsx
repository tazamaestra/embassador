"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { llamarApi } from "@/lib/pago";
import type { Capacitacion, Cliente, ResumenCliente } from "@/lib/types";
import { AvisoInventario, ListaCapacitaciones, NotaSimuladas, TablaCompras, TarjetasHoras } from "@/components/clientes/ResumenHoras";
import { Credenciales, ENTRADA, ETIQUETA, mensajeError } from "@/components/admin/AdminClientes";
import ListaPedidos from "@/components/clientes/ListaPedidos";

// Ficha de un cliente en el panel: horas, compras del inventario,
// capacitaciones dadas (registrar y borrar), datos de la cuenta, clave y
// estado.

const hoy = () => new Date().toISOString().slice(0, 10);

function Seccion({ titulo, children, extra }: { titulo: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-mono text-[11px] tracking-[.18em] text-dorado uppercase">{titulo}</h3>
        {extra}
      </div>
      {children}
    </section>
  );
}

export default function FichaCliente({
  id, es, onEditar, onCambio, onBorrado,
}: {
  id: string;
  es: boolean;
  /** Abre el formulario de edición con los datos actuales. */
  onEditar: (c: Cliente) => void;
  onCambio: () => void;
  onBorrado: () => void;
}) {
  const [resumen, setResumen] = useState<ResumenCliente | null>(null);
  const [error, setError] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [credenciales, setCredenciales] = useState<{ email: string; clave: string } | null>(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  const cargar = useCallback(async () => {
    const r = await llamarApi<ResumenCliente>(`/api/admin/clientes/${id}`);
    if (r.ok) {
      setResumen(r.data);
      setError("");
    } else setError(mensajeError(r.error, r.campo, es));
  }, [id, es]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function registrarCapacitacion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const datos = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    setOcupado(true);
    const r = await llamarApi(`/api/admin/clientes/${id}/capacitaciones`, { body: { ...datos, horas: Number(datos.horas) } });
    setOcupado(false);
    if (!r.ok) return setError(mensajeError(r.error, r.campo, es));
    setError("");
    setRegistrando(false);
    await cargar();
    onCambio();
  }

  async function borrarCapacitacion(c: Capacitacion) {
    if (!window.confirm(es ? `¿Borrar "${c.tema}" (${c.horas} h)?` : `Delete "${c.tema}" (${c.horas} h)?`)) return;
    const r = await llamarApi(`/api/admin/clientes/${id}/capacitaciones/${c.id}`, { method: "DELETE" });
    if (!r.ok) return setError(mensajeError(r.error, r.campo, es));
    await cargar();
    onCambio();
  }

  async function cambiarActivo(activo: boolean) {
    setOcupado(true);
    const r = await llamarApi(`/api/admin/clientes/${id}`, { method: "PATCH", body: { activo } });
    setOcupado(false);
    if (!r.ok) return setError(mensajeError(r.error, r.campo, es));
    await cargar();
    onCambio();
  }

  async function nuevaClave() {
    if (!window.confirm(es ? "¿Generar una clave nueva? La actual dejará de funcionar." : "Generate a new password? The current one will stop working.")) return;
    setOcupado(true);
    const r = await llamarApi<{ clave?: string }>(`/api/admin/clientes/${id}`, { method: "PATCH", body: { nuevaClave: true } });
    setOcupado(false);
    if (!r.ok || !r.data.clave) return setError(mensajeError(r.ok ? "error" : r.error, undefined, es));
    setCredenciales({ email: resumen?.cliente.email ?? "", clave: r.data.clave });
  }

  async function borrar() {
    setOcupado(true);
    const r = await llamarApi(`/api/admin/clientes/${id}`, { method: "DELETE" });
    setOcupado(false);
    if (!r.ok) return setError(mensajeError(r.error, r.campo, es));
    onBorrado();
  }

  if (!resumen) {
    return (
      <div className="rounded-card-lg border border-borde bg-white p-8">
        {error ? <p role="alert" className="font-body text-sm text-vino">{error}</p> : <p className="font-body text-sm text-tinta-suave">{es ? "Cargando ficha…" : "Loading…"}</p>}
      </div>
    );
  }

  const { cliente, compras, capacitaciones, horas, inventario, comprasSimuladas, pedidos } = resumen;

  return (
    <div className="rounded-card-lg border border-borde bg-fondo p-5 md:p-7 space-y-8 animate-[fadeUp_.25s_ease-out]">
      {/* Encabezado */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[.18em] text-dorado uppercase mb-1">
            {cliente.documento ? `NIT/CC ${cliente.documento}` : (es ? "Sin NIT/cédula" : "No tax ID")}
            {cliente.ciudad ? ` · ${cliente.ciudad}` : ""}
          </p>
          <h2 className="font-display font-bold text-tinta text-3xl leading-tight">{cliente.negocio || cliente.nombre || cliente.email}</h2>
          <p className="font-body text-sm text-tinta-suave">
            {[cliente.negocio ? cliente.nombre : "", cliente.email, cliente.telefono].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[10px] tracking-[.14em] uppercase px-2.5 py-1 rounded-pill ${cliente.activo ? "bg-verde-claro text-verde" : "bg-borde text-tinta-suave"}`}>
            {cliente.activo ? (es ? "Cuenta activa" : "Active") : (es ? "Cuenta inactiva" : "Inactive")}
          </span>
          <button
            type="button"
            onClick={() => onEditar(cliente)}
            className="inline-flex items-center gap-1.5 font-body font-700 text-sm px-4 py-2 rounded-btn border border-borde-2 bg-white text-tinta-cafe hover:border-vino hover:text-vino transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            {es ? "Editar" : "Edit"}
          </button>
        </div>
      </header>

      {cliente.notas && (
        <p className="rounded-card border border-dashed border-borde-2 bg-white/60 px-4 py-3 font-body text-sm text-tinta-suave whitespace-pre-line">
          <span className="font-mono text-[10px] tracking-[.14em] uppercase text-dorado mr-2">{es ? "Notas internas" : "Internal notes"}</span>
          {cliente.notas}
        </p>
      )}

      {error && <p role="alert" className="font-body text-sm text-vino">{error}</p>}
      {credenciales && <Credenciales email={credenciales.email} clave={credenciales.clave} es={es} onCerrar={() => setCredenciales(null)} />}

      <Seccion titulo={es ? "Horas de capacitación" : "Training hours"}>
        <TarjetasHoras horas={horas} es={es} />
        {horas.disponibles < 0 && (
          <p className="font-body text-sm text-vino">
            {es ? "Ojo: ya se dieron más horas de las ganadas." : "Note: more hours were given than earned."}
          </p>
        )}
      </Seccion>

      <Seccion
        titulo={es ? "Capacitaciones dadas" : "Training sessions"}
        extra={!registrando && (
          <button type="button" onClick={() => setRegistrando(true)} className="font-body font-700 text-xs px-3 py-1.5 rounded-btn bg-vino text-crema-papel hover:bg-vino-900">
            + {es ? "Registrar sesión" : "Log session"}
          </button>
        )}
      >
        {registrando && (
          <form onSubmit={registrarCapacitacion} className="rounded-card border border-borde bg-white p-4 grid grid-cols-1 sm:grid-cols-[150px_110px_1fr] gap-3 items-end animate-[fadeUp_.2s_ease-out]">
            <div>
              <label className={ETIQUETA} htmlFor="cap-fecha">{es ? "Fecha" : "Date"}</label>
              <input id="cap-fecha" name="fecha" type="date" defaultValue={hoy()} required className={ENTRADA} disabled={ocupado} />
            </div>
            <div>
              <label className={ETIQUETA} htmlFor="cap-horas">{es ? "Horas" : "Hours"}</label>
              <input id="cap-horas" name="horas" type="number" min={0.5} max={12} step={0.5} defaultValue={1} required className={ENTRADA} disabled={ocupado} />
            </div>
            <div>
              <label className={ETIQUETA} htmlFor="cap-tema">{es ? "Tema" : "Topic"}</label>
              <input id="cap-tema" name="tema" required maxLength={160} placeholder={es ? "Calibración de molino, métodos…" : "Grinder calibration, methods…"} className={ENTRADA} disabled={ocupado} />
            </div>
            <div className="sm:col-span-3">
              <label className={ETIQUETA} htmlFor="cap-notas">{es ? "Notas (opcional)" : "Notes (optional)"}</label>
              <input id="cap-notas" name="notas" maxLength={1000} className={ENTRADA} disabled={ocupado} />
            </div>
            <div className="sm:col-span-3 flex gap-2">
              <button type="submit" disabled={ocupado} className="font-body font-700 text-sm px-4 py-2 rounded-btn bg-vino text-crema-papel hover:bg-vino-900 disabled:opacity-60">
                {es ? "Guardar sesión" : "Save session"}
              </button>
              <button type="button" onClick={() => setRegistrando(false)} className="font-body text-sm px-3 py-2 text-tinta-suave hover:text-tinta">
                {es ? "Cancelar" : "Cancel"}
              </button>
            </div>
          </form>
        )}
        <ListaCapacitaciones capacitaciones={capacitaciones} es={es} onBorrar={borrarCapacitacion} />
      </Seccion>

      <Seccion titulo={es ? `Pedidos web (${pedidos.length})` : `Web orders (${pedidos.length})`}>
        <ListaPedidos
          pedidos={pedidos.slice(0, 5)}
          es={es}
          vacio={es ? "No ha hecho pedidos desde su cuenta." : "No orders from their account."}
        />
        {pedidos.length > 5 && (
          <p className="font-body text-xs text-tinta-suave">
            {es ? "Los anteriores están en la pestaña Pedidos." : "Older ones are in the Orders tab."}
          </p>
        )}
        {comprasSimuladas && pedidos.length > 0 && (
          <p className="font-body text-xs text-tinta-suave">
            {es
              ? "Mientras el inventario no esté conectado, los pedidos marcados como pagados o enviados se suman a sus compras y horas."
              : "Until inventory is connected, orders marked paid or shipped count toward purchases and hours."}
          </p>
        )}
      </Seccion>

      <Seccion titulo={es ? "Compras (inventario)" : "Purchases (inventory)"}>
        <AvisoInventario estado={inventario} es={es} />
        {comprasSimuladas && <NotaSimuladas es={es} />}
        {inventario === "ok" && <TablaCompras compras={compras} es={es} />}
      </Seccion>

      {/* Acciones de la cuenta */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-borde">
        <button type="button" onClick={nuevaClave} disabled={ocupado} className="font-body font-700 text-sm px-4 py-2 rounded-btn border border-borde-2 text-tinta-cafe hover:border-vino hover:text-vino disabled:opacity-60">
          {es ? "Generar clave nueva" : "Generate new password"}
        </button>
        <button type="button" onClick={() => cambiarActivo(!cliente.activo)} disabled={ocupado} className="font-body font-700 text-sm px-4 py-2 rounded-btn border border-borde-2 text-tinta-cafe hover:border-vino hover:text-vino disabled:opacity-60">
          {cliente.activo ? (es ? "Desactivar cuenta" : "Deactivate") : (es ? "Activar cuenta" : "Activate")}
        </button>
        {confirmarBorrar ? (
          <span className="flex items-center gap-2">
            <button type="button" onClick={borrar} disabled={ocupado} className="font-body font-700 text-sm px-4 py-2 rounded-btn bg-vino text-crema-papel disabled:opacity-60">
              {es ? "Sí, borrar todo" : "Yes, delete all"}
            </button>
            <button type="button" onClick={() => setConfirmarBorrar(false)} className="font-body text-sm px-2 text-tinta-suave">
              {es ? "No" : "No"}
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmarBorrar(true)} disabled={ocupado} className="ml-auto font-body text-sm px-3 py-2 text-tinta-suave hover:text-vino">
            {es ? "Borrar cliente" : "Delete client"}
          </button>
        )}
      </div>
    </div>
  );
}

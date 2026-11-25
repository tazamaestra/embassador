"use client";

import { useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import { useCafes } from "@/components/shared/CafesProvider";
import BolsaNegocio from "@/components/shared/BolsaNegocio";
import { srcImagen } from "@/lib/cafes";
import { calcularHoras } from "@/lib/capacitacion";
import { formatCOP } from "@/lib/format";
import SelectorCiudad from "@/components/shared/SelectorCiudad";
import { formatPeso, nombrePresentacion, presentacionesDe, type PresentacionId } from "@/lib/presentaciones";
import { llamarApi } from "@/lib/pago";
import type { Capacitacion, CompraInventario, Molienda, Pedido } from "@/lib/types";

// El cliente arma su pedido desde la cuenta: cantidades por café y
// presentación (precios de cliente, ajustables), grano o molido, y ve
// cuántas horas de capacitación le sumaría. La dirección no es obligatoria:
// el inventario ya tiene la del cliente; solo si marca "otra dirección" la escribe.
// Queda "pendiente"; el equipo confirma pago y envío.

const ENTRADA =
  "w-full h-11 font-body text-[15px] text-tinta bg-white border border-borde rounded-input px-3.5 focus:border-vino focus:outline-none focus:ring-2 focus:ring-vino/15 disabled:opacity-60 aria-[invalid=true]:border-vino";
const ETIQUETA = "block font-body font-600 text-sm text-tinta mb-1.5";

function Contador({ valor, onCambio, nombre, es }: { valor: number; onCambio: (n: number) => void; nombre: string; es: boolean }) {
  const boton = "w-9 h-9 rounded-full border border-borde-2 flex items-center justify-center text-lg font-bold text-tinta-cafe hover:border-vino hover:text-vino disabled:opacity-30 disabled:hover:border-borde-2 disabled:hover:text-tinta-cafe transition-colors";
  return (
    <div className="flex items-center gap-2" role="group" aria-label={es ? `Cantidad de ${nombre}` : `${nombre} quantity`}>
      <button type="button" className={boton} onClick={() => onCambio(valor - 1)} disabled={valor <= 0} aria-label={es ? "Quitar uno" : "Remove one"}>−</button>
      <span className="w-8 text-center font-display font-bold text-xl text-tinta tabular-nums" aria-live="polite">{valor}</span>
      <button type="button" className={boton} onClick={() => onCambio(valor + 1)} disabled={valor >= 50} aria-label={es ? "Agregar uno" : "Add one"}>+</button>
    </div>
  );
}

export default function NuevoPedido({
  es, compras, capacitaciones, onEnviado, onCerrar,
}: {
  es: boolean;
  compras: CompraInventario[];
  capacitaciones: Capacitacion[];
  onEnviado: (p: Pedido) => void;
  onCerrar: () => void;
}) {
  const cafes = useCafes();
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  // Precio unitario que el cliente ajusta; si no lo toca, va el del catálogo.
  const [precios, setPrecios] = useState<Record<string, number>>({});
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [molienda, setMolienda] = useState<Record<string, Molienda>>({});
  const [otraDireccion, setOtraDireccion] = useState(false);
  const [campoMalo, setCampoMalo] = useState<string | null>(null);

  const clave = (cafe: string, pres: PresentacionId) => `${cafe}:${pres}`;
  const poner = (k: string, n: number) => setCantidades((c) => ({ ...c, [k]: Math.max(0, Math.min(50, n)) }));

  const lineas = useMemo(
    () =>
      cafes.flatMap((cafe) =>
        presentacionesDe(cafe, "cuenta").flatMap((pres) => {
          const k = clave(cafe.id, pres.id);
          const cantidad = cantidades[k] ?? 0;
          const precio = precios[k] ?? pres.precioCop;
          return cantidad > 0 ? [{ cafe, pres, cantidad, precio, molienda: molienda[k] ?? "grano" }] : [];
        })
      ),
    [cafes, cantidades, precios, molienda]
  );
  const total = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
  const cuarterones = lineas.filter((l) => l.pres.id === "negocio").reduce((s, l) => s + l.cantidad, 0);

  // Cuántas horas le sumaría este pedido cuando se confirme.
  const proyeccion = useMemo(() => {
    const antes = calcularHoras(compras, capacitaciones);
    if (cuarterones === 0) return { horas: 0, regalo: false, faltan: antes.faltanParaSiguiente };
    const hoy = new Date().toISOString().slice(0, 10);
    const despues = calcularHoras(
      [...compras, { id: "nuevo", fecha: hoy, producto: "", gramos: 2250, cantidad: cuarterones, totalCop: null, esCuarteron: true }],
      capacitaciones
    );
    return { horas: despues.ganadas - antes.ganadas, regalo: despues.regalo > antes.regalo, faltan: despues.faltanParaSiguiente };
  }, [compras, capacitaciones, cuarterones]);

  // Señala el campo con problema y dice cuál es.
  function marcarCampo(campo: string) {
    const mensajes: Record<string, [string, string]> = {
      linea: ["Escribe la dirección de entrega.", "Enter the delivery address."],
      ciudad: ["Elige la ciudad de entrega (o escríbela en “Otra…”).", "Choose the delivery city (or type it under “Other…”)."],
      departamento: ["Escribe el departamento de entrega.", "Enter the delivery state."],
      notas: ["Las indicaciones son muy largas (máximo 300 caracteres).", "Notes are too long (300 characters max)."],
    };
    setCampoMalo(campo);
    document.getElementById(`np-${campo}`)?.focus();
    const [msgEs, msgEn] = mensajes[campo] ?? ["Revisa los datos del pedido.", "Check the order details."];
    setError(es ? msgEs : msgEn);
  }

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setCampoMalo(null);
    if (lineas.length === 0) return setError(es ? "Agrega al menos un café." : "Add at least one coffee.");
    if (lineas.some((l) => !Number.isInteger(l.precio) || l.precio < 1000)) {
      return setError(es ? "Revisa los precios: mínimo $1.000 por unidad." : "Check the prices: at least $1,000 per unit.");
    }
    const datos = Object.fromEntries(new FormData(e.currentTarget).entries());
    const texto = (k: string) => String(datos[k] ?? "").trim();
    // La otra dirección solo se pide si el cliente la marcó; ahí sí son obligatorios.
    if (otraDireccion) {
      const falta = (["linea", "ciudad", "departamento"] as const).find((k) => !texto(k));
      if (falta) return marcarCampo(falta);
    }
    setOcupado(true);
    const r = await llamarApi<{ pedido: Pedido }>("/api/mi-cuenta/pedidos", {
      body: {
        items: lineas.map((l) => ({ cafe: l.cafe.id, presentacion: l.pres.id, cantidad: l.cantidad, precioCop: l.precio, molienda: l.molienda })),
        notas: texto("notas"),
        ...(otraDireccion ? { otraDireccion: { linea: texto("linea"), ciudad: texto("ciudad"), departamento: texto("departamento") } } : {}),
      },
    });
    setOcupado(false);
    if (!r.ok) {
      if (r.error === "campo_invalido" && r.campo === "precio") {
        return setError(es ? "Revisa los precios: deben estar entre $1.000 y $10.000.000." : "Check the prices: between $1,000 and $10,000,000.");
      }
      if (r.error === "campo_invalido" && r.campo && r.campo !== "items") return marcarCampo(r.campo);
      if (r.error === "cliente_no_encontrado") {
        return setError(es
          ? "Tu NIT o cédula todavía no está registrado en nuestro sistema. Escríbenos y lo activamos."
          : "Your tax ID isn't registered in our system yet. Contact us and we'll set it up.");
      }
      // El detalle (qué respondió el inventario) ayuda a saber qué falló.
      const detalle = r.mensaje ? ` (${r.mensaje})` : r.status ? ` (${r.error} · ${r.status})` : "";
      return setError((es ? "No pudimos enviar el pedido. Intenta de nuevo en un momento." : "We couldn't send the order. Try again in a moment.") + detalle);
    }
    onEnviado(r.data.pedido);
  }

  return (
    <form onSubmit={enviar} noValidate className="rounded-card-lg border border-borde bg-white shadow-card-hover animate-[fadeUp_.25s_ease-out] overflow-hidden">
      <header className="flex items-start justify-between gap-4 px-6 md:px-8 pt-6 pb-5 border-b border-borde">
        <div>
          <p className="font-mono text-[10px] tracking-[.18em] text-dorado uppercase mb-1">{es ? "NUEVO PEDIDO" : "NEW ORDER"}</p>
          <h2 className="font-display font-bold text-tinta text-2xl">{es ? "¿Qué café te enviamos?" : "What coffee should we send?"}</h2>
          <p className="font-body text-sm text-tinta-suave mt-0.5">
            {es ? "Elige cantidades. Te confirmamos el pago y el envío." : "Pick quantities. We'll confirm payment and shipping."}
          </p>
        </div>
        <button type="button" onClick={onCerrar} disabled={ocupado} aria-label={es ? "Cerrar" : "Close"} className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-tinta-suave hover:bg-arena hover:text-tinta transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
        {/* Cafés y cantidades */}
        <div className="px-6 md:px-8 py-6 space-y-4">
          {cafes.map((cafe) => (
            <div key={cafe.id} className="rounded-card border border-borde p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ background: cafe.swatch }} aria-hidden="true">
                  {cafe.img && <Image src={srcImagen(cafe.img)} alt="" width={44} height={46} />}
                </span>
                <div className="min-w-0">
                  <p className="font-display font-bold text-tinta text-lg leading-tight">{cafe.name}</p>
                  <p className="font-body text-xs text-tinta-suave truncate">{es ? cafe.notas_es : cafe.notas_en}</p>
                </div>
              </div>
              <ul className="divide-y divide-borde">
                {presentacionesDe(cafe, "cuenta").map((pres) => {
                  const k = clave(cafe.id, pres.id);
                  const n = cantidades[k] ?? 0;
                  const precio = precios[k] ?? pres.precioCop;
                  const mol = molienda[k] ?? "grano";
                  return (
                    <li key={pres.id} className="py-2.5">
                     <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {pres.id === "negocio" ? (
                          <BolsaNegocio product={cafe} id={`np-${cafe.id}`} proceso={es ? cafe.proceso_es : cafe.proceso_en} decorativa className="w-7 h-auto shrink-0" />
                        ) : (
                          <span className="w-7 shrink-0" aria-hidden="true" />
                        )}
                        <div className="min-w-0">
                          <p className="font-body font-700 text-sm text-tinta">
                            {nombrePresentacion(pres.id, es)} · {formatPeso(pres.pesoG)}
                          </p>
                          <div className="flex items-center gap-1 mt-1 font-body text-xs text-tinta-suave">
                            <span aria-hidden="true">$</span>
                            <input
                              aria-label={es ? `Precio por unidad de ${cafe.name} ${formatPeso(pres.pesoG)}` : `Unit price of ${cafe.name} ${formatPeso(pres.pesoG)}`}
                              type="text"
                              inputMode="numeric"
                              value={precio ? precio.toLocaleString("es-CO") : ""}
                              onChange={(e) => {
                                const digitos = e.target.value.replace(/\D/g, "").slice(0, 8);
                                setPrecios((p) => ({ ...p, [k]: digitos ? Number(digitos) : 0 }));
                              }}
                              disabled={ocupado}
                              aria-invalid={n > 0 && precio < 1000}
                              className="w-28 h-8 font-body text-sm text-tinta bg-white border border-borde rounded-input px-2 tabular-nums focus:border-vino focus:outline-none focus:ring-2 focus:ring-vino/15 aria-[invalid=true]:border-vino"
                            />
                            {precio !== pres.precioCop && (
                              <button
                                type="button"
                                onClick={() => setPrecios((p) => ({ ...p, [k]: pres.precioCop }))}
                                className="underline hover:text-vino"
                              >
                                {es ? `restaurar ${formatCOP(pres.precioCop)}` : `reset ${formatCOP(pres.precioCop)}`}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <Contador valor={n} onCambio={(v) => poner(k, v)} nombre={`${cafe.name} ${formatPeso(pres.pesoG)}`} es={es} />
                     </div>
                      {/* Grano o molido: aparece al agregar esa presentación. */}
                      {n > 0 && (
                        <div role="radiogroup" aria-label={es ? `Molienda de ${cafe.name} ${formatPeso(pres.pesoG)}` : `Grind for ${cafe.name} ${formatPeso(pres.pesoG)}`} className="flex gap-2 mt-2 pl-10 animate-[fadeUp_.2s_ease-out]">
                          {(["grano", "molido"] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              role="radio"
                              aria-checked={mol === m}
                              disabled={ocupado}
                              onClick={() => setMolienda((x) => ({ ...x, [k]: m }))}
                              className={`h-8 px-3 rounded-full border font-body text-xs font-700 transition-colors ${
                                mol === m ? "border-vino bg-vino/5 text-vino" : "border-borde text-tinta-suave hover:border-vino"
                              }`}
                            >
                              {m === "grano" ? (es ? "En grano" : "Whole bean") : (es ? "Molido" : "Ground")}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Entrega: por defecto, la dirección que el cliente tiene en el inventario. */}
          <div className="rounded-card border border-borde p-4 space-y-4">
            <div>
              <p className="font-body text-sm text-tinta">
                {es ? "Lo enviamos a la dirección que tenemos registrada para tu negocio." : "We'll ship to the address we have on file for your business."}
              </p>
              <label className="mt-2 inline-flex items-center gap-2 font-body text-sm font-600 text-tinta cursor-pointer">
                <input
                  type="checkbox"
                  checked={otraDireccion}
                  onChange={(e) => { setOtraDireccion(e.target.checked); setCampoMalo(null); setError(""); }}
                  disabled={ocupado}
                  className="w-4 h-4 accent-vino"
                />
                {es ? "Enviar a otra dirección" : "Ship to a different address"}
              </label>
            </div>
            {otraDireccion && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-[fadeUp_.2s_ease-out]">
                <div className="sm:col-span-2">
                  <label className={ETIQUETA} htmlFor="np-linea">{es ? "Dirección" : "Address"}</label>
                  <input id="np-linea" name="linea" maxLength={200} disabled={ocupado} aria-invalid={campoMalo === "linea"} className={ENTRADA} placeholder={es ? "Calle 12 #4-56, local 2" : "Street, number, unit"} />
                </div>
                <div>
                  <label className={ETIQUETA} htmlFor="np-ciudad">{es ? "Ciudad" : "City"}</label>
                  <SelectorCiudad id="np-ciudad" es={es} disabled={ocupado} className={ENTRADA} />
                </div>
                <div>
                  <label className={ETIQUETA} htmlFor="np-departamento">{es ? "Departamento" : "State"}</label>
                  <input id="np-departamento" name="departamento" maxLength={80} disabled={ocupado} aria-invalid={campoMalo === "departamento"} className={ENTRADA} placeholder="Risaralda" />
                </div>
              </div>
            )}
            <div>
              <label className={ETIQUETA} htmlFor="np-notas">{es ? "Indicaciones (opcional)" : "Notes (optional)"}</label>
              <input id="np-notas" name="notas" maxLength={300} disabled={ocupado} aria-invalid={campoMalo === "notas"} className={ENTRADA} placeholder={es ? "Horario de recibo, quién recibe…" : "Receiving hours, who receives…"} />
            </div>
          </div>
        </div>

        {/* Resumen */}
        <aside className="bg-arena/40 border-t lg:border-t-0 lg:border-l border-borde px-6 md:px-7 py-6 flex flex-col">
          <p className="font-mono text-[10px] tracking-[.18em] text-tinta-suave uppercase mb-3">{es ? "TU PEDIDO" : "YOUR ORDER"}</p>
          {lineas.length === 0 ? (
            <p className="font-body text-sm text-tinta-suave">{es ? "Usa + para agregar café." : "Use + to add coffee."}</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {lineas.map((l) => (
                <li key={clave(l.cafe.id, l.pres.id)} className="flex justify-between gap-3 font-body text-sm animate-[fadeUp_.2s_ease-out]">
                  <span className="text-tinta">
                    {l.cantidad} × {l.cafe.name}{" "}
                    <span className="text-tinta-suave">
                      {formatPeso(l.pres.pesoG)} · {l.molienda === "molido" ? (es ? "molido" : "ground") : (es ? "en grano" : "whole bean")}
                    </span>
                  </span>
                  <span className="text-tinta tabular-nums">{formatCOP(l.precio * l.cantidad)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-borde pt-3 flex items-baseline justify-between">
            <span className="font-body text-sm text-tinta-suave">{es ? "Total" : "Total"}</span>
            <span className="font-display font-bold text-tinta text-3xl tabular-nums">{formatCOP(total)}</span>
          </div>
          <p className="font-body text-xs text-tinta-suave mb-4">{es ? "+ costo de envío" : "+ shipping"}</p>

          {/* Lo que suma en horas */}
          <div className={`rounded-card p-4 mb-5 transition-colors ${proyeccion.horas > 0 ? "bg-verde-claro border border-verde/30" : "bg-white border border-borde"}`}>
            {cuarterones === 0 ? (
              <p className="font-body text-sm text-tinta-suave">
                {es ? "Los cuarterones suman horas de capacitación: cada 3, una hora." : "Large bags add training hours: 1 hour every 3."}
              </p>
            ) : proyeccion.horas > 0 ? (
              <>
                <p className="font-display font-bold text-verde text-2xl leading-none">+{proyeccion.horas} h</p>
                <p className="font-body text-sm text-tinta mt-1">
                  {es ? "de capacitación al confirmarse este pedido" : "of training once this order is confirmed"}
                  {proyeccion.regalo && (es ? ", ¡incluida tu hora de regalo del mes!" : ", including this month's bonus hour!")}
                </p>
              </>
            ) : (
              <p className="font-body text-sm text-tinta">
                {es
                  ? `${cuarterones} ${cuarterones === 1 ? "cuarterón" : "cuarterones"}: con ${proyeccion.faltan} más ganas tu próxima hora.`
                  : `${cuarterones} large bag${cuarterones === 1 ? "" : "s"}: ${proyeccion.faltan} more for your next hour.`}
              </p>
            )}
          </div>

          {error && <p role="alert" className="font-body text-sm text-vino mb-3">{error}</p>}
          <button
            type="submit"
            disabled={ocupado || lineas.length === 0}
            className="mt-auto w-full bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3.5 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
          >
            {ocupado ? (es ? "Enviando…" : "Sending…") : (es ? "Enviar pedido" : "Send order")}
          </button>
        </aside>
      </div>
    </form>
  );
}

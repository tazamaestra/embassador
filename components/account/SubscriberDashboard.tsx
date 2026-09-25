"use client";

import { useCallback, useEffect, useState } from "react";
import { Link, useRouter } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth-store";
import { esEquipo } from "@/lib/finca-fotos";
import { llamarApi } from "@/lib/pago";
import { accionesDisponibles, costoMensual, fechaCobro, montoCobro, progresoRegalo } from "@/lib/suscripcion";
import { etiqueta, formatCOP, formatFecha } from "@/lib/format";
import MetodoPagoForm, { type PagoTokenizado } from "@/components/pago/MetodoPagoForm";
import CamposDireccion, { DIRECCION_VACIA, type DatosDireccion } from "@/components/shared/CamposDireccion";
import CancelarFlujo from "@/components/account/CancelarFlujo";
import type { Catalogo, Cobro, EnvioSuscripcion, Locale, MetodoPago, Suscripcion } from "@/lib/types";

// El panel del suscriptor. Cada acción es un clic: no hay pantalla de
// confirmación para saltar, pausar o cambiar. Todo pasa por las rutas de
// app/api/suscripciones, que aplican las reglas de lib/suscripcion.ts; el
// navegador no escribe en la base.

interface Datos {
  suscripcion: Suscripcion | null;
  envios: EnvioSuscripcion[];
  cobros: Cobro[];
  metodoPago: MetodoPago | null;
  direccion: DatosDireccion | null;
  cobroEnCurso: boolean;
}

const ESTADOS: Record<Suscripcion["estado"], [string, string, string]> = {
  activa: ["Activa", "Active", "bg-verde-claro text-verde"],
  pausada: ["En pausa", "Paused", "bg-arena text-tinta-cafe"],
  pago_pendiente: ["Pago pendiente", "Payment pending", "bg-naranja/15 text-naranja-700"],
  cancelada: ["Cancelada", "Cancelled", "bg-borde text-tinta-suave"],
};

const ESTADO_COBRO: Record<Cobro["estado"], [string, string]> = {
  CREANDO: ["Procesando", "Processing"],
  PENDING: ["Procesando", "Processing"],
  APPROVED: ["Aprobado", "Approved"],
  DECLINED: ["Rechazado", "Declined"],
  VOIDED: ["Anulado", "Voided"],
  ERROR: ["Error", "Error"],
};

const BOTON =
  "font-body font-700 text-sm px-4 py-2.5 rounded-btn border border-borde-2 text-tinta-cafe hover:border-vino hover:text-vino transition-colors disabled:opacity-50";
const BOTON_PRIMARIO =
  "font-body font-700 text-sm px-4 py-2.5 rounded-btn bg-vino hover:bg-vino-800 text-crema-papel transition-colors disabled:opacity-50";

export default function SubscriberDashboard({ locale, catalogo }: { locale: Locale; catalogo: Catalogo }) {
  const es = locale !== "en";
  const router = useRouter();
  const { user, loading: authLoading, init } = useAuthStore();

  const [datos, setDatos] = useState<Datos | null>(null);
  const [admin, setAdmin] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<"direccion" | "pago" | "cancelar" | null>(null);
  const [direccion, setDireccion] = useState<DatosDireccion>(DIRECCION_VACIA);
  const [historial, setHistorial] = useState<"envios" | "cobros">("envios");

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/acceso");
  }, [authLoading, user, router]);

  const recargar = useCallback(async () => {
    const r = await llamarApi<Datos>("/api/suscripciones/mia");
    if (r.ok) setDatos(r.data);
    else setError(es ? "No pudimos cargar tu suscripción." : "We couldn't load your subscription.");
  }, [es]);

  useEffect(() => {
    if (!user) return;
    void recargar();
    // El rol lo contesta Postgres (es_equipo), no el navegador.
    esEquipo().then(setAdmin).catch(() => setAdmin(false));
  }, [user?.id, recargar]);

  /** Ejecuta una acción, muestra el resultado y recarga. */
  const accion = useCallback(
    async (ruta: string, cuerpo: Record<string, unknown>, ok: string): Promise<boolean> => {
      const s = datos?.suscripcion;
      if (!s) return false;
      setTrabajando(true);
      setError("");
      setMensaje("");
      const r = await llamarApi<{ cobro?: string | null }>(`/api/suscripciones/${s.id}/${ruta}`, { body: cuerpo });
      setTrabajando(false);

      if (!r.ok) {
        setError(
          r.error === "cobro_en_curso"
            ? es ? "Hay un cobro en proceso. Intenta en unos minutos." : "A charge is in progress. Try again in a few minutes."
            : r.error === "medio_de_pago_rechazado"
              ? es ? "Wompi no aceptó ese medio de pago." : "Wompi didn't accept that payment method."
              : r.mensaje ?? (es ? "No se pudo. Intenta de nuevo." : "That didn't work. Try again.")
        );
        return false;
      }

      const cobro = r.data.cobro;
      setMensaje(
        cobro === "DECLINED" || cobro === "ERROR"
          ? es ? "El medio de pago quedó guardado, pero el banco no aprobó el cobro." : "The payment method was saved, but the bank declined the charge."
          : cobro === "APPROVED"
            ? es ? "Pago aprobado. Tu suscripción está activa." : "Payment approved. Your subscription is active."
            : ok
      );
      setPanel(null);
      await recargar();
      return true;
    },
    [datos?.suscripcion, es, recargar]
  );

  if (authLoading || (user && !datos && !error)) {
    return (
      <div className="bg-fondo min-h-[60vh] flex items-center justify-center">
        <p className="font-body text-tinta-suave text-base">{es ? "Cargando…" : "Loading…"}</p>
      </div>
    );
  }
  if (!user) return null;

  const nombre = user.nombre ? user.nombre.split(" ")[0] : "";
  const saludo = nombre ? (es ? `Hola, ${nombre}` : `Hi, ${nombre}`) : es ? "Tu cuenta" : "Your account";
  const s = datos?.suscripcion ?? null;

  const bannerAdmin = admin && (
    <Link href="/admin" className="block rounded-card border border-dorado/50 bg-arena p-4 mb-6 hover:border-vino transition-colors">
      <span className="font-mono text-[10px] tracking-[.18em] text-dorado uppercase block">{es ? "Equipo" : "Team"}</span>
      <span className="font-body font-700 text-tinta">{es ? "Ir al panel de administración →" : "Go to the admin panel →"}</span>
    </Link>
  );

  if (!s || s.estado === "cancelada") {
    return (
      <div className="bg-fondo min-h-[60vh] py-14 px-[22px]">
        <div className="max-w-[460px] mx-auto text-center">
          {bannerAdmin}
          <h1 className="font-display font-bold text-tinta text-3xl mb-3">{saludo}</h1>
          {mensaje && <p className="font-body text-verde text-sm mb-4" role="status">{mensaje}</p>}
          <p className="font-body text-tinta-suave text-base mb-6">
            {s
              ? es ? "Tu suscripción está cancelada. Cuando quieras, vuelves a empezar." : "Your subscription is cancelled. Start again whenever you like."
              : es ? "Todavía no tienes suscripción." : "You don't have a subscription yet."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/quiz" className="bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3 rounded-btn shadow-cta">
              {es ? "Encontrar mi plan" : "Find my plan"}
            </Link>
            <Link href="/suscripcion" className={BOTON}>{es ? "Ver los planes" : "See the plans"}</Link>
          </div>
          {s && datos && datos.envios.some((e) => e.estado === "programado") && (
            <p className="font-body text-tinta-suave text-sm mt-6">
              {es ? "Los envíos que ya pagaste te llegan igual." : "Shipments you already paid for will still arrive."}
            </p>
          )}
        </div>
      </div>
    );
  }

  const d = datos!;
  const acciones = accionesDisponibles(s, d.cobroEnCurso);
  const plan = catalogo.planes.find((p) => p.id === s.planId);
  const frecuencia = catalogo.frecuencias.find((f) => f.id === s.frecuenciaId);
  const racha = progresoRegalo(s, catalogo.reglas);
  const enPrepago = s.enviosPrepagadosRestantes > 0;
  const pendientes = s.cambiosPendientes;
  const [estadoEs, estadoEn, estadoClase] = ESTADOS[s.estado];
  const prepago = catalogo.prepagos.find((p) => p.id === s.prepagoId);
  // Lo que se cobraría hoy si paga lo pendiente: se muestra antes del botón.
  const porCobrar = plan && frecuencia && prepago ? montoCobro(plan, frecuencia, prepago, catalogo.reglas) : null;

  const cambiar = (clave: string, id: string, lista: { id: string; label_es: string; label_en: string }[]) =>
    accion("cambiar", { [clave]: id }, es
      ? enPrepago && ["planId", "frecuenciaId", "prepagoId"].includes(clave)
        ? `Guardado. ${etiqueta(lista, id, true)} entra cuando se renueve tu prepago.`
        : `Listo: ${etiqueta(lista, id, true)} desde el próximo envío.`
      : enPrepago && ["planId", "frecuenciaId", "prepagoId"].includes(clave)
        ? `Saved. ${etiqueta(lista, id, false)} starts when your prepayment renews.`
        : `Done: ${etiqueta(lista, id, false)} from the next shipment.`);

  const selector = (
    titulo: string,
    clave: "planId" | "frecuenciaId" | "moliendaId" | "perfilId" | "prepagoId",
    lista: { id: string; label_es: string; label_en: string }[],
    actual: string
  ) => {
    const pendiente = (pendientes as Record<string, string | undefined>)[clave];
    return (
      <div>
        <p className="font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase mb-2">{titulo}</p>
        <div role="radiogroup" aria-label={titulo} className="flex flex-wrap gap-2">
          {lista.map((o) => {
            const activo = o.id === actual;
            const esPendiente = o.id === pendiente;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={activo}
                disabled={trabajando || activo || !acciones.cambiar}
                onClick={() => cambiar(clave, o.id, lista)}
                className={`font-body font-600 text-sm px-4 py-2 rounded-pill border transition-colors disabled:cursor-default ${
                  activo
                    ? "bg-vino text-crema-papel border-vino"
                    : esPendiente
                      ? "bg-white text-vino border-vino border-dashed"
                      : "bg-white text-tinta-cafe border-borde hover:border-vino"
                }`}
              >
                {es ? o.label_es : o.label_en}
                {esPendiente && <span className="font-mono text-[9px] ml-1">{es ? "(al renovar)" : "(on renewal)"}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  function guardarPago(pago: PagoTokenizado) {
    return accion("metodo-pago", { pago }, es ? `Medio de pago actualizado: ${pago.resumen}.` : `Payment method updated: ${pago.resumen}.`).then(() => undefined);
  }

  const metodoTexto = d.metodoPago
    ? d.metodoPago.tipo === "NEQUI"
      ? `Nequi ${d.metodoPago.telefono}`
      : `${d.metodoPago.marca} ···· ${d.metodoPago.ultimos4}`
    : es ? "Sin medio de pago" : "No payment method";

  return (
    <div className="bg-fondo min-h-screen py-10">
      <div className="max-w-[760px] mx-auto px-[22px]">
        {bannerAdmin}

        <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">{es ? "TU SUSCRIPCIÓN" : "YOUR SUBSCRIPTION"}</p>
        <h1 className="font-display font-bold text-tinta text-3xl mb-6">{saludo}</h1>

        <div aria-live="polite">
          {mensaje && <p className="font-body text-verde text-sm mb-5" role="status">{mensaje}</p>}
          {error && <p className="font-body text-vino text-sm mb-5" role="alert">{error}</p>}
        </div>

        {/* Pago pendiente: lo primero que se ve */}
        {s.estado === "pago_pendiente" && (
          <section className="rounded-card-lg border-2 border-naranja bg-white p-6 mb-4">
            <h2 className="font-display font-bold text-tinta text-xl mb-1">
              {d.cobroEnCurso ? (es ? "Estamos procesando tu pago" : "We're processing your payment") : es ? "Falta el pago" : "Payment needed"}
            </h2>
            <p className="font-body text-tinta-suave text-sm mb-4">
              {d.cobroEnCurso
                ? es ? "Te avisamos aquí en cuanto Wompi responda." : "We'll show it here as soon as Wompi responds."
                : !d.metodoPago
                  ? es ? "Para seguir recibiendo café, registra una tarjeta o Nequi. Se cobra el envío pendiente en ese momento." : "To keep receiving coffee, add a card or Nequi. The pending shipment is charged right away."
                  : s.proximoReintento
                    ? es ? `El último cobro no pasó. Lo intentamos otra vez el ${formatFecha(s.proximoReintento, true)}, o puedes pagar ya.` : `The last charge didn't go through. We'll retry on ${formatFecha(s.proximoReintento, false)}, or you can pay now.`
                    : es ? "El último cobro no pasó. Puedes intentarlo de nuevo o cambiar el medio de pago." : "The last charge didn't go through. Retry or change the payment method."}
            </p>
            {!d.cobroEnCurso && porCobrar && (
              <p className="font-body text-tinta text-sm mb-4">
                {es
                  ? `Se cobran ${formatCOP(porCobrar.total)} ${porCobrar.envios > 1 ? `por ${porCobrar.envios} envíos (${etiqueta(catalogo.prepagos, s.prepagoId, true)}). Si prefieres pagar envío por envío, cámbialo abajo en «Forma de pago» antes de pagar.` : "por el próximo envío."}`
                  : `You'll be charged ${formatCOP(porCobrar.total)} ${porCobrar.envios > 1 ? `for ${porCobrar.envios} shipments (${etiqueta(catalogo.prepagos, s.prepagoId, false)}). To pay per shipment instead, change it below under “Payment term” first.` : "for the next shipment."}`}
              </p>
            )}
            {!d.cobroEnCurso && (
              <div className="flex flex-wrap gap-3">
                {d.metodoPago && (
                  <button type="button" disabled={trabajando} className={BOTON_PRIMARIO}
                    onClick={() => accion("reintentar", {}, es ? "Listo." : "Done.")}>
                    {trabajando ? (es ? "Cobrando…" : "Charging…") : es ? `Pagar con ${metodoTexto}` : `Pay with ${metodoTexto}`}
                  </button>
                )}
                <button type="button" className={BOTON} onClick={() => setPanel(panel === "pago" ? null : "pago")}>
                  {d.metodoPago ? (es ? "Usar otro medio de pago" : "Use another method") : es ? "Registrar medio de pago" : "Add payment method"}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Resumen */}
        <section className="rounded-card-lg border border-borde bg-white p-6 mb-4">
          <div className="flex items-baseline justify-between gap-3 mb-5">
            <h2 className="font-display font-bold text-tinta text-2xl">
              {plan ? (es ? plan.label_es : plan.label_en) : s.planId}
            </h2>
            <span className={`font-mono text-[10px] tracking-[.15em] uppercase px-2.5 py-1 rounded-pill ${estadoClase}`}>
              {es ? estadoEs : estadoEn}
            </span>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-borde pt-5">
            {s.estado === "pausada" ? (
              <Dato k={es ? "Vuelve el" : "Resumes on"} v={formatFecha(s.pausadaHasta, es)} />
            ) : (
              <Dato k={es ? "Próximo envío" : "Next shipment"} v={formatFecha(s.proximoEnvio, es)} />
            )}
            {s.estado === "activa" && (
              <Dato
                k={es ? "Próximo cobro" : "Next charge"}
                v={enPrepago ? (es ? "Prepagado" : "Prepaid") : formatFecha(fechaCobro(s, catalogo.reglas), es)}
              />
            )}
            <Dato k={es ? "Cada cuánto" : "How often"} v={etiqueta(catalogo.frecuencias, s.frecuenciaId, es)} />
            <Dato k={es ? "Molienda" : "Grind"} v={etiqueta(catalogo.moliendas, s.moliendaId, es)} />
            <Dato k={es ? "Perfil" : "Profile"} v={etiqueta(catalogo.perfiles, s.perfilId, es)} />
            {plan && frecuencia && (
              <Dato k={es ? "Por envío" : "Per shipment"} v={`${formatCOP(plan.precioEnvioCop)} · ≈${formatCOP(costoMensual(plan, frecuencia, catalogo.reglas))}${es ? "/mes" : "/mo"}`} />
            )}
            {enPrepago && <Dato k={es ? "Envíos prepagados" : "Prepaid shipments"} v={String(s.enviosPrepagadosRestantes)} />}
          </dl>
        </section>

        {/* Un clic */}
        {(acciones.saltar || acciones.pausar || acciones.reanudar) && (
          <section className="rounded-card-lg border border-borde bg-white p-6 mb-4">
            <h2 className="font-display font-bold text-tinta text-xl mb-4">{es ? "Con un clic" : "One click"}</h2>
            <div className="flex flex-wrap gap-3">
              {acciones.saltar && (
                <button type="button" disabled={trabajando} className={BOTON}
                  onClick={() => accion("saltar", {}, es ? `Saltado. El envío del ${formatFecha(s.proximoEnvio, true)} no sale ni se cobra.` : `Skipped. The ${formatFecha(s.proximoEnvio, false)} shipment won't ship or be charged.`)}>
                  {es ? `Saltar el envío del ${formatFecha(s.proximoEnvio, true)}` : `Skip the ${formatFecha(s.proximoEnvio, false)} shipment`}
                </button>
              )}
              {acciones.pausar && catalogo.reglas.mesesPausa.map((m) => (
                <button key={m} type="button" disabled={trabajando} className={BOTON}
                  onClick={() => accion("pausar", { meses: m }, es ? `En pausa ${m === 1 ? "un mes" : `${m} meses`}. Vuelve sola.` : `Paused for ${m} month${m > 1 ? "s" : ""}. It resumes on its own.`)}>
                  {es ? `Pausar ${m === 1 ? "1 mes" : `${m} meses`}` : `Pause ${m} month${m > 1 ? "s" : ""}`}
                </button>
              ))}
              {acciones.reanudar && (
                <button type="button" disabled={trabajando} className={BOTON_PRIMARIO}
                  onClick={() => accion("reanudar", {}, es ? "Reanudada." : "Resumed.")}>
                  {es ? "Reanudar ahora" : "Resume now"}
                </button>
              )}
            </div>
            {d.cobroEnCurso && s.estado === "activa" && (
              <p className="font-body text-tinta-suave text-xs mt-3">
                {es ? "El próximo envío se está cobrando. Podrás saltar o pausar el siguiente cuando termine." : "The next shipment is being charged. You can skip or pause the one after once it's done."}
              </p>
            )}
          </section>
        )}

        {/* Cambiar */}
        {acciones.cambiar && (
          <section className="rounded-card-lg border border-borde bg-white p-6 mb-4">
            <h2 className="font-display font-bold text-tinta text-xl mb-1">{es ? "Cambiar" : "Change"}</h2>
            <p className="font-body text-tinta-suave text-sm mb-5">
              {enPrepago
                ? es ? "Molienda y perfil entran en el próximo envío. Plan, frecuencia y forma de pago, cuando se renueve tu prepago." : "Grind and profile apply to the next shipment. Plan, frequency and payment term, when your prepayment renews."
                : es ? "Entra desde el próximo envío que no se haya cobrado." : "Applies from the next shipment not yet charged."}
            </p>
            <div className="space-y-5">
              {selector(es ? "Plan" : "Plan", "planId", catalogo.planes, s.planId)}
              {selector(es ? "Cada cuánto" : "How often", "frecuenciaId", catalogo.frecuencias, s.frecuenciaId)}
              {selector(es ? "Molienda" : "Grind", "moliendaId", catalogo.moliendas, s.moliendaId)}
              {selector(es ? "Perfil" : "Profile", "perfilId", catalogo.perfiles, s.perfilId)}
              {selector(es ? "Forma de pago" : "Payment term", "prepagoId", catalogo.prepagos, s.prepagoId)}
            </div>
          </section>
        )}

        {/* Dirección y medio de pago */}
        <section className="rounded-card-lg border border-borde bg-white p-6 mb-4 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase mb-1">{es ? "Envío a" : "Shipping to"}</p>
            {d.direccion ? (
              <>
                <p className="font-body text-tinta text-sm">{d.direccion.nombre} · {d.direccion.telefono}</p>
                <p className="font-body text-tinta-suave text-sm">{d.direccion.linea}, {d.direccion.ciudad}</p>
              </>
            ) : (
              <p className="font-body text-tinta-suave text-sm">—</p>
            )}
            <button type="button" className="font-body text-sm text-vino underline mt-2"
              onClick={() => {
                setDireccion({ ...DIRECCION_VACIA, ...(d.direccion ?? {}) });
                setPanel(panel === "direccion" ? null : "direccion");
              }}>
              {es ? "Cambiar dirección" : "Change address"}
            </button>
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase mb-1">{es ? "Medio de pago" : "Payment method"}</p>
            <p className="font-body text-tinta text-sm">{metodoTexto}</p>
            <button type="button" className="font-body text-sm text-vino underline mt-2" onClick={() => setPanel(panel === "pago" ? null : "pago")}>
              {es ? "Cambiar medio de pago" : "Change payment method"}
            </button>
          </div>
        </section>

        {panel === "direccion" && (
          <section className="rounded-card-lg border border-vino/40 bg-white p-6 mb-4">
            <h2 className="font-display font-bold text-tinta text-xl mb-4">{es ? "Nueva dirección" : "New address"}</h2>
            <CamposDireccion es={es} direccion={direccion} onCambio={setDireccion} prefijo="cu" />
            <div className="flex gap-3 mt-5">
              <button type="button" className={BOTON_PRIMARIO}
                disabled={trabajando || !direccion.nombre || !direccion.telefono || !direccion.linea || !direccion.ciudad || !direccion.departamento}
                onClick={() => accion("direccion", { direccion }, es ? "Dirección actualizada. Aplica desde el próximo envío." : "Address updated. It applies from the next shipment.")}>
                {es ? "Guardar dirección" : "Save address"}
              </button>
              <button type="button" className="font-body text-sm text-tinta-suave underline" onClick={() => setPanel(null)}>{es ? "Cancelar" : "Cancel"}</button>
            </div>
          </section>
        )}

        {panel === "pago" && (
          <section className="rounded-card-lg border border-vino/40 bg-white p-6 mb-4">
            <h2 className="font-display font-bold text-tinta text-xl mb-4">{es ? "Nuevo medio de pago" : "New payment method"}</h2>
            <MetodoPagoForm es={es} ocupado={trabajando} onListo={guardarPago}
              textoBoton={s.estado === "pago_pendiente" ? (es ? "Guardar y pagar" : "Save and pay") : es ? "Guardar medio de pago" : "Save payment method"} />
          </section>
        )}

        {/* Regalo */}
        {racha.meta > 0 && (
          <section className="rounded-card-lg border border-borde bg-white p-6 mb-4">
            <h2 className="font-display font-bold text-tinta text-xl mb-1">{es ? "Bolsa de regalo" : "Free bag"}</h2>
            <p className="font-body text-tinta-suave text-sm mb-3">
              {es ? `Te faltan ${racha.faltan} envíos para la bolsa de regalo.` : `${racha.faltan} more shipments to your free bag.`}
            </p>
            <div className="h-2.5 rounded-pill bg-arena overflow-hidden" role="progressbar" aria-valuenow={racha.hechos} aria-valuemin={0} aria-valuemax={racha.meta} aria-label={es ? "Avance a la bolsa de regalo" : "Progress to the free bag"}>
              <div className="h-full bg-verde rounded-pill origin-left transition-transform duration-700 ease-out" style={{ transform: `scaleX(${racha.pct / 100})`, width: "100%" }} />
            </div>
          </section>
        )}

        {/* Historial */}
        <section className="rounded-card-lg border border-borde bg-white p-6 mb-4">
          <div role="tablist" aria-label={es ? "Historial" : "History"} className="flex gap-4 mb-4 border-b border-borde">
            {(["envios", "cobros"] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={historial === t} onClick={() => setHistorial(t)}
                className={`font-body font-700 text-sm pb-2 -mb-px border-b-2 ${historial === t ? "border-vino text-tinta" : "border-transparent text-tinta-suave"}`}>
                {t === "envios" ? (es ? "Pedidos" : "Orders") : es ? "Cobros" : "Charges"}
              </button>
            ))}
          </div>

          {historial === "envios" ? (
            d.envios.length === 0 ? (
              <p className="font-body text-tinta-suave text-sm">{es ? "Todavía no hay envíos." : "No shipments yet."}</p>
            ) : (
              <ol className="divide-y divide-borde">
                {d.envios.map((e) => (
                  <li key={e.id} className="py-3 flex items-baseline justify-between gap-4">
                    <div>
                      <p className="font-body font-600 text-tinta text-sm">
                        {e.estado === "saltado"
                          ? es ? "Envío saltado" : "Skipped shipment"
                          : `${etiqueta(catalogo.planes, e.planId, es)} · ${e.bolsas} ${e.bolsas === 1 ? (es ? "bolsa" : "bag") : es ? "bolsas" : "bags"}`}
                        {e.regalo && <span className="font-mono text-[10px] text-verde ml-2">{es ? "con regalo" : "with gift"}</span>}
                      </p>
                      <p className="font-mono text-[11px] text-tinta-suave">
                        {formatFecha(e.fechaProgramada, es)}
                        {e.estado !== "saltado" && ` · ${etiqueta(catalogo.moliendas, e.molienda, es)}`}
                        {e.origen === "prepago" && ` · ${es ? "prepagado" : "prepaid"}`}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] tracking-[.12em] uppercase text-tinta-suave shrink-0">
                      {e.estado === "enviado" ? (es ? "Enviado" : "Shipped") : e.estado === "saltado" ? "—" : es ? "Programado" : "Scheduled"}
                    </span>
                  </li>
                ))}
              </ol>
            )
          ) : d.cobros.length === 0 ? (
            <p className="font-body text-tinta-suave text-sm">{es ? "Todavía no hay cobros." : "No charges yet."}</p>
          ) : (
            <ol className="divide-y divide-borde">
              {d.cobros.map((c) => (
                <li key={c.id} className="py-3 flex items-baseline justify-between gap-4">
                  <div>
                    <p className="font-body font-600 text-tinta text-sm">
                      {formatCOP(c.montoCop)}
                      {c.enviosCubiertos > 1 && <span className="font-body font-400 text-tinta-suave"> · {c.enviosCubiertos} {es ? "envíos" : "shipments"}</span>}
                    </p>
                    <p className="font-mono text-[11px] text-tinta-suave">{formatFecha(c.creadoEn, es)} · {c.referencia}</p>
                  </div>
                  <span className={`font-mono text-[10px] tracking-[.12em] uppercase shrink-0 ${c.estado === "APPROVED" ? "text-verde" : c.estado === "PENDING" || c.estado === "CREANDO" ? "text-tinta-suave" : "text-vino"}`}>
                    {es ? ESTADO_COBRO[c.estado][0] : ESTADO_COBRO[c.estado][1]}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Cancelar */}
        {panel === "cancelar" ? (
          <CancelarFlujo es={es} suscripcion={s} catalogo={catalogo} accion={accion} onCerrar={() => setPanel(null)} />
        ) : (
          acciones.cancelar && (
            <button type="button" onClick={() => setPanel("cancelar")} className="font-body text-sm text-tinta-suave hover:text-vino underline">
              {es ? "Cancelar suscripción" : "Cancel subscription"}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-mono text-[9px] tracking-[.18em] text-tinta-suave uppercase mb-0.5">{k}</dt>
      <dd className="font-body font-600 text-tinta text-sm">{v}</dd>
    </div>
  );
}

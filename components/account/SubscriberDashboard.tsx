"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth-store";
import {
  guardarSuscripcion, obtenerEnvios, obtenerSuscripcion,
} from "@/lib/suscripcion-db";
import {
  findFrecuencia, findNivel, frecuencias, metodosPreparacion, moliendas,
  niveles, suscripcionConfig,
} from "@/lib/content";
import {
  accionesDisponibles, cambiarFrecuencia, cambiarNivel, cambiarPreferencias,
  cancelar, pausar, progresoRegalo, proximoCobro, reanudar, saltarEnvio,
  tazasAcompanadas,
} from "@/lib/suscripcion";
import { formatCOP } from "@/lib/format";
import type { EnvioSuscripcion, Locale, Suscripcion } from "@/lib/types";

type Accion = "pausar" | "saltar" | "cancelar";
type Panel = "plan" | "prefs" | null;

// Pausar, saltar y cancelar: botón y confirmación. Dos clics, y se acabó.
// No hay pantalla de retención, ni oferta de último minuto, ni encuesta.
export default function SubscriberDashboard({ locale }: { locale: Locale }) {
  const t = useTranslations("account");
  const es = locale !== "en";
  const router = useRouter();
  const { user, loading: authLoading, init } = useAuthStore();

  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);
  const [envios, setEnvios] = useState<EnvioSuscripcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [confirmando, setConfirmando] = useState<Accion | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/acceso");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    obtenerSuscripcion(user.id)
      .then(async (s) => {
        setSuscripcion(s);
        if (s) setEnvios(await obtenerEnvios(s.id).catch(() => []));
      })
      .catch(() => setError(t("error")))
      .finally(() => setCargando(false));
  }, [user?.id, t]);

  const aplicar = useCallback(
    async (siguiente: Suscripcion, texto: string) => {
      setGuardando(true);
      setError("");
      try {
        await guardarSuscripcion(siguiente);
        setSuscripcion(siguiente);
        setMensaje(texto);
        setConfirmando(null);
        setPanel(null);
      } catch {
        setError(t("error"));
      } finally {
        setGuardando(false);
      }
    },
    [t]
  );

  if (authLoading || cargando) {
    return (
      <div className="bg-fondo min-h-[60vh] flex items-center justify-center">
        <p className="font-body text-tinta-suave text-base">{t("loading")}</p>
      </div>
    );
  }

  if (!user) return null;

  const nombre = user.nombre ? user.nombre.split(" ")[0] : "";

  if (!suscripcion) {
    return (
      <div className="bg-fondo min-h-[60vh] flex items-center justify-center px-[22px]">
        <div className="text-center max-w-[420px]">
          <h1 className="font-display font-bold text-tinta text-3xl mb-3">
            {nombre ? t("greeting", { name: nombre }) : t("greetingSinNombre")}
          </h1>
          <p className="font-body text-tinta-suave text-base mb-6">{t("sinSuscripcion")}</p>
          <Link
            href="/suscripcion"
            className="inline-block bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5"
          >
            {t("sinSuscripcionCta")}
          </Link>
        </div>
      </div>
    );
  }

  const nivel = findNivel(suscripcion.nivelId) ?? niveles[0];
  const frecuencia = findFrecuencia(suscripcion.frecuenciaId) ?? frecuencias[0];
  const acciones = accionesDisponibles(suscripcion);
  const racha = progresoRegalo(suscripcion, suscripcionConfig);
  const tazas = tazasAcompanadas(suscripcion, nivel, suscripcionConfig);

  const etiquetaEstado = {
    activa: t("estadoActiva"),
    pausada: t("estadoPausada"),
    pendiente: t("estadoPendiente"),
    cancelada: t("estadoCancelada"),
  }[suscripcion.estado];

  const nombreDe = (
    lista: readonly { id: string; label_es: string; label_en: string }[],
    id: string
  ) => {
    const o = lista.find((x) => x.id === id);
    return o ? (es ? o.label_es : o.label_en) : id;
  };

  function confirmar(accion: Accion) {
    if (!suscripcion) return;
    if (accion === "pausar") {
      aplicar(pausar(suscripcion), t("hechoPausada"));
    } else if (accion === "saltar") {
      const siguiente = saltarEnvio(suscripcion, frecuencia);
      aplicar(siguiente, t("hechoSaltada", { fecha: siguiente.proximoEnvio }));
    } else {
      aplicar(cancelar(suscripcion), t("hechoCancelada"));
    }
  }

  function alReanudar() {
    if (!suscripcion) return;
    const siguiente = reanudar(suscripcion, suscripcionConfig);
    aplicar(siguiente, t("hechoReanudada", { fecha: siguiente.proximoEnvio }));
  }

  const botonPrimario =
    "font-body font-700 text-sm px-4 py-2.5 rounded-btn transition-all duration-150 bg-vino hover:bg-vino-800 text-crema-papel disabled:opacity-60 active:scale-[.98]";
  const botonSecundario =
    "font-body font-700 text-sm px-4 py-2.5 rounded-btn border border-borde-2 text-tinta-cafe hover:border-vino hover:text-vino transition-colors disabled:opacity-60";

  return (
    <div className="bg-fondo min-h-screen py-10">
      <div className="max-w-[760px] mx-auto px-[22px]">
        <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">
          {t("kicker")}
        </p>
        <h1 className="font-display font-bold text-tinta text-3xl mb-8">
          {nombre ? t("greeting", { name: nombre }) : t("greetingSinNombre")}
        </h1>

        {mensaje && (
          <p className="font-body text-verde text-sm mb-5" role="status">{mensaje}</p>
        )}
        {error && (
          <p className="font-body text-vino text-sm mb-5" role="alert">{error}</p>
        )}

        {/* Cuándo pasa qué */}
        <section className="rounded-card-lg border border-borde bg-white p-6 mb-4">
          <div className="flex items-baseline justify-between gap-3 mb-5">
            <h2 className="font-display font-bold text-tinta text-2xl">
              {es ? nivel.label_es : nivel.label_en}
            </h2>
            <span className="font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase">
              {etiquetaEstado}
            </span>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-borde pt-5">
            <Dato k={t("proximoCobro")} v={proximoCobro(suscripcionConfig)} />
            <Dato k={t("proximoDespacho")} v={suscripcion.proximoEnvio} />
            <Dato k={t("planActual")} v={es ? frecuencia.label_es : frecuencia.label_en} />
            <Dato k={t("planLabel")} v={formatCOP(nivel.precioCop)} />
            <Dato k={t("moliendaLabel")} v={nombreDe(moliendas, suscripcion.molienda)} />
            <Dato k={t("metodoLabel")} v={nombreDe(metodosPreparacion, suscripcion.metodo)} />
          </dl>

          {acciones.cambiar && (
            <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-borde">
              <button
                onClick={() => setPanel(panel === "plan" ? null : "plan")}
                aria-expanded={panel === "plan"}
                className={botonSecundario}
              >
                {t("accionCambiarPlan")}
              </button>
              <button
                onClick={() => setPanel(panel === "prefs" ? null : "prefs")}
                aria-expanded={panel === "prefs"}
                className={botonSecundario}
              >
                {t("accionCambiarPrefs")}
              </button>
            </div>
          )}

          {panel === "plan" && (
            <div className="mt-5 grid gap-2">
              {niveles.map((n) => (
                <button
                  key={n.id}
                  disabled={guardando}
                  onClick={() =>
                    aplicar(
                      cambiarNivel(suscripcion, n),
                      t("hechoPlanCambiado", { plan: es ? n.label_es : n.label_en })
                    )
                  }
                  className={`text-left rounded-card border p-4 transition-colors ${
                    n.id === nivel.id
                      ? "border-vino ring-1 ring-vino"
                      : "border-borde hover:border-vino"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-display font-bold text-tinta text-lg">
                      {es ? n.label_es : n.label_en}
                    </span>
                    <span className="font-display font-bold text-vino">
                      {formatCOP(n.precioCop)}
                    </span>
                  </span>
                </button>
              ))}

              <p className="font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase mt-3 mb-1">
                {t("planActual")}
              </p>
              <div className="flex flex-wrap gap-2">
                {frecuencias.map((f) => (
                  <button
                    key={f.id}
                    disabled={guardando}
                    onClick={() =>
                      aplicar(
                        cambiarFrecuencia(suscripcion, f),
                        t("hechoPrefsCambiadas")
                      )
                    }
                    className={`font-body font-600 text-sm px-4 py-2 rounded-pill border transition-colors ${
                      f.id === frecuencia.id
                        ? "bg-vino text-crema-papel border-vino"
                        : "bg-white text-tinta-cafe border-borde hover:border-vino"
                    }`}
                  >
                    {es ? f.label_es : f.label_en}
                  </button>
                ))}
              </div>
            </div>
          )}

          {panel === "prefs" && (
            <div className="mt-5 space-y-4">
              <Selector
                titulo={t("moliendaLabel")}
                opciones={moliendas}
                valor={suscripcion.molienda}
                es={es}
                deshabilitado={guardando}
                onElegir={(id) =>
                  aplicar(
                    cambiarPreferencias(suscripcion, { molienda: id }),
                    t("hechoPrefsCambiadas")
                  )
                }
              />
              <Selector
                titulo={t("metodoLabel")}
                opciones={metodosPreparacion}
                valor={suscripcion.metodo}
                es={es}
                deshabilitado={guardando}
                onElegir={(id) =>
                  aplicar(
                    cambiarPreferencias(suscripcion, { metodo: id }),
                    t("hechoPrefsCambiadas")
                  )
                }
              />
            </div>
          )}
        </section>

        {/* Racha */}
        <section className="rounded-card-lg border border-borde bg-white p-6 mb-4">
          <h2 className="font-display font-bold text-tinta text-xl mb-1">
            {t("rachaTitulo")}
          </h2>
          <p className="font-body text-tinta-suave text-sm mb-4">
            {racha.ganado
              ? t("rachaGanada")
              : t("rachaFaltan", { faltan: racha.faltan })}
          </p>

          <div
            className="h-2.5 rounded-pill bg-arena overflow-hidden mb-2"
            role="progressbar"
            aria-valuenow={racha.enviosHechos % racha.meta || (racha.ganado ? racha.meta : 0)}
            aria-valuemin={0}
            aria-valuemax={racha.meta}
            aria-label={t("rachaTitulo")}
          >
            {/* Solo transform: la barra se compone sin repintar. */}
            <div
              className="h-full bg-verde rounded-pill origin-left transition-transform duration-700 ease-out"
              style={{ transform: `scaleX(${racha.pct / 100})`, width: "100%" }}
            />
          </div>

          <p className="font-mono text-[11px] text-tinta-suave">
            {t("rachaCuenta", {
              hechos: racha.ganado ? racha.meta : racha.enviosHechos % racha.meta,
              meta: racha.meta,
            })}
          </p>

          {tazas > 0 && (
            <p className="font-body text-tinta-suave text-sm mt-4 pt-4 border-t border-borde">
              {t("tazasLabel")}: <span className="font-600 text-tinta">{tazas}</span>
            </p>
          )}
        </section>

        {/* Historial */}
        <section className="rounded-card-lg border border-borde bg-white p-6 mb-4">
          <h2 className="font-display font-bold text-tinta text-xl mb-4">
            {t("historialTitulo")}
          </h2>

          {envios.length === 0 ? (
            <p className="font-body text-tinta-suave text-sm">
              {t("historialVacio", { fecha: suscripcion.proximoEnvio })}
            </p>
          ) : (
            <ol className="divide-y divide-borde">
              {envios.map((envio) => (
                <li key={envio.id} className="py-3 flex items-baseline justify-between gap-4">
                  <div>
                    <p className="font-body font-600 text-tinta text-sm">
                      {envio.cafe || (es ? nivel.label_es : nivel.label_en)}
                      {envio.regalo && (
                        <span className="font-mono text-[10px] text-verde ml-2">
                          {t("historialRegalo")}
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[11px] text-tinta-suave">
                      {envio.fechaProgramada}
                    </p>
                  </div>
                  <span className="font-body text-tinta-suave text-sm shrink-0">
                    {envio.totalCop > 0 ? formatCOP(envio.totalCop) : "—"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Pausar, saltar, cancelar */}
        <section className="rounded-card-lg border border-borde bg-white p-6">
          {confirmando ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-body text-tinta text-sm flex-1 min-w-[200px]">
                {confirmando === "pausar" && (es ? "¿Pausar la suscripción?" : "Pause the subscription?")}
                {confirmando === "saltar" && (es ? "¿Saltar el próximo envío?" : "Skip the next shipment?")}
                {confirmando === "cancelar" && (es ? "¿Cancelar la suscripción?" : "Cancel the subscription?")}
              </p>
              <button
                onClick={() => confirmar(confirmando)}
                disabled={guardando}
                className={botonPrimario}
              >
                {guardando
                  ? t("guardando")
                  : {
                      pausar: t("confirmarPausar"),
                      saltar: t("confirmarSaltar"),
                      cancelar: t("confirmarCancelar"),
                    }[confirmando]}
              </button>
              <button onClick={() => setConfirmando(null)} className={botonSecundario}>
                {t("volver")}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {acciones.saltar && (
                <button onClick={() => setConfirmando("saltar")} className={botonSecundario}>
                  {t("accionSaltar")}
                </button>
              )}
              {acciones.pausar && (
                <button onClick={() => setConfirmando("pausar")} className={botonSecundario}>
                  {t("accionPausar")}
                </button>
              )}
              {acciones.reanudar && (
                <button onClick={alReanudar} disabled={guardando} className={botonPrimario}>
                  {t("accionReanudar")}
                </button>
              )}
              {acciones.cancelar && (
                <button
                  onClick={() => setConfirmando("cancelar")}
                  className="font-body text-sm text-tinta-suave hover:text-vino underline transition-colors self-center"
                >
                  {t("accionCancelar")}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-mono text-[9px] tracking-[.18em] text-tinta-suave uppercase mb-0.5">
        {k}
      </dt>
      <dd className="font-body font-600 text-tinta text-sm">{v}</dd>
    </div>
  );
}

function Selector({
  titulo, opciones, valor, es, deshabilitado, onElegir,
}: {
  titulo: string;
  opciones: readonly { id: string; label_es: string; label_en: string }[];
  valor: string;
  es: boolean;
  deshabilitado: boolean;
  onElegir: (id: string) => void;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase mb-2">
        {titulo}
      </p>
      <div role="radiogroup" aria-label={titulo} className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={o.id === valor}
            disabled={deshabilitado}
            onClick={() => onElegir(o.id)}
            className={`font-body font-600 text-sm px-4 py-2 rounded-pill border transition-colors disabled:opacity-60 ${
              o.id === valor
                ? "bg-vino text-crema-papel border-vino"
                : "bg-white text-tinta-cafe border-borde hover:border-vino"
            }`}
          >
            {es ? o.label_es : o.label_en}
          </button>
        ))}
      </div>
    </div>
  );
}

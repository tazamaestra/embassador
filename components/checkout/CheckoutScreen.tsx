"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/lib/nav";
import { costoMensual, enviosDelPrepago, montoCobro, primerEnvio } from "@/lib/suscripcion";
import { etiqueta, formatCOP, formatFecha } from "@/lib/format";
import { llamarApi } from "@/lib/pago";
import { QUIZ_GUARDADO } from "@/lib/quiz";
import { useAuthStore } from "@/lib/auth-store";
import NumeroAnimado from "@/components/shared/NumeroAnimado";
import AuthPanel from "@/components/auth/AuthPanel";
import MetodoPagoForm, { type PagoTokenizado } from "@/components/pago/MetodoPagoForm";
import CamposDireccion, { DIRECCION_VACIA } from "@/components/shared/CamposDireccion";
import type { Catalogo, Locale, OpcionCatalogo, Plan } from "@/lib/types";

type PasoId = "plan" | "frecuencia" | "molienda" | "perfil" | "prepago" | "envio" | "pago";
const PASOS: PasoId[] = ["plan", "frecuencia", "molienda", "perfil", "prepago", "envio", "pago"];

// Entrar con Google saca del sitio y vuelve con la página recargada. Sin esto,
// el cliente perdería los pasos y tendría que rehacerlos. Se guarda en
// sessionStorage —no localStorage— para que no quede rondando después de
// cerrar la pestaña. Nunca se guarda nada del pago.
const BORRADOR = "tm-checkout";

interface Borrador {
  indice: number;
  planId: string;
  frecuenciaId: string;
  moliendaId: string;
  perfilId: string;
  prepagoId: string;
  direccion: typeof DIRECCION_VACIA;
}

function leerSesion<T>(clave: string): T | null {
  try {
    const crudo = window.sessionStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : null;
  } catch {
    return null;
  }
}

export default function CheckoutScreen({ locale, catalogo }: { locale: Locale; catalogo: Catalogo }) {
  const es = locale !== "en";
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading, init } = useAuthStore();
  const { planes, frecuencias, moliendas, perfiles, prepagos, reglas } = catalogo;

  // Lo que venga del quiz o de la tarjeta de un plan se respeta.
  const existe = (lista: { id: string }[], id: string | null) => (id && lista.some((x) => x.id === id) ? id : null);
  const planInicial = existe(planes, searchParams.get("plan")) ?? planes[0]?.id ?? "";
  const planBase = planes.find((p) => p.id === planInicial);

  // Del quiz llega todo elegido: no se le vuelve a preguntar, arranca en el
  // prepago. Puede volver atrás si quiere cambiar algo.
  const completoDelQuiz =
    Boolean(existe(planes, searchParams.get("plan"))) &&
    Boolean(existe(frecuencias, searchParams.get("frecuencia"))) &&
    Boolean(existe(moliendas, searchParams.get("molienda"))) &&
    Boolean(existe(perfiles, searchParams.get("perfil")));
  const [indice, setIndice] = useState(completoDelQuiz ? PASOS.indexOf("prepago") : 0);
  const [sentido, setSentido] = useState<"adelante" | "atras">("adelante");
  const [planId, setPlanId] = useState(planInicial);
  const [frecuenciaId, setFrecuenciaId] = useState(
    existe(frecuencias, searchParams.get("frecuencia")) ?? planBase?.frecuenciaDefectoId ?? frecuencias[0]?.id ?? ""
  );
  const [moliendaId, setMoliendaId] = useState(existe(moliendas, searchParams.get("molienda")) ?? moliendas[0]?.id ?? "");
  const [perfilId, setPerfilId] = useState(existe(perfiles, searchParams.get("perfil")) ?? perfiles[0]?.id ?? "");
  const [prepagoId, setPrepagoId] = useState(prepagos[0]?.id ?? "");
  const [direccion, setDireccion] = useState(DIRECCION_VACIA);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const tituloRef = useRef<HTMLHeadingElement>(null);
  const yaMontado = useRef(false);

  useEffect(() => {
    init();
  }, [init]);

  // Restaurar va en un efecto y no en el estado inicial: sessionStorage no
  // existe en el servidor, y leerlo durante el render rompería la hidratación.
  // Si llegó con parámetros del quiz, esos mandan sobre el borrador.
  useEffect(() => {
    const b = leerSesion<Partial<Borrador>>(BORRADOR);
    if (!b) return;
    const vieneDelQuiz = searchParams.has("plan");
    if (!vieneDelQuiz) {
      if (b.planId && existe(planes, b.planId)) setPlanId(b.planId);
      if (b.frecuenciaId && existe(frecuencias, b.frecuenciaId)) setFrecuenciaId(b.frecuenciaId);
      if (b.moliendaId && existe(moliendas, b.moliendaId)) setMoliendaId(b.moliendaId);
      if (b.perfilId && existe(perfiles, b.perfilId)) setPerfilId(b.perfilId);
      if (typeof b.indice === "number") setIndice(Math.min(Math.max(b.indice, 0), PASOS.length - 1));
    }
    if (b.prepagoId && existe(prepagos, b.prepagoId)) setPrepagoId(b.prepagoId);
    if (b.direccion) setDireccion({ ...DIRECCION_VACIA, ...b.direccion });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        BORRADOR,
        JSON.stringify({ indice, planId, frecuenciaId, moliendaId, perfilId, prepagoId, direccion } satisfies Borrador)
      );
    } catch {
      // Modo privado o almacenamiento lleno: se sigue sin borrador.
    }
  }, [indice, planId, frecuenciaId, moliendaId, perfilId, prepagoId, direccion]);

  // Al cambiar de paso el foco va al título: si no, el teclado se queda en un
  // botón que ya no existe y el lector de pantalla no anuncia nada.
  useEffect(() => {
    if (!yaMontado.current) {
      yaMontado.current = true;
      return;
    }
    tituloRef.current?.focus();
  }, [indice]);

  const plan = planes.find((p) => p.id === planId) ?? planes[0];
  const frecuencia = frecuencias.find((f) => f.id === frecuenciaId) ?? frecuencias[0];
  const prepago = prepagos.find((p) => p.id === prepagoId) ?? prepagos[0];

  if (!plan || !frecuencia || !prepago) {
    return (
      <div className="bg-fondo min-h-[60vh] flex items-center justify-center px-[22px]">
        <p className="font-body text-tinta-suave">
          {es ? "Los planes no están disponibles en este momento." : "Plans aren't available right now."}
        </p>
      </div>
    );
  }

  const cobro = montoCobro(plan, frecuencia, prepago, reglas);
  const pasoActual = PASOS[indice];
  const esUltimo = indice === PASOS.length - 1;

  const direccionCompleta = Boolean(
    direccion.nombre && direccion.telefono && direccion.linea && direccion.ciudad && direccion.departamento
  );

  function avanzar() {
    setSentido("adelante");
    setIndice((i) => Math.min(i + 1, PASOS.length - 1));
  }

  function retroceder() {
    setSentido("atras");
    setIndice((i) => Math.max(i - 1, 0));
  }

  async function pagar(pago: PagoTokenizado) {
    setError("");
    if (!direccionCompleta) {
      setError(es ? "Faltan datos de envío." : "Shipping details are missing.");
      return;
    }
    setEnviando(true);

    const r = await llamarApi<{ cobro: string }>("/api/suscripciones", {
      body: {
        planId, frecuenciaId, moliendaId, perfilId, prepagoId, direccion,
        quiz: leerSesion(QUIZ_GUARDADO) ?? undefined,
        pago: {
          tipo: pago.tipo, token: pago.token,
          acceptanceToken: pago.acceptanceToken, personalAuthToken: pago.personalAuthToken,
        },
      },
    });

    if (r.ok) {
      try {
        window.sessionStorage.removeItem(BORRADOR);
        window.sessionStorage.removeItem(QUIZ_GUARDADO);
      } catch {
        // Sin almacenamiento no hay nada que limpiar.
      }
      router.push("/confirmacion");
      return;
    }

    setEnviando(false);
    const mensajes: Record<string, [string, string]> = {
      sin_sesion: ["Entra con tu cuenta para suscribirte.", "Sign in to subscribe."],
      ya_suscrito: ["Ya tienes una suscripción. La gestionas desde tu cuenta.", "You already have a subscription. Manage it from your account."],
      medio_de_pago_rechazado: ["Wompi no aceptó ese medio de pago. Revisa los datos o prueba con otro.", "Wompi didn't accept that payment method. Check the details or try another."],
      wompi_sin_configurar: ["Los pagos todavía no están habilitados. Escríbenos y lo resolvemos.", "Payments aren't enabled yet. Write to us and we'll sort it out."],
    };
    const [msgEs, msgEn] = mensajes[r.error] ?? ["No se pudo crear la suscripción. Intenta de nuevo.", "Couldn't create the subscription. Try again."];
    setError(es ? msgEs : msgEn);
  }

  return (
    <div className="bg-fondo min-h-screen py-10">
      <div className="max-w-[640px] mx-auto px-[22px]">
        <Progreso total={PASOS.length} indice={indice} es={es} />

        <div key={pasoActual} className={sentido === "adelante" ? "tm-paso-adelante" : "tm-paso-atras"}>
          {pasoActual === "plan" && (
            <PasoPlan ref={tituloRef} es={es} catalogo={catalogo} valor={planId} onElegir={(id) => {
              setPlanId(id);
              const p = planes.find((x) => x.id === id);
              if (p?.frecuenciaDefectoId && !searchParams.has("frecuencia")) setFrecuenciaId(p.frecuenciaDefectoId);
            }} />
          )}

          {pasoActual === "frecuencia" && (
            <PasoOpciones
              ref={tituloRef}
              es={es}
              titulo={es ? "¿Cada cuánto?" : "How often?"}
              ayuda={es ? "Lo cambias cuando quieras desde tu cuenta." : "Change it anytime from your account."}
              opciones={frecuencias.map((f) => ({
                id: f.id, label_es: f.label_es, label_en: f.label_en,
                desc_es: `${formatCOP(costoMensual(plan, f, reglas))} al mes aprox.`,
                desc_en: `About ${formatCOP(costoMensual(plan, f, reglas))} a month`,
              }))}
              valor={frecuenciaId}
              onElegir={setFrecuenciaId}
            />
          )}

          {pasoActual === "molienda" && (
            <PasoOpciones
              ref={tituloRef}
              es={es}
              titulo={es ? "¿Cómo lo preparas?" : "How do you brew it?"}
              ayuda={es ? "Lo molemos para tu método el día del despacho. O en grano, si tienes molino." : "We grind for your method on shipping day. Or whole bean, if you have a grinder."}
              opciones={moliendas}
              valor={moliendaId}
              onElegir={setMoliendaId}
            />
          )}

          {pasoActual === "perfil" && (
            <PasoOpciones
              ref={tituloRef}
              es={es}
              titulo={es ? "¿Qué taza te gusta?" : "Which cup do you like?"}
              ayuda={es ? "Elegimos el lote de la finca que más se acerque." : "We pick the farm lot that comes closest."}
              opciones={perfiles}
              valor={perfilId}
              onElegir={setPerfilId}
            />
          )}

          {pasoActual === "prepago" && (
            <PasoPrepago ref={tituloRef} es={es} catalogo={catalogo} plan={plan} frecuenciaId={frecuencia.id} valor={prepagoId} onElegir={setPrepagoId} />
          )}

          {pasoActual === "envio" && (
            <PasoEnvio ref={tituloRef} es={es} direccion={direccion} onCambio={setDireccion} />
          )}

          {pasoActual === "pago" && (
            <>
              <Titulo innerRef={tituloRef}>{es ? "Revisa y paga" : "Review and pay"}</Titulo>

              <div className="rounded-card border border-borde bg-white p-6 mb-4">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5">
                  {[
                    [es ? "Plan" : "Plan", `${es ? plan.label_es : plan.label_en} · ${plan.bolsas} × ${plan.gramosBolsa} g`],
                    [es ? "Cada cuánto" : "How often", etiqueta(frecuencias, frecuenciaId, es)],
                    [es ? "Molienda" : "Grind", etiqueta(moliendas, moliendaId, es)],
                    [es ? "Perfil" : "Profile", etiqueta(perfiles, perfilId, es)],
                    [es ? "Pago" : "Payment", etiqueta(prepagos, prepagoId, es)],
                    [es ? "Primer envío" : "First shipment", formatFecha(primerEnvio(reglas), es)],
                  ].map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase self-center">{k}</dt>
                      <dd className="font-body font-600 text-tinta text-sm text-right">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="border-t border-borde pt-5 flex items-baseline justify-between">
                  <span className="font-body text-tinta text-base">
                    {cobro.envios > 1
                      ? es ? `Hoy, por ${cobro.envios} envíos` : `Today, for ${cobro.envios} shipments`
                      : es ? "Hoy, por este envío" : "Today, for this shipment"}
                  </span>
                  <span className="font-display font-bold text-vino text-3xl leading-none">
                    <NumeroAnimado valor={cobro.total} formato={(n) => formatCOP(Math.round(n))} />
                  </span>
                </div>
                {cobro.ahorro > 0 && (
                  <p className="font-mono text-[11px] text-verde text-right mt-1">
                    {es ? `Ahorras ${formatCOP(cobro.ahorro)}` : `You save ${formatCOP(cobro.ahorro)}`}
                  </p>
                )}
                <p className="font-body text-tinta-suave text-sm mt-4">
                  {cobro.envios > 1
                    ? es
                      ? `Cuando se acaben los ${cobro.envios} envíos, se renueva por el mismo plazo. Lo cambias antes desde tu cuenta.`
                      : `When the ${cobro.envios} shipments run out, it renews for the same term. Change it beforehand from your account.`
                    : es
                      ? `Después se cobra cada envío, ${reglas.diasCobroAntesEnvio} días antes de despacharlo.`
                      : `After that, each shipment is charged ${reglas.diasCobroAntesEnvio} days before it ships.`}
                </p>
              </div>

              <div className="rounded-card border border-borde bg-white p-5 mb-5">
                <p className="font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase mb-1">
                  {es ? "Envío a" : "Shipping to"}
                </p>
                <p className="font-body text-tinta text-sm">{direccion.nombre} · {direccion.telefono}</p>
                <p className="font-body text-tinta-suave text-sm">
                  {direccion.linea}, {direccion.ciudad}, {direccion.departamento}
                </p>
              </div>

              {authLoading ? (
                <p className="font-body text-tinta-suave text-sm">{es ? "Un momento…" : "One moment…"}</p>
              ) : user ? (
                <div className="rounded-card border border-borde bg-white p-6">
                  <MetodoPagoForm
                    es={es}
                    ocupado={enviando}
                    textoBoton={es ? `Pagar ${formatCOP(cobro.total)} y suscribirme` : `Pay ${formatCOP(cobro.total)} and subscribe`}
                    onListo={pagar}
                  />
                </div>
              ) : (
                <div className="rounded-card border border-borde bg-white p-6">
                  <p className="font-display font-bold text-tinta text-xl mb-1">{es ? "Crea tu cuenta" : "Create your account"}</p>
                  <p className="font-body text-tinta-suave text-sm mb-4">
                    {es
                      ? "Es desde donde pausas, saltas o cancelas la suscripción. Con Google, con contraseña o con un código al correo."
                      : "It's where you pause, skip or cancel the subscription. With Google, a password or a code by email."}
                  </p>
                  <AuthPanel locale={locale} destino={`/${locale}/checkout`} />
                </div>
              )}

              <p className="font-body text-tinta-suave text-sm mt-4 text-center">
                {es ? "Pausas o cancelas cuando quieras desde " : "Pause or cancel anytime from "}
                <Link href="/cuenta" className="text-vino underline">{es ? "tu cuenta" : "your account"}</Link>.
              </p>
            </>
          )}
        </div>

        {error && <p className="font-body text-vino text-sm mt-4" role="alert">{error}</p>}

        <div className="flex items-center justify-between gap-3 mt-8">
          <button
            type="button"
            onClick={retroceder}
            disabled={indice === 0 || enviando}
            className="font-body font-700 text-sm px-5 py-2.5 rounded-btn border border-borde-2 text-tinta-cafe hover:border-vino hover:text-vino transition-colors disabled:opacity-40 disabled:hover:border-borde-2 disabled:hover:text-tinta-cafe"
          >
            {es ? "Atrás" : "Back"}
          </button>

          {!esUltimo && (
            <button
              type="button"
              onClick={avanzar}
              disabled={pasoActual === "envio" && !direccionCompleta}
              className="font-body font-800 text-base px-6 py-3 rounded-btn bg-naranja hover:bg-naranja-700 text-white shadow-cta transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {es ? "Seguir" : "Continue"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Progreso ───────────────────────────────────────────────────────────────

function Progreso({ total, indice, es }: { total: number; indice: number; es: boolean }) {
  const pct = Math.round(((indice + 1) / total) * 100);
  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-2">
        <p className="font-mono text-[11px] tracking-[.18em] text-tinta-suave uppercase">
          {es ? `Paso ${indice + 1} de ${total}` : `Step ${indice + 1} of ${total}`}
        </p>
        <p className="font-mono text-[11px] text-tinta-suave">{pct}%</p>
      </div>
      <div
        className="h-1.5 rounded-pill bg-borde overflow-hidden"
        role="progressbar"
        aria-valuenow={indice + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={es ? "Avance de la suscripción" : "Subscription progress"}
      >
        <div
          className="h-full bg-vino rounded-pill transition-transform duration-400 ease-out origin-left"
          style={{ transform: `scaleX(${pct / 100})`, width: "100%" }}
        />
      </div>
    </div>
  );
}

// ── Piezas compartidas ─────────────────────────────────────────────────────

function Titulo({
  children, ayuda, innerRef,
}: {
  children: React.ReactNode;
  ayuda?: string;
  innerRef: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <>
      <h1 ref={innerRef} tabIndex={-1} className="font-display font-bold text-tinta text-3xl mb-1 focus:outline-none">
        {children}
      </h1>
      {ayuda && <p className="font-body text-tinta-suave text-sm mb-6">{ayuda}</p>}
    </>
  );
}

function tarjetaOpcion(activa: boolean) {
  return [
    "w-full text-left rounded-card border p-5 transition-all duration-150",
    "hover:-translate-y-0.5 active:translate-y-0",
    activa ? "border-vino bg-white ring-2 ring-vino shadow-card-hover" : "border-borde bg-white hover:border-vino",
  ].join(" ");
}

// ── Pasos ──────────────────────────────────────────────────────────────────

type OpcionLista = Pick<OpcionCatalogo, "id" | "label_es" | "label_en"> & { desc_es?: string; desc_en?: string };

const PasoOpciones = function PasoOpciones({
  ref, es, titulo, ayuda, opciones, valor, onElegir,
}: {
  ref: React.Ref<HTMLHeadingElement>;
  es: boolean;
  titulo: string;
  ayuda: string;
  opciones: readonly OpcionLista[];
  valor: string;
  onElegir: (id: string) => void;
}) {
  return (
    <>
      <Titulo innerRef={ref} ayuda={ayuda}>{titulo}</Titulo>
      <div role="radiogroup" aria-label={titulo} className="grid gap-3">
        {opciones.map((o) => {
          const activa = o.id === valor;
          const detalle = es ? o.desc_es : o.desc_en;
          return (
            <button key={o.id} type="button" role="radio" aria-checked={activa} onClick={() => onElegir(o.id)} className={tarjetaOpcion(activa)}>
              <span className="font-display font-bold text-tinta text-xl block">{es ? o.label_es : o.label_en}</span>
              {detalle && <span className="font-body text-tinta-suave text-sm block mt-1">{detalle}</span>}
            </button>
          );
        })}
      </div>
    </>
  );
};

const PasoPlan = function PasoPlan({
  ref, es, catalogo, valor, onElegir,
}: {
  ref: React.Ref<HTMLHeadingElement>;
  es: boolean;
  catalogo: Catalogo;
  valor: string;
  onElegir: (id: string) => void;
}) {
  return (
    <>
      <Titulo
        innerRef={ref}
        ayuda={es ? "¿No sabes cuál? El quiz de 60 segundos te lo dice." : "Not sure? The 60-second quiz will tell you."}
      >
        {es ? "¿Qué plan?" : "Which plan?"}
      </Titulo>
      <Link href="/quiz" className="inline-block font-body text-sm text-vino underline mb-5">
        {es ? "Hacer el quiz" : "Take the quiz"}
      </Link>

      <div role="radiogroup" aria-label={es ? "Planes" : "Plans"} className="grid gap-3">
        {catalogo.planes.map((p) => {
          const activa = p.id === valor;
          return (
            <button key={p.id} type="button" role="radio" aria-checked={activa} onClick={() => onElegir(p.id)} className={tarjetaOpcion(activa)}>
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-display font-bold text-tinta text-xl">{es ? p.label_es : p.label_en}</span>
                <span className="font-display font-bold text-vino text-xl shrink-0">
                  {formatCOP(p.precioEnvioCop)}
                  <span className="font-mono font-400 text-[11px] text-tinta-suave ml-1">{es ? "/envío" : "/shipment"}</span>
                </span>
              </span>
              <span className="font-body text-tinta-suave text-sm block mt-1">{(es ? p.incluye_es : p.incluye_en).join(" · ")}</span>
              <FrecuenciaSugerida es={es} catalogo={catalogo} plan={p} />
            </button>
          );
        })}
      </div>
    </>
  );
};

function FrecuenciaSugerida({ es, catalogo, plan }: { es: boolean; catalogo: Catalogo; plan: Plan }) {
  const sugerida = catalogo.frecuencias.find((f) => f.id === plan.frecuenciaDefectoId);
  if (!sugerida) return null;
  return (
    <span className="font-mono text-[11px] text-verde block mt-1">
      {es ? `Pensado ${sugerida.label_es.toLowerCase()}` : `Designed for ${sugerida.label_en.toLowerCase()}`}
    </span>
  );
}

const PasoPrepago = function PasoPrepago({
  ref, es, catalogo, plan, frecuenciaId, valor, onElegir,
}: {
  ref: React.Ref<HTMLHeadingElement>;
  es: boolean;
  catalogo: Catalogo;
  plan: Plan;
  frecuenciaId: string;
  valor: string;
  onElegir: (id: string) => void;
}) {
  const frecuencia = catalogo.frecuencias.find((f) => f.id === frecuenciaId)!;
  return (
    <>
      <Titulo
        innerRef={ref}
        ayuda={
          es
            ? "Pagar varios meses de una baja el precio. Sigues pudiendo pausar o cancelar, y lo ya pagado te llega igual."
            : "Paying several months up front lowers the price. You can still pause or cancel, and what you paid for still arrives."
        }
      >
        {es ? "¿Cómo quieres pagar?" : "How do you want to pay?"}
      </Titulo>

      <div role="radiogroup" aria-label={es ? "Prepago" : "Prepayment"} className="grid gap-3">
        {catalogo.prepagos.map((p) => {
          const activa = p.id === valor;
          const c = montoCobro(plan, frecuencia, p, catalogo.reglas);
          const envios = enviosDelPrepago(p, frecuencia);
          return (
            <button key={p.id} type="button" role="radio" aria-checked={activa} onClick={() => onElegir(p.id)} className={tarjetaOpcion(activa)}>
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-display font-bold text-tinta text-xl">{es ? p.label_es : p.label_en}</span>
                <span className="text-right shrink-0">
                  <span className="font-display font-bold text-vino text-xl block leading-none">{formatCOP(c.total)}</span>
                  {envios > 1 && (
                    <span className="font-mono text-[10px] text-tinta-suave">
                      {formatCOP(c.porEnvio)}{es ? "/envío" : "/shipment"}
                    </span>
                  )}
                </span>
              </span>
              <span className="font-body text-tinta-suave text-sm block mt-1">
                {envios > 1
                  ? es ? `${envios} envíos pagados de una, ${p.descuentoPct}% menos.` : `${envios} shipments paid up front, ${p.descuentoPct}% off.`
                  : es ? "Se cobra cada envío." : "Charged each shipment."}
              </span>
              {c.ahorro > 0 && (
                <span className="font-mono text-[11px] text-verde block mt-1">
                  {es ? `Ahorras ${formatCOP(c.ahorro)}` : `You save ${formatCOP(c.ahorro)}`}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
};

const PasoEnvio = function PasoEnvio({
  ref, es, direccion, onCambio,
}: {
  ref: React.Ref<HTMLHeadingElement>;
  es: boolean;
  direccion: typeof DIRECCION_VACIA;
  onCambio: (d: typeof DIRECCION_VACIA) => void;
}) {
  return (
    <>
      <Titulo innerRef={ref} ayuda={es ? "Despachamos a todo el país." : "We ship nationwide."}>
        {es ? "¿A dónde lo mandamos?" : "Where do we send it?"}
      </Titulo>
      <CamposDireccion es={es} direccion={direccion} onCambio={onCambio} prefijo="ck" />
    </>
  );
};

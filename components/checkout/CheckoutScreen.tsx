"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/lib/nav";
import {
  ciudades, findNivel, frecuencias, metodosPreparacion, moliendas, niveles,
  perfiles, prepagos, suscripcionConfig,
} from "@/lib/content";
import {
  cobroPrepago, consumoMensual, nivelSugerido, proximoCobro, proximoDespacho,
  tazasQueRinde,
} from "@/lib/suscripcion";
import { formatCOP } from "@/lib/format";
import { iniciarPago, suscribirSinPago } from "@/lib/pago";
import { FEATURE_PAGOS } from "@/lib/flags";
import { useAuthStore } from "@/lib/auth-store";
import NumeroAnimado from "@/components/shared/NumeroAnimado";
import AuthPanel from "@/components/auth/AuthPanel";
import type { Locale } from "@/lib/types";

type PasoId =
  | "plan" | "molienda" | "metodo" | "perfil" | "frecuencia"
  | "prepago" | "envio" | "resumen";

const DIRECCION_VACIA = {
  nombre: "", telefono: "", linea: "", ciudad: "", departamento: "", notas: "",
};

const ENTRADA =
  "w-full bg-white border border-borde rounded-input px-4 py-3 font-body text-tinta text-base focus:outline-none focus:border-naranja focus:ring-1 focus:ring-naranja transition-colors";
const ETIQUETA =
  "block font-mono text-[11px] tracking-[.15em] text-tinta-suave uppercase mb-1";

// Entrar con Google saca del sitio y vuelve con la página recargada. Sin esto,
// el cliente perdería los ocho pasos y tendría que rehacerlos. Se guarda en
// sessionStorage —no localStorage— para que no quede rondando después de
// cerrar la pestaña. También cubre un refresco accidental a mitad del formulario.
const BORRADOR = "tm-checkout";

interface Borrador {
  indice: number;
  nivelId: string;
  molienda: string;
  metodoId: string;
  perfil: string;
  frecuenciaId: string;
  prepagoId: string;
  direccion: typeof DIRECCION_VACIA;
}

function leerBorrador(): Partial<Borrador> | null {
  try {
    const crudo = window.sessionStorage.getItem(BORRADOR);
    return crudo ? (JSON.parse(crudo) as Partial<Borrador>) : null;
  } catch {
    return null;
  }
}

export default function CheckoutScreen({ locale }: { locale: Locale }) {
  const es = locale !== "en";
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading, init } = useAuthStore();

  // Lo que venga de la calculadora se respeta y se salta ese paso.
  const nivelInicial = searchParams.get("nivel");
  const metodoInicial = searchParams.get("metodo");

  const pasos = useMemo<PasoId[]>(() => {
    const todos: PasoId[] = [
      "plan", "molienda", "metodo", "perfil", "frecuencia", "prepago", "envio", "resumen",
    ];
    // Si ya dijo cómo prepara el café en la calculadora, no se le pregunta otra vez.
    return metodoInicial ? todos.filter((p) => p !== "metodo") : todos;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [indice, setIndice] = useState(0);
  const [sentido, setSentido] = useState<"adelante" | "atras">("adelante");

  const [nivelId, setNivelId] = useState(
    () => (nivelInicial && findNivel(nivelInicial)?.id) || niveles[0].id
  );
  const [molienda, setMolienda] = useState(moliendas[0].id);
  const [metodoId, setMetodoId] = useState(
    () => metodosPreparacion.find((m) => m.id === metodoInicial)?.id ?? metodosPreparacion[0].id
  );
  const [perfil, setPerfil] = useState(perfiles[1]?.id ?? perfiles[0].id);
  const [frecuenciaId, setFrecuenciaId] = useState(frecuencias[0].id);
  const [prepagoId, setPrepagoId] = useState(prepagos[0].id);
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
  useEffect(() => {
    const b = leerBorrador();
    if (!b) return;
    if (b.nivelId && findNivel(b.nivelId)) setNivelId(b.nivelId);
    if (b.molienda) setMolienda(b.molienda);
    if (b.metodoId) setMetodoId(b.metodoId);
    if (b.perfil) setPerfil(b.perfil);
    if (b.frecuenciaId) setFrecuenciaId(b.frecuenciaId);
    if (b.prepagoId) setPrepagoId(b.prepagoId);
    if (b.direccion) setDireccion({ ...DIRECCION_VACIA, ...b.direccion });
    if (typeof b.indice === "number") {
      setIndice(Math.min(Math.max(b.indice, 0), pasos.length - 1));
    }
  }, [pasos.length]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        BORRADOR,
        JSON.stringify({
          indice, nivelId, molienda, metodoId, perfil, frecuenciaId, prepagoId, direccion,
        } satisfies Borrador)
      );
    } catch {
      // Modo privado o almacenamiento lleno: se sigue sin borrador.
    }
  }, [indice, nivelId, molienda, metodoId, perfil, frecuenciaId, prepagoId, direccion]);

  // Al cambiar de paso el foco va al título: si no, el teclado se queda en un
  // botón que ya no existe y el lector de pantalla no anuncia nada.
  useEffect(() => {
    if (!yaMontado.current) {
      yaMontado.current = true;
      return;
    }
    tituloRef.current?.focus();
  }, [indice]);

  const nivel = findNivel(nivelId) ?? niveles[0];
  const frecuencia = frecuencias.find((f) => f.id === frecuenciaId) ?? frecuencias[0];
  const prepago = prepagos.find((p) => p.id === prepagoId) ?? prepagos[0];
  const cobro = cobroPrepago(nivel, prepago, suscripcionConfig);

  const pasoActual = pasos[indice];
  const esUltimo = indice === pasos.length - 1;

  function avanzar() {
    setSentido("adelante");
    setIndice((i) => Math.min(i + 1, pasos.length - 1));
  }

  function retroceder() {
    setSentido("atras");
    setIndice((i) => Math.max(i - 1, 0));
  }

  const direccionCompleta =
    direccion.nombre && direccion.telefono && direccion.linea &&
    direccion.ciudad && direccion.departamento;

  function limpiarBorrador() {
    try {
      window.sessionStorage.removeItem(BORRADOR);
    } catch {
      // Sin almacenamiento no hay nada que limpiar.
    }
  }

  const pedido = {
    tipo: "suscripcion",
    nivel: nivel.id,
    frecuencia: frecuencia.id,
    prepago: prepago.id,
    molienda,
    metodo: metodoId,
    perfil,
  } as const;

  async function confirmar() {
    setError("");
    if (!direccionCompleta) {
      setError(es ? "Faltan datos de envío." : "Shipping details are missing.");
      return;
    }

    setEnviando(true);

    // Con la pasarela apagada no se sale del sitio: la suscripción queda
    // activa aquí mismo y el cliente pasa derecho a la confirmación.
    if (!FEATURE_PAGOS) {
      const r = await suscribirSinPago(pedido, direccion, locale);
      if (r.ok) {
        limpiarBorrador();
        router.push("/cuenta");
        return;
      }
      setEnviando(false);
      setError(
        r.motivo === "sin_sesion"
          ? es ? "Crea tu cuenta para suscribirte." : "Create your account to subscribe."
          : es ? "No se pudo crear la suscripción. Intenta de nuevo." : "Couldn't create the subscription. Try again."
      );
      return;
    }

    const resultado = await iniciarPago(pedido, direccion, locale, user?.email);

    if (resultado.ok) {
      // La suscripción ya está creada en la base; el borrador sobra y no debe
      // reaparecer si el cliente vuelve al checkout.
      limpiarBorrador();
      window.location.href = resultado.url;
      return;
    }

    setEnviando(false);
    setError(
      {
        sin_sesion: es ? "Entra con tu correo para pagar." : "Sign in with your email to pay.",
        sin_configurar: es
          ? "Los pagos todavía no están habilitados. Escríbenos y lo resolvemos."
          : "Payments aren't enabled yet. Write to us and we'll sort it out.",
        error: es ? "No se pudo iniciar el pago. Intenta de nuevo." : "Couldn't start the payment. Try again.",
      }[resultado.motivo]
    );
  }

  return (
    <div className="bg-fondo min-h-screen py-10">
      <div className="max-w-[640px] mx-auto px-[22px]">
        <Progreso pasos={pasos} indice={indice} es={es} />

        <div
          key={pasoActual}
          className={sentido === "adelante" ? "tm-paso-adelante" : "tm-paso-atras"}
        >
          {pasoActual === "plan" && (
            <PasoPlan
              ref={tituloRef}
              es={es}
              nivelId={nivelId}
              metodoId={metodoId}
              onElegir={setNivelId}
            />
          )}

          {pasoActual === "molienda" && (
            <PasoOpciones
              ref={tituloRef}
              es={es}
              titulo={es ? "¿Grano o molido?" : "Whole bean or ground?"}
              ayuda={
                es
                  ? "Si lo pides molido, lo molemos para tu método el día del despacho."
                  : "If you choose ground, we grind for your method on shipping day."
              }
              opciones={moliendas}
              valor={molienda}
              onElegir={setMolienda}
            />
          )}

          {pasoActual === "metodo" && (
            <PasoOpciones
              ref={tituloRef}
              es={es}
              titulo={es ? "¿Cómo lo preparas?" : "How do you brew it?"}
              ayuda={
                es
                  ? "Con esto calculamos la molienda y la receta que va en la caja."
                  : "This sets the grind size and the recipe in the box."
              }
              opciones={metodosPreparacion}
              valor={metodoId}
              onElegir={setMetodoId}
            />
          )}

          {pasoActual === "perfil" && (
            <PasoOpciones
              ref={tituloRef}
              es={es}
              titulo={es ? "¿Qué taza te gusta?" : "Which cup do you like?"}
              ayuda={
                es
                  ? "Elegimos el lote de la finca que más se acerque."
                  : "We pick the farm lot that comes closest."
              }
              opciones={perfiles}
              valor={perfil}
              onElegir={setPerfil}
            />
          )}

          {pasoActual === "frecuencia" && (
            <PasoOpciones
              ref={tituloRef}
              es={es}
              titulo={es ? "¿Cada cuánto?" : "How often?"}
              ayuda={
                es
                  ? "Lo cambias cuando quieras desde tu cuenta."
                  : "Change it anytime from your account."
              }
              opciones={frecuencias}
              valor={frecuenciaId}
              onElegir={setFrecuenciaId}
            />
          )}

          {pasoActual === "prepago" && (
            <PasoPrepago
              ref={tituloRef}
              es={es}
              nivel={nivel}
              valor={prepagoId}
              onElegir={setPrepagoId}
            />
          )}

          {pasoActual === "envio" && (
            <PasoEnvio
              ref={tituloRef}
              es={es}
              direccion={direccion}
              onCambio={setDireccion}
            />
          )}

          {pasoActual === "resumen" && (
            <PasoResumen
              ref={tituloRef}
              es={es}
              locale={locale}
              nivel={nivel}
              frecuencia={frecuencia}
              prepago={prepago}
              cobro={cobro}
              molienda={molienda}
              metodoId={metodoId}
              perfil={perfil}
              direccion={direccion}
              autenticado={Boolean(user)}
              cargandoSesion={authLoading}
              enviando={enviando}
              onPagar={confirmar}
            />
          )}
        </div>

        {error && (
          <p className="font-body text-vino text-sm mt-4" role="alert">
            {error}
          </p>
        )}

        {/* Navegación */}
        <div className="flex items-center justify-between gap-3 mt-8">
          <button
            type="button"
            onClick={retroceder}
            disabled={indice === 0}
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

function Progreso({
  pasos, indice, es,
}: { pasos: PasoId[]; indice: number; es: boolean }) {
  const pct = Math.round(((indice + 1) / pasos.length) * 100);

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-2">
        <p className="font-mono text-[11px] tracking-[.18em] text-tinta-suave uppercase">
          {es ? `Paso ${indice + 1} de ${pasos.length}` : `Step ${indice + 1} of ${pasos.length}`}
        </p>
        <p className="font-mono text-[11px] text-tinta-suave">{pct}%</p>
      </div>
      <div
        className="h-1.5 rounded-pill bg-borde overflow-hidden"
        role="progressbar"
        aria-valuenow={indice + 1}
        aria-valuemin={1}
        aria-valuemax={pasos.length}
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
      <h1
        ref={innerRef}
        tabIndex={-1}
        className="font-display font-bold text-tinta text-3xl mb-1 focus:outline-none"
      >
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
    activa
      ? "border-vino bg-white ring-2 ring-vino shadow-card-hover"
      : "border-borde bg-white hover:border-vino",
  ].join(" ");
}

// ── Pasos ──────────────────────────────────────────────────────────────────

interface OpcionLista {
  id: string;
  label_es: string;
  label_en: string;
  nota_es?: string;
  nota_en?: string;
  desc_es?: string;
  desc_en?: string;
}

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
          const detalle = es ? o.desc_es ?? o.nota_es : o.desc_en ?? o.nota_en;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={activa}
              onClick={() => onElegir(o.id)}
              className={tarjetaOpcion(activa)}
            >
              <span className="font-display font-bold text-tinta text-xl block">
                {es ? o.label_es : o.label_en}
              </span>
              {detalle && (
                <span className="font-body text-tinta-suave text-sm block mt-1">{detalle}</span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
};

const PasoPlan = function PasoPlan({
  ref, es, nivelId, metodoId, onElegir,
}: {
  ref: React.Ref<HTMLHeadingElement>;
  es: boolean;
  nivelId: string;
  metodoId: string;
  onElegir: (id: string) => void;
}) {
  const [tazas, setTazas] = useState(0);
  const sugerido = tazas > 0
    ? nivelSugerido(consumoMensual(tazas, metodoId, suscripcionConfig), suscripcionConfig)
    : null;

  return (
    <>
      <Titulo
        innerRef={ref}
        ayuda={
          es
            ? "Si no sabes cuánto pedir, dinos cuántas tazas tomas al día."
            : "If you're unsure how much to order, tell us how many cups you drink a day."
        }
      >
        {es ? "¿Cuánto café?" : "How much coffee?"}
      </Titulo>

      {/* Atajo: la calculadora en chico */}
      <div className="rounded-card border border-borde bg-arena/50 p-4 mb-5">
        <p className="font-mono text-[10px] tracking-[.18em] text-tinta-suave uppercase mb-2">
          {es ? "Tazas al día" : "Cups a day"}
        </p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={tazas === n}
              onClick={() => {
                setTazas(n);
                onElegir(
                  nivelSugerido(consumoMensual(n, metodoId, suscripcionConfig), suscripcionConfig).id
                );
              }}
              className={`font-body font-600 text-sm px-4 py-2 rounded-btn border transition-all duration-150 active:scale-[.97] ${
                tazas === n
                  ? "bg-vino text-crema-papel border-vino"
                  : "bg-white text-tinta-cafe border-borde hover:border-vino"
              }`}
            >
              {n === 4 ? (es ? "4 o más" : "4+") : n}
            </button>
          ))}
        </div>
        {sugerido && (
          <p className="font-body text-verde text-sm mt-3" role="status">
            {es
              ? `Te marcamos ${sugerido.label_es}. Puedes cambiarlo abajo.`
              : `We selected ${sugerido.label_en}. You can change it below.`}
          </p>
        )}
      </div>

      <div role="radiogroup" aria-label={es ? "Planes" : "Plans"} className="grid gap-3">
        {niveles.map((n) => {
          const activa = n.id === nivelId;
          return (
            <button
              key={n.id}
              type="button"
              role="radio"
              aria-checked={activa}
              onClick={() => onElegir(n.id)}
              className={tarjetaOpcion(activa)}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-display font-bold text-tinta text-xl">
                  {es ? n.label_es : n.label_en}
                </span>
                <span className="font-display font-bold text-vino text-xl shrink-0">
                  {formatCOP(n.precioCop)}
                  <span className="font-mono font-400 text-[11px] text-tinta-suave ml-1">
                    {es ? "/mes" : "/mo"}
                  </span>
                </span>
              </span>
              <span className="font-body text-tinta-suave text-sm block mt-1">
                {(es ? n.incluye_es : n.incluye_en).join(" · ")}
              </span>
              <span className="font-mono text-[11px] text-verde block mt-1">
                {es
                  ? `Rinde ${tazasQueRinde(n, metodoId, suscripcionConfig)} tazas`
                  : `${tazasQueRinde(n, metodoId, suscripcionConfig)} cups`}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};

const PasoPrepago = function PasoPrepago({
  ref, es, nivel, valor, onElegir,
}: {
  ref: React.Ref<HTMLHeadingElement>;
  es: boolean;
  nivel: (typeof niveles)[number];
  valor: string;
  onElegir: (id: string) => void;
}) {
  return (
    <>
      <Titulo
        innerRef={ref}
        ayuda={
          es
            ? "Pagar varios meses de una baja el precio. No cambia nada más: sigues pudiendo pausar o cancelar."
            : "Paying several months up front lowers the price. Nothing else changes: you can still pause or cancel."
        }
      >
        {es ? "¿Cómo quieres pagar?" : "How do you want to pay?"}
      </Titulo>

      <div role="radiogroup" aria-label={es ? "Prepago" : "Prepayment"} className="grid gap-3">
        {prepagos.map((p) => {
          const activa = p.id === valor;
          const c = cobroPrepago(nivel, p, suscripcionConfig);
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={activa}
              onClick={() => onElegir(p.id)}
              className={tarjetaOpcion(activa)}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-display font-bold text-tinta text-xl">
                  {es ? p.label_es : p.label_en}
                </span>
                <span className="text-right shrink-0">
                  <span className="font-display font-bold text-vino text-xl block leading-none">
                    {formatCOP(c.total)}
                  </span>
                  {p.meses > 1 && (
                    <span className="font-mono text-[10px] text-tinta-suave">
                      {formatCOP(c.porMes)}{es ? "/mes" : "/mo"}
                    </span>
                  )}
                </span>
              </span>
              <span className="font-body text-tinta-suave text-sm block mt-1">
                {es ? p.nota_es : p.nota_en}
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
  const campo = (k: keyof typeof DIRECCION_VACIA) => ({
    value: direccion[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onCambio({ ...direccion, [k]: e.target.value }),
  });

  return (
    <>
      <Titulo
        innerRef={ref}
        ayuda={es ? "Despachamos a todo el país." : "We ship nationwide."}
      >
        {es ? "¿A dónde lo mandamos?" : "Where do we send it?"}
      </Titulo>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={ETIQUETA} htmlFor="ck-nombre">
            {es ? "Nombre completo" : "Full name"}
          </label>
          <input id="ck-nombre" autoComplete="name" className={ENTRADA} {...campo("nombre")} />
        </div>

        <div>
          <label className={ETIQUETA} htmlFor="ck-telefono">
            {es ? "Celular" : "Phone"}
          </label>
          <input
            id="ck-telefono"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={ENTRADA}
            {...campo("telefono")}
          />
        </div>

        <div>
          <label className={ETIQUETA} htmlFor="ck-ciudad">
            {es ? "Ciudad" : "City"}
          </label>
          <select id="ck-ciudad" autoComplete="address-level2" className={ENTRADA} {...campo("ciudad")}>
            <option value="">{es ? "Elige tu ciudad" : "Choose your city"}</option>
            {ciudades.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="otra">{es ? "Otra" : "Other"}</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={ETIQUETA} htmlFor="ck-linea">
            {es ? "Dirección" : "Address"}
          </label>
          <input
            id="ck-linea"
            autoComplete="street-address"
            placeholder={es ? "Calle 12 #4-56, apto 301" : "Street, number, apartment"}
            className={ENTRADA}
            {...campo("linea")}
          />
        </div>

        <div>
          <label className={ETIQUETA} htmlFor="ck-departamento">
            {es ? "Departamento" : "State"}
          </label>
          <input
            id="ck-departamento"
            autoComplete="address-level1"
            className={ENTRADA}
            {...campo("departamento")}
          />
        </div>

        <div>
          <label className={ETIQUETA} htmlFor="ck-notas">
            {es ? "Indicaciones (opcional)" : "Notes (optional)"}
          </label>
          <input
            id="ck-notas"
            placeholder={es ? "Portería, referencia…" : "Doorman, landmark…"}
            className={ENTRADA}
            {...campo("notas")}
          />
        </div>
      </div>
    </>
  );
};

const PasoResumen = function PasoResumen({
  ref, es, locale, nivel, frecuencia, prepago, cobro, molienda, metodoId,
  perfil, direccion, autenticado, cargandoSesion, enviando, onPagar,
}: {
  ref: React.Ref<HTMLHeadingElement>;
  es: boolean;
  locale: Locale;
  nivel: (typeof niveles)[number];
  frecuencia: (typeof frecuencias)[number];
  prepago: (typeof prepagos)[number];
  cobro: ReturnType<typeof cobroPrepago>;
  molienda: string;
  metodoId: string;
  perfil: string;
  direccion: typeof DIRECCION_VACIA;
  autenticado: boolean;
  cargandoSesion: boolean;
  enviando: boolean;
  onPagar: () => void;
}) {
  const etiqueta = (lista: readonly OpcionLista[], id: string) => {
    const o = lista.find((x) => x.id === id);
    return o ? (es ? o.label_es : o.label_en) : id;
  };

  const filas = [
    { k: es ? "Plan" : "Plan", v: es ? nivel.label_es : nivel.label_en },
    { k: es ? "Cada cuánto" : "How often", v: es ? frecuencia.label_es : frecuencia.label_en },
    { k: es ? "Molienda" : "Grind", v: etiqueta(moliendas, molienda) },
    { k: es ? "Método" : "Method", v: etiqueta(metodosPreparacion, metodoId) },
    { k: es ? "Perfil" : "Profile", v: etiqueta(perfiles, perfil) },
    { k: es ? "Pago" : "Payment", v: es ? prepago.label_es : prepago.label_en },
  ];

  return (
    <>
      <Titulo innerRef={ref}>
        {FEATURE_PAGOS
          ? es ? "Revisa y paga" : "Review and pay"
          : es ? "Revisa y confirma" : "Review and confirm"}
      </Titulo>

      <div className="rounded-card border border-borde bg-white p-6 mb-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5">
          {filas.map(({ k, v }) => (
            <div key={k} className="contents">
              <dt className="font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase self-center">
                {k}
              </dt>
              <dd className="font-body font-600 text-tinta text-sm text-right">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="border-t border-borde pt-5 flex items-baseline justify-between">
          <span className="font-body text-tinta text-base">
            {prepago.meses > 1
              ? es ? `Total por ${prepago.meses} meses` : `Total for ${prepago.meses} months`
              : es ? "Total al mes" : "Monthly total"}
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
      </div>

      {/* Cuándo pasa qué */}
      <div className="rounded-card bg-verde-claro border border-verde/20 p-5 mb-4">
        <p className="font-mono text-[10px] tracking-[.18em] text-verde uppercase mb-2">
          {es ? "Qué sigue" : "What happens next"}
        </p>
        <p className="font-body text-tinta text-sm leading-relaxed">
          {FEATURE_PAGOS
            ? es
              ? `Te cobramos el día ${suscripcionConfig.cobroDia} de cada mes y despachamos el día ${suscripcionConfig.despachoDia}. El primer cobro es hoy, y el próximo cae el ${proximoCobro(suscripcionConfig)}.`
              : `We charge on the ${suscripcionConfig.cobroDia}st of each month and ship on the ${suscripcionConfig.despachoDia}th. The first charge is today, and the next falls on ${proximoCobro(suscripcionConfig)}.`
            : es
              ? `Tu suscripción queda registrada y el primer envío sale el ${proximoDespacho(suscripcionConfig)}. Todavía no cobramos en línea: te escribimos para coordinar el pago.`
              : `Your subscription is registered and the first shipment goes out on ${proximoDespacho(suscripcionConfig)}. We don't charge online yet: we'll write to arrange payment.`}
        </p>
        <p className="font-body text-tinta-suave text-sm mt-2">
          {es
            ? `Próximo despacho: ${proximoDespacho(suscripcionConfig)}.`
            : `Next shipment: ${proximoDespacho(suscripcionConfig)}.`}
        </p>
      </div>

      <div className="rounded-card border border-borde bg-white p-5 mb-5">
        <p className="font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase mb-1">
          {es ? "Envío a" : "Shipping to"}
        </p>
        <p className="font-body text-tinta text-sm">
          {direccion.nombre} · {direccion.telefono}
        </p>
        <p className="font-body text-tinta-suave text-sm">
          {direccion.linea}, {direccion.ciudad}, {direccion.departamento}
        </p>
      </div>

      {/* Sin cuenta no hay cobro recurrente: el correo identifica la suscripción. */}
      {cargandoSesion ? (
        <p className="font-body text-tinta-suave text-sm">
          {es ? "Un momento…" : "One moment…"}
        </p>
      ) : autenticado ? (
        <button
          type="button"
          onClick={onPagar}
          disabled={enviando}
          className="w-full bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3.5 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {enviando
            ? FEATURE_PAGOS
              ? es ? "Abriendo el pago…" : "Opening payment…"
              : es ? "Creando tu suscripción…" : "Creating your subscription…"
            : FEATURE_PAGOS
              ? es ? "Pagar y suscribirme" : "Pay and subscribe"
              : es ? "Confirmar suscripción" : "Confirm subscription"}
        </button>
      ) : (
        <div className="rounded-card border border-borde bg-white p-6">
          <p className="font-display font-bold text-tinta text-xl mb-1">
            {es ? "Crea tu cuenta" : "Create your account"}
          </p>
          <p className="font-body text-tinta-suave text-sm mb-4">
            {es
              ? "Es desde donde pausas, saltas o cancelas la suscripción. Con Google, con contraseña o con un código al correo."
              : "It's where you pause, skip or cancel the subscription. With Google, a password or a code by email."}
          </p>
          {/* Crear la cuenta encadena con el alta: quien llegó hasta aquí ya
              eligió todo, y pedirle un clic más solo lo deja a medias. */}
          <AuthPanel
            locale={locale}
            destino={`/${locale}/checkout`}
            onListo={onPagar}
          />
        </div>
      )}

      <p className="font-body text-tinta-suave text-sm mt-4 text-center">
        {es ? "Pausas o cancelas cuando quieras desde " : "Pause or cancel anytime from "}
        <Link href="/cuenta" className="text-vino underline">
          {es ? "tu cuenta" : "your account"}
        </Link>
        .
      </p>
    </>
  );
};

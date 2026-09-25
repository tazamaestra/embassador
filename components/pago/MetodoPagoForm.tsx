"use client";

import { useEffect, useRef, useState } from "react";
import {
  estadoTokenNequi, obtenerAceptacion, tokenizarNequi, tokenizarTarjeta, wompiDisponible,
  type Aceptacion,
} from "@/lib/wompi-navegador";

// Tarjeta o Nequi, y las dos casillas de Wompi. Lo que sale de aquí es un
// token: el número de la tarjeta va del navegador directo a Wompi y nunca
// toca nuestro servidor. Lo usan el checkout y el cambio de medio de pago
// en la cuenta.

export interface PagoTokenizado {
  tipo: "CARD" | "NEQUI";
  token: string;
  acceptanceToken: string;
  personalAuthToken: string;
  /** "VISA ···· 4242" o "Nequi ···· 1111", para mostrar. */
  resumen: string;
}

const ENTRADA =
  "w-full bg-white border border-borde rounded-input px-4 py-3 font-body text-tinta text-base focus:outline-none focus:border-naranja focus:ring-1 focus:ring-naranja transition-colors";
const ETIQUETA = "block font-mono text-[11px] tracking-[.15em] text-tinta-suave uppercase mb-1";

/** Nequi da unos minutos para aprobar en la app. */
const ESPERA_NEQUI_MS = 3000;
const INTENTOS_NEQUI = 60;

export default function MetodoPagoForm({
  es, textoBoton, ocupado = false, onListo,
}: {
  es: boolean;
  textoBoton: string;
  ocupado?: boolean;
  onListo: (pago: PagoTokenizado) => Promise<void> | void;
}) {
  const [tipo, setTipo] = useState<"CARD" | "NEQUI">("CARD");
  const [tarjeta, setTarjeta] = useState({ numero: "", vence: "", cvc: "", titular: "" });
  const [celular, setCelular] = useState("");
  const [aceptacion, setAceptacion] = useState<Aceptacion | null>(null);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [esperandoNequi, setEsperandoNequi] = useState(false);
  const [error, setError] = useState("");
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    if (!wompiDisponible()) return;
    obtenerAceptacion()
      .then((a) => vivo.current && setAceptacion(a))
      .catch(() => vivo.current && setError(es ? "No pudimos conectar con Wompi. Recarga la página." : "Couldn't reach Wompi. Reload the page."));
    return () => {
      vivo.current = false;
    };
  }, [es]);

  if (!wompiDisponible()) {
    return (
      <p className="font-body text-vino text-sm" role="alert">
        {es ? "Los pagos todavía no están habilitados." : "Payments aren't enabled yet."}
      </p>
    );
  }

  const [mes, anio] = tarjeta.vence.split("/").map((x) => x.trim());
  const tarjetaCompleta =
    tarjeta.numero.replace(/\D/g, "").length >= 13 && mes?.length === 2 && anio?.length === 2 &&
    tarjeta.cvc.length >= 3 && tarjeta.titular.trim().length > 2;
  const nequiCompleto = celular.replace(/\D/g, "").length === 10;
  const listo = Boolean(aceptacion) && aceptaTerminos && aceptaDatos && (tipo === "CARD" ? tarjetaCompleta : nequiCompleto);

  async function entregar(token: string, resumen: string) {
    if (!aceptacion) return;
    await onListo({
      tipo, token, resumen,
      acceptanceToken: aceptacion.acceptanceToken,
      personalAuthToken: aceptacion.personalAuthToken,
    });
  }

  async function enviar() {
    setError("");
    setTrabajando(true);
    try {
      if (tipo === "CARD") {
        const t = await tokenizarTarjeta({
          numero: tarjeta.numero, cvc: tarjeta.cvc, mes: mes ?? "", anio: anio ?? "", titular: tarjeta.titular,
        });
        await entregar(t.token, `${t.marca} ···· ${t.ultimos4}`);
        return;
      }

      const n = await tokenizarNequi(celular);
      let estado = n.estado;
      if (estado === "PENDING") {
        setEsperandoNequi(true);
        for (let i = 0; i < INTENTOS_NEQUI && estado === "PENDING" && vivo.current; i++) {
          await new Promise((r) => setTimeout(r, ESPERA_NEQUI_MS));
          estado = await estadoTokenNequi(n.token).catch(() => "PENDING" as const);
        }
        setEsperandoNequi(false);
      }
      if (estado === "APPROVED") {
        await entregar(n.token, `Nequi ···· ${celular.replace(/\D/g, "").slice(-4)}`);
      } else {
        setError(
          estado === "DECLINED"
            ? es ? "Nequi no autorizó la suscripción." : "Nequi didn't authorize the subscription."
            : es ? "No vimos la aprobación en Nequi. Intenta de nuevo." : "We didn't see the approval in Nequi. Try again."
        );
      }
    } catch (e) {
      setError(
        es
          ? `No se pudo registrar el medio de pago. ${e instanceof Error ? e.message : ""}`
          : `Couldn't register the payment method. ${e instanceof Error ? e.message : ""}`
      );
    } finally {
      if (vivo.current) setTrabajando(false);
    }
  }

  const pestaña = (valor: "CARD" | "NEQUI", texto: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tipo === valor}
      onClick={() => setTipo(valor)}
      disabled={trabajando}
      className={`flex-1 font-body font-700 text-sm px-4 py-2.5 rounded-btn border transition-colors ${
        tipo === valor ? "bg-vino text-crema-papel border-vino" : "bg-white text-tinta-cafe border-borde hover:border-vino"
      }`}
    >
      {texto}
    </button>
  );

  return (
    <div>
      <div role="tablist" aria-label={es ? "Medio de pago" : "Payment method"} className="flex gap-2 mb-5">
        {pestaña("CARD", es ? "Tarjeta" : "Card")}
        {pestaña("NEQUI", "Nequi")}
      </div>

      {tipo === "CARD" ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={ETIQUETA} htmlFor="mp-numero">{es ? "Número de la tarjeta" : "Card number"}</label>
            <input
              id="mp-numero" inputMode="numeric" autoComplete="cc-number" className={ENTRADA}
              value={tarjeta.numero}
              onChange={(e) =>
                setTarjeta({ ...tarjeta, numero: e.target.value.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ") })
              }
            />
          </div>
          <div>
            <label className={ETIQUETA} htmlFor="mp-vence">{es ? "Vence (MM/AA)" : "Expiry (MM/YY)"}</label>
            <input
              id="mp-vence" inputMode="numeric" autoComplete="cc-exp" placeholder="08/28" className={ENTRADA}
              value={tarjeta.vence}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                setTarjeta({ ...tarjeta, vence: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d });
              }}
            />
          </div>
          <div>
            <label className={ETIQUETA} htmlFor="mp-cvc">CVC</label>
            <input
              id="mp-cvc" inputMode="numeric" autoComplete="cc-csc" className={ENTRADA}
              value={tarjeta.cvc}
              onChange={(e) => setTarjeta({ ...tarjeta, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            />
          </div>
          <div className="col-span-2">
            <label className={ETIQUETA} htmlFor="mp-titular">{es ? "Nombre en la tarjeta" : "Name on card"}</label>
            <input
              id="mp-titular" autoComplete="cc-name" className={ENTRADA}
              value={tarjeta.titular}
              onChange={(e) => setTarjeta({ ...tarjeta, titular: e.target.value })}
            />
          </div>
        </div>
      ) : (
        <div>
          <label className={ETIQUETA} htmlFor="mp-nequi">{es ? "Celular de Nequi" : "Nequi phone"}</label>
          <input
            id="mp-nequi" type="tel" inputMode="tel" autoComplete="tel-national" className={ENTRADA}
            value={celular}
            onChange={(e) => setCelular(e.target.value.replace(/\D/g, "").slice(0, 10))}
          />
          <p className="font-body text-tinta-suave text-sm mt-2">
            {es
              ? "Te llega una notificación en la app de Nequi para autorizar los cobros de la suscripción."
              : "You'll get a notification in the Nequi app to authorize the subscription charges."}
          </p>
        </div>
      )}

      <div className="mt-5 space-y-2">
        <label className="flex gap-2 items-start font-body text-sm text-tinta">
          <input type="checkbox" className="mt-1" checked={aceptaTerminos} onChange={(e) => setAceptaTerminos(e.target.checked)} />
          <span>
            {es ? "Acepto los " : "I accept the "}
            <a href={aceptacion?.permalinkTerminos} target="_blank" rel="noopener noreferrer" className="text-vino underline">
              {es ? "términos y condiciones de Wompi" : "Wompi terms and conditions"}
            </a>
            .
          </span>
        </label>
        <label className="flex gap-2 items-start font-body text-sm text-tinta">
          <input type="checkbox" className="mt-1" checked={aceptaDatos} onChange={(e) => setAceptaDatos(e.target.checked)} />
          <span>
            {es ? "Autorizo el " : "I authorize the "}
            <a href={aceptacion?.permalinkDatos} target="_blank" rel="noopener noreferrer" className="text-vino underline">
              {es ? "tratamiento de mis datos personales" : "processing of my personal data"}
            </a>
            .
          </span>
        </label>
      </div>

      {esperandoNequi && (
        <p className="font-body text-verde text-sm mt-4" role="status">
          {es ? "Abre Nequi y autoriza la suscripción. Te esperamos aquí." : "Open Nequi and authorize the subscription. We'll wait here."}
        </p>
      )}
      {error && <p className="font-body text-vino text-sm mt-4" role="alert">{error}</p>}

      <button
        type="button"
        onClick={enviar}
        disabled={!listo || trabajando || ocupado}
        className="w-full mt-5 bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3.5 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {trabajando || ocupado ? (es ? "Procesando…" : "Processing…") : textoBoton}
      </button>

      <p className="font-body text-tinta-suave text-xs mt-3 text-center">
        {es ? "Pago procesado por Wompi. No guardamos los datos de tu tarjeta." : "Payment processed by Wompi. We don't store your card details."}
      </p>
    </div>
  );
}

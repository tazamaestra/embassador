"use client";

import { useState } from "react";
import { ofertasRetencion, type OfertaRetencion } from "@/lib/suscripcion";
import { etiqueta } from "@/lib/format";
import { MOTIVOS_CANCELACION, type Catalogo, type Suscripcion } from "@/lib/types";

// Cancelar en tres pasos, sin trampas:
//   1. Otras opciones (pausar, espaciar, una bolsa, otro perfil). Cada una se
//      aplica con un clic. El botón para seguir cancelando está siempre a la
//      vista y pesa lo mismo que las ofertas.
//   2. Por qué: opciones cerradas, incluida "prefiero no decirlo", y texto libre.
//   3. Confirmar. Cancela de una, sin más pantallas.

const MOTIVOS: Record<(typeof MOTIVOS_CANCELACION)[number], [string, string]> = {
  precio: ["Está muy caro", "It's too expensive"],
  mucho_cafe: ["Me sobra café", "I have too much coffee"],
  sabor: ["No me gustó el sabor", "I didn't like the taste"],
  envios: ["Problemas con los envíos", "Problems with deliveries"],
  otra_marca: ["Voy a comprar otro café", "I'm switching to another coffee"],
  temporal: ["Es algo temporal (viaje, mudanza)", "It's temporary (travel, moving)"],
  otro: ["Otra razón", "Another reason"],
  prefiero_no_decir: ["Prefiero no decirlo", "I'd rather not say"],
};

type Accion = (ruta: string, cuerpo: Record<string, unknown>, mensaje: string) => Promise<boolean>;

export default function CancelarFlujo({
  es, suscripcion, catalogo, accion, onCerrar,
}: {
  es: boolean;
  suscripcion: Suscripcion;
  catalogo: Catalogo;
  accion: Accion;
  onCerrar: () => void;
}) {
  const [paso, setPaso] = useState<"ofertas" | "motivo">("ofertas");
  const [eligiendoPerfil, setEligiendoPerfil] = useState(false);
  const [motivo, setMotivo] = useState<string>("");
  const [texto, setTexto] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const ofertas = ofertasRetencion(suscripcion, catalogo);
  const vistas = ofertas.map((o) => (o.tipo === "pausar" ? `pausar-${o.meses}` : o.tipo));

  async function aceptar(o: OfertaRetencion, perfilId?: string) {
    setTrabajando(true);
    let ok = false;
    if (o.tipo === "pausar") {
      ok = await accion("pausar", { meses: o.meses, retencion: `pausar-${o.meses}` },
        es ? `Listo. Pausada ${o.meses === 1 ? "un mes" : `${o.meses} meses`}; vuelve sola.` : `Done. Paused for ${o.meses} month(s); it resumes on its own.`);
    } else if (o.tipo === "frecuencia") {
      ok = await accion("cambiar", { frecuenciaId: o.frecuenciaId, retencion: "frecuencia" },
        es ? `Listo. Ahora llega ${etiqueta(catalogo.frecuencias, o.frecuenciaId, true).toLowerCase()}.` : `Done. It now arrives ${etiqueta(catalogo.frecuencias, o.frecuenciaId, false).toLowerCase()}.`);
    } else if (o.tipo === "plan") {
      ok = await accion("cambiar", { planId: o.planId, retencion: "plan" },
        es ? `Listo. Pasaste a ${etiqueta(catalogo.planes, o.planId, true)}.` : `Done. You switched to ${etiqueta(catalogo.planes, o.planId, false)}.`);
    } else if (perfilId) {
      ok = await accion("cambiar", { perfilId, retencion: "perfil" },
        es ? `Listo. El próximo envío llega ${etiqueta(catalogo.perfiles, perfilId, true).toLowerCase()}.` : `Done. Your next shipment will be ${etiqueta(catalogo.perfiles, perfilId, false).toLowerCase()}.`);
    }
    setTrabajando(false);
    if (ok) onCerrar();
  }

  async function confirmar() {
    setTrabajando(true);
    const ok = await accion("cancelar", { motivo, texto, ofertasVistas: vistas },
      es ? "Tu suscripción quedó cancelada. No se hacen más cobros." : "Your subscription is cancelled. No more charges.");
    setTrabajando(false);
    if (ok) onCerrar();
  }

  const botonOferta =
    "w-full text-left rounded-card border border-borde bg-white p-4 hover:border-vino transition-colors disabled:opacity-60";
  const textoOferta = (o: OfertaRetencion): [string, string] => {
    switch (o.tipo) {
      case "pausar":
        return es
          ? [`Pausar ${o.meses === 1 ? "un mes" : `${o.meses} meses`}`, "Sin cobros ni envíos. Vuelve sola en la fecha."]
          : [`Pause for ${o.meses} month${o.meses > 1 ? "s" : ""}`, "No charges or shipments. It resumes on its own."];
      case "frecuencia":
        return es
          ? [`Recibirlo ${etiqueta(catalogo.frecuencias, o.frecuenciaId, true).toLowerCase()}`, "Si te está sobrando café."]
          : [`Get it ${etiqueta(catalogo.frecuencias, o.frecuenciaId, false).toLowerCase()}`, "If you have coffee left over."];
      case "plan":
        return es
          ? [`Pasar a ${etiqueta(catalogo.planes, o.planId, true)}`, "Menos bolsas por envío, menos plata."]
          : [`Switch to ${etiqueta(catalogo.planes, o.planId, false)}`, "Fewer bags per shipment, lower price."];
      case "perfil":
        return es ? ["Probar otro perfil", "Si el sabor no era el tuyo."] : ["Try another profile", "If the flavor wasn't for you."];
    }
  };

  return (
    <section className="rounded-card-lg border border-vino/40 bg-white p-6" aria-labelledby="cancelar-titulo">
      {paso === "ofertas" ? (
        <>
          <h2 id="cancelar-titulo" className="font-display font-bold text-tinta text-xl mb-1">
            {es ? "Antes de cancelar" : "Before you cancel"}
          </h2>
          <p className="font-body text-tinta-suave text-sm mb-4">
            {es ? "Si es por una de estas razones, se arregla con un clic. Si no, sigue abajo." : "If it's one of these, one click fixes it. If not, continue below."}
          </p>

          <div className="grid gap-2 mb-5">
            {ofertas.map((o) => {
              const [titulo, detalle] = textoOferta(o);
              if (o.tipo === "perfil" && eligiendoPerfil) {
                return (
                  <div key="perfil" className="rounded-card border border-vino p-4">
                    <p className="font-body font-700 text-tinta text-sm mb-2">{es ? "¿Cuál quieres probar?" : "Which one?"}</p>
                    <div className="flex flex-wrap gap-2">
                      {catalogo.perfiles.filter((p) => p.id !== suscripcion.perfilId).map((p) => (
                        <button key={p.id} type="button" disabled={trabajando} onClick={() => aceptar(o, p.id)}
                          className="font-body font-600 text-sm px-4 py-2 rounded-pill border border-borde hover:border-vino disabled:opacity-60">
                          {es ? p.label_es : p.label_en}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <button key={o.tipo === "pausar" ? `p${o.meses}` : o.tipo} type="button" disabled={trabajando}
                  onClick={() => (o.tipo === "perfil" ? setEligiendoPerfil(true) : aceptar(o))} className={botonOferta}>
                  <span className="font-body font-700 text-tinta text-sm block">{titulo}</span>
                  <span className="font-body text-tinta-suave text-xs block">{detalle}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setPaso("motivo")}
              className="font-body font-700 text-sm px-4 py-2.5 rounded-btn border border-vino text-vino hover:bg-vino hover:text-crema-papel transition-colors">
              {es ? "No, quiero cancelar" : "No, I want to cancel"}
            </button>
            <button type="button" onClick={onCerrar} className="font-body text-sm text-tinta-suave underline">
              {es ? "Volver" : "Back"}
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 id="cancelar-titulo" className="font-display font-bold text-tinta text-xl mb-1">
            {es ? "¿Por qué cancelas?" : "Why are you cancelling?"}
          </h2>
          <p className="font-body text-tinta-suave text-sm mb-4">
            {es ? "Nos sirve para mejorar. Elige una opción." : "It helps us improve. Pick one."}
          </p>

          <div role="radiogroup" aria-label={es ? "Motivo" : "Reason"} className="grid gap-2 mb-4">
            {MOTIVOS_CANCELACION.map((m) => (
              <label key={m} className="flex gap-2 items-center font-body text-sm text-tinta cursor-pointer">
                <input type="radio" name="motivo" value={m} checked={motivo === m} onChange={() => setMotivo(m)} />
                {es ? MOTIVOS[m][0] : MOTIVOS[m][1]}
              </label>
            ))}
          </div>

          <label className="block font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase mb-1" htmlFor="cancelar-texto">
            {es ? "¿Algo más? (opcional)" : "Anything else? (optional)"}
          </label>
          <textarea id="cancelar-texto" rows={3} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)}
            className="w-full bg-white border border-borde rounded-input px-3 py-2 font-body text-sm text-tinta mb-4 focus:outline-none focus:border-naranja" />

          {suscripcion.enviosPrepagadosRestantes > 0 && (
            <p className="font-body text-tinta text-sm mb-4">
              {es
                ? `Te quedan ${suscripcion.enviosPrepagadosRestantes} envíos ya pagados. Te llegan igual, en sus fechas.`
                : `You have ${suscripcion.enviosPrepagadosRestantes} prepaid shipments left. They'll still arrive on their dates.`}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={confirmar} disabled={!motivo || trabajando}
              className="font-body font-700 text-sm px-4 py-2.5 rounded-btn bg-vino hover:bg-vino-800 text-crema-papel disabled:opacity-60">
              {trabajando ? (es ? "Cancelando…" : "Cancelling…") : es ? "Cancelar suscripción" : "Cancel subscription"}
            </button>
            <button type="button" onClick={onCerrar} className="font-body text-sm text-tinta-suave underline">
              {es ? "Mejor no" : "Never mind"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

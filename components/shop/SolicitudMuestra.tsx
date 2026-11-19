"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useCafes } from "@/components/shared/CafesProvider";
import { srcImagen } from "@/lib/cafes";
import { GRAMOS_MUESTRA, MuestraInvalida, validarMuestra, type DatosMuestra } from "@/lib/muestras";
import type { Locale } from "@/lib/types";

// "Pruébalo antes de comprar": muestra de 100 g gratis, el cliente paga el
// envío. Se guarda como solicitud y el equipo la sigue desde el panel.
// Valida aquí lo mismo que el servidor para marcar el campo sin esperar.

const ENTRADA =
  "w-full font-body text-base text-tinta bg-white border border-borde rounded-input px-3.5 py-2.5 focus:border-vino focus:outline-none focus:ring-2 focus:ring-vino/15 aria-[invalid=true]:border-vino";
const ETIQUETA = "block font-mono text-[10px] tracking-[.16em] text-tinta-suave uppercase mb-1.5";

type Estado = "editando" | "enviando" | "lista" | "repetida" | "error";

export default function SolicitudMuestra({ locale }: { locale: Locale }) {
  const es = locale !== "en";
  const cafes = useCafes();
  const [cafe, setCafe] = useState(cafes[0]?.id ?? "");
  const [tipo, setTipo] = useState<"persona" | "negocio">("persona");
  const [estado, setEstado] = useState<Estado>("editando");
  const [campoMalo, setCampoMalo] = useState<keyof DatosMuestra | null>(null);

  const MENSAJES: Partial<Record<keyof DatosMuestra, [string, string]>> = {
    nombre: ["Escribe tu nombre.", "Enter your name."],
    telefono: ["Revisa el teléfono: lo usamos para coordinar el envío.", "Check the phone number: we use it to arrange shipping."],
    email: ["Ese correo no parece válido.", "That email doesn't look right."],
    ciudad: ["¿A qué ciudad la enviamos?", "Which city should we ship to?"],
    direccion: ["Falta la dirección de entrega.", "The delivery address is missing."],
    negocio: ["Escribe el nombre de tu cafetería o negocio.", "Enter your café or business name."],
    cafe: ["Elige un café.", "Pick a coffee."],
  };

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const datos = Object.fromEntries(form.entries()) as Record<string, string>;
    const cuerpo = { ...datos, cafe, tipo };

    try {
      validarMuestra(cuerpo, cafes.map((c) => c.id));
    } catch (err) {
      if (err instanceof MuestraInvalida) {
        setCampoMalo(err.campo);
        (e.currentTarget.elements.namedItem(err.campo) as HTMLElement | null)?.focus();
        return;
      }
      throw err;
    }

    setCampoMalo(null);
    setEstado("enviando");
    try {
      const r = await fetch("/api/muestras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      if (r.ok) return setEstado("lista");
      const cuerpoError = await r.json().catch(() => ({}));
      if (cuerpoError.error === "ya_solicitada") return setEstado("repetida");
      if (cuerpoError.error === "campo_invalido" && cuerpoError.campo) {
        setCampoMalo(cuerpoError.campo);
        return setEstado("editando");
      }
      setEstado("error");
    } catch {
      setEstado("error");
    }
  }

  const error = (campo: keyof DatosMuestra) =>
    campoMalo === campo && MENSAJES[campo] ? (
      <p id={`muestra-${campo}-error`} className="font-body text-xs text-vino mt-1">
        {MENSAJES[campo]![es ? 0 : 1]}
      </p>
    ) : null;
  const invalido = (campo: keyof DatosMuestra) => ({
    "aria-invalid": campoMalo === campo,
    "aria-describedby": campoMalo === campo ? `muestra-${campo}-error` : undefined,
  });

  const elegido = cafes.find((c) => c.id === cafe);

  return (
    <section id="muestra" className="scroll-mt-24 py-16 md:py-20 bg-arena/50 border-t border-borde">
      <div className="max-w-310 mx-auto px-5.5 grid grid-cols-1 lg:grid-cols-[.9fr_1.1fr] gap-10 lg:gap-14 items-start">
        {/* Por qué pedirla */}
        <div className="lg:sticky lg:top-28">
          <p className="font-mono text-[11px] tracking-[.22em] text-dorado uppercase mb-3">
            {es ? "PRUÉBALO ANTES DE COMPRAR" : "TRY BEFORE YOU BUY"}
          </p>
          <h2 className="font-display font-bold text-tinta leading-[1.05] mb-4" style={{ fontSize: "clamp(30px,4vw,48px)" }}>
            {es ? (
              <>Tu primera taza <em className="not-italic text-vino">va por nuestra cuenta.</em></>
            ) : (
              <>Your first cup <em className="not-italic text-vino">is on us.</em></>
            )}
          </h2>
          <p className="font-body text-tinta-suave text-base md:text-lg leading-relaxed mb-6 max-w-120">
            {es
              ? `Te enviamos ${GRAMOS_MUESTRA} g del café que elijas, gratis. Solo pagas el envío. Alcanza para cuatro o cinco tazas: suficiente para saber si es el tuyo.`
              : `We send you ${GRAMOS_MUESTRA} g of the coffee you pick, free. You only pay shipping. That's four or five cups: enough to know if it's yours.`}
          </p>
          <ol className="space-y-3 mb-8">
            {(es
              ? ["Llenas este formulario.", "Te escribimos para confirmar el envío y su costo.", "Te llega la muestra y la pruebas en casa o en tu negocio."]
              : ["Fill in this form.", "We message you to confirm shipping and its cost.", "The sample arrives and you try it at home or at your business."]
            ).map((paso, i) => (
              <li key={i} className="flex items-start gap-3 font-body text-tinta text-sm md:text-base">
                <span className="shrink-0 w-7 h-7 rounded-full bg-vino text-crema-papel font-mono text-xs flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="pt-0.5">{paso}</span>
              </li>
            ))}
          </ol>
          <p className="font-body text-sm text-tinta-suave">
            {es
              ? "¿Tienes una cafetería? Marca la opción de negocio y te contamos de la presentación de 2.250 g."
              : "Run a café? Choose the business option and we'll tell you about the 2,250 g bag."}
          </p>
        </div>

        {/* Formulario */}
        <div className="rounded-card-lg bg-white border border-borde p-6 md:p-8 shadow-card-hover">
          {estado === "lista" || estado === "repetida" ? (
            <div className="text-center py-10 animate-[fadeUp_.4s_ease-out]" role="status">
              <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-verde-claro text-verde flex items-center justify-center text-3xl" aria-hidden="true">
                ✓
              </div>
              <h3 className="font-display font-bold text-tinta text-2xl mb-2">
                {estado === "lista"
                  ? es ? "¡Listo! Tu muestra está en camino." : "Done! Your sample is on its way."
                  : es ? "Ya tenemos tu solicitud." : "We already have your request."}
              </h3>
              <p className="font-body text-tinta-suave text-base max-w-90 mx-auto">
                {estado === "lista"
                  ? es ? "Te escribimos pronto para confirmar el envío." : "We'll message you soon to confirm shipping."
                  : es ? "Con ese teléfono hay una muestra en proceso. Te escribimos pronto." : "There's already a sample in progress for that phone. We'll be in touch soon."}
              </p>
            </div>
          ) : (
            <form onSubmit={enviar} noValidate className="space-y-5">
              {/* Café */}
              <fieldset>
                <legend className={ETIQUETA}>{es ? "¿Qué café quieres probar?" : "Which coffee do you want to try?"}</legend>
                <div className="grid grid-cols-2 gap-3">
                  {cafes.map((c) => {
                    const activo = c.id === cafe;
                    return (
                      <label
                        key={c.id}
                        className={`relative cursor-pointer rounded-card border-2 p-3 flex items-center gap-3 transition-all duration-200 ${
                          activo ? "border-vino bg-vino/5 shadow-md" : "border-borde hover:border-vino/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="cafe-opcion"
                          value={c.id}
                          checked={activo}
                          onChange={() => setCafe(c.id)}
                          className="sr-only"
                        />
                        <span
                          className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center overflow-hidden"
                          style={{ background: c.swatch }}
                          aria-hidden="true"
                        >
                          {c.img && (
                            <Image src={srcImagen(c.img)} alt="" width={44} height={46} className={`transition-transform duration-300 ${activo ? "scale-110" : ""}`} />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-display font-bold text-tinta text-base leading-tight">{c.name}</span>
                          <span className="block font-body text-[11px] text-tinta-suave leading-snug line-clamp-2">
                            {es ? c.notas_es : c.notas_en}
                          </span>
                        </span>
                        {activo && (
                          <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-vino text-crema-papel text-xs flex items-center justify-center animate-[fadeUp_.25s_ease-out]" aria-hidden="true">
                            ✓
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                {error("cafe")}
              </fieldset>

              {/* Para quién */}
              <fieldset>
                <legend className={ETIQUETA}>{es ? "Es para" : "It's for"}</legend>
                <div className="inline-flex rounded-pill bg-arena p-1">
                  {(["persona", "negocio"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={tipo === t}
                      onClick={() => setTipo(t)}
                      className={`font-body font-700 text-sm px-4 py-2 rounded-pill transition-all duration-200 ${
                        tipo === t ? "bg-white text-vino shadow-sm" : "text-tinta-suave hover:text-tinta"
                      }`}
                    >
                      {t === "persona" ? (es ? "Para mí" : "For me") : (es ? "Mi cafetería o negocio" : "My café or business")}
                    </button>
                  ))}
                </div>
              </fieldset>

              {tipo === "negocio" && (
                <div className="animate-[fadeUp_.25s_ease-out]">
                  <label htmlFor="muestra-negocio" className={ETIQUETA}>{es ? "Nombre del negocio" : "Business name"}</label>
                  <input id="muestra-negocio" name="negocio" className={ENTRADA} autoComplete="organization" {...invalido("negocio")} />
                  {error("negocio")}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="muestra-nombre" className={ETIQUETA}>{es ? "Nombre" : "Name"}</label>
                  <input id="muestra-nombre" name="nombre" className={ENTRADA} autoComplete="name" {...invalido("nombre")} />
                  {error("nombre")}
                </div>
                <div>
                  <label htmlFor="muestra-telefono" className={ETIQUETA}>{es ? "WhatsApp o celular" : "WhatsApp or mobile"}</label>
                  <input id="muestra-telefono" name="telefono" type="tel" inputMode="tel" className={ENTRADA} autoComplete="tel" {...invalido("telefono")} />
                  {error("telefono")}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="muestra-email" className={ETIQUETA}>
                    {es ? "Correo" : "Email"} <span className="normal-case tracking-normal">({es ? "opcional" : "optional"})</span>
                  </label>
                  <input id="muestra-email" name="email" type="email" className={ENTRADA} autoComplete="email" {...invalido("email")} />
                  {error("email")}
                </div>
                <div>
                  <label htmlFor="muestra-ciudad" className={ETIQUETA}>{es ? "Ciudad" : "City"}</label>
                  <input id="muestra-ciudad" name="ciudad" className={ENTRADA} autoComplete="address-level2" {...invalido("ciudad")} />
                  {error("ciudad")}
                </div>
                <div>
                  <label htmlFor="muestra-direccion" className={ETIQUETA}>{es ? "Dirección de entrega" : "Delivery address"}</label>
                  <input id="muestra-direccion" name="direccion" className={ENTRADA} autoComplete="street-address" {...invalido("direccion")} />
                  {error("direccion")}
                </div>
              </div>

              {/* Campo trampa: invisible para personas, los bots lo llenan */}
              <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
                <label htmlFor="muestra-sitio">Sitio web</label>
                <input id="muestra-sitio" name="sitio" tabIndex={-1} autoComplete="off" />
              </div>

              {estado === "error" && (
                <p role="alert" className="font-body text-sm text-vino">
                  {es ? "No pudimos guardar la solicitud. Intenta de nuevo en un momento." : "We couldn't save your request. Please try again in a moment."}
                </p>
              )}

              <button
                type="submit"
                disabled={estado === "enviando"}
                className="w-full bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3.5 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {estado === "enviando"
                  ? es ? "Enviando…" : "Sending…"
                  : es
                    ? `Pedir mi muestra de ${elegido?.name ?? "café"}`
                    : `Request my ${elegido?.name ?? "coffee"} sample`}
              </button>
              <p className="font-body text-xs text-tinta-suave text-center">
                {es
                  ? `${GRAMOS_MUESTRA} g gratis · Pagas solo el envío · Una muestra por persona`
                  : `${GRAMOS_MUESTRA} g free · You only pay shipping · One sample per person`}
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth-store";
import { llamarApi } from "@/lib/pago";
import { products } from "@/lib/content";
import { formatCOP } from "@/lib/format";
import {
  EdicionInvalida, aplicarEdiciones, srcImagen, urlFotoCafe, validarDatosEdicion,
  type DatosEdicion, type EdicionCafe,
} from "@/lib/cafes";
import { guardarDatos, guardarFotoProducto, listarEdiciones, quitarFotoProducto } from "@/lib/cafes-admin";
import {
  borrarFotoFinca, esEquipo, guardarFotoFinca, listarFotosFinca, urlFoto, type FotoFinca,
} from "@/lib/finca-fotos";
import BolsaMockup from "@/components/shared/BolsaMockup";
import EditorFoto, { ENTRADA, ETIQUETA } from "@/components/admin/EditorFoto";
import type { Locale, Product } from "@/lib/types";

// Panel del equipo: todo lo que se edita de un café. Nombre, precios, notas
// y propósito van a cafe_ediciones; la foto del producto al bucket `cafes`;
// la de la finca a finca_fotos. Al guardar, el sitio se refresca solo.

type Permiso = "verificando" | "concedido" | "denegado";

export default function AdminCafes({ locale }: { locale: Locale }) {
  const es = locale !== "en";
  const router = useRouter();
  const { user, loading: authLoading, init } = useAuthStore();

  const [permiso, setPermiso] = useState<Permiso>("verificando");
  const [ediciones, setEdiciones] = useState<Record<string, EdicionCafe>>({});
  const [fotosFinca, setFotosFinca] = useState<Record<string, FotoFinca>>({});
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/acceso");
  }, [authLoading, user, router]);

  // El permiso lo responde Postgres, no el navegador: aunque alguien fuerce
  // esta pantalla, las policies de las tablas y los buckets no lo dejan escribir.
  useEffect(() => {
    if (!user) return;
    let vigente = true;

    (async () => {
      try {
        const autorizado = await esEquipo();
        if (!vigente) return;
        setPermiso(autorizado ? "concedido" : "denegado");
        if (!autorizado) return;

        const [lista, fotos] = await Promise.all([listarEdiciones(), listarFotosFinca()]);
        if (!vigente) return;
        setEdiciones(Object.fromEntries(lista.map((e) => [e.productoSlug, e])));
        setFotosFinca(Object.fromEntries(fotos.map((f) => [f.productoSlug, f])));
        setCargado(true);
      } catch {
        if (vigente) {
          setError(
            es
              ? "No se pudo cargar el panel. ¿Ya se corrió supabase/sql/cafe_ediciones.sql?"
              : "Couldn't load the panel. Has supabase/sql/cafe_ediciones.sql been run?"
          );
        }
      }
    })();

    return () => {
      vigente = false;
    };
  }, [user?.id, es]);

  const alEditar = useCallback((e: EdicionCafe) => {
    setEdiciones((previas) => ({ ...previas, [e.productoSlug]: e }));
  }, []);

  const alCambiarFotoFinca = useCallback((slug: string, foto: FotoFinca | null) => {
    setFotosFinca((previas) => {
      const copia = { ...previas };
      if (foto) copia[slug] = foto;
      else delete copia[slug];
      return copia;
    });
  }, []);

  if (authLoading || permiso === "verificando") {
    return (
      <div className="bg-fondo min-h-[60vh] flex items-center justify-center">
        <p className="font-body text-tinta-suave text-base">{es ? "Verificando permisos…" : "Checking permissions…"}</p>
      </div>
    );
  }

  if (permiso === "denegado") {
    return (
      <div className="bg-fondo min-h-[60vh] flex items-center justify-center px-[22px]">
        <div className="text-center max-w-[420px]">
          <h1 className="font-display font-bold text-tinta text-3xl mb-3">{es ? "Panel del equipo" : "Team panel"}</h1>
          <p className="font-body text-tinta-suave text-base">
            {es
              ? "Esta cuenta no está en el equipo interno. Si crees que debería estarlo, pide que te agreguen a la tabla de usuarios."
              : "This account isn't on the internal team. If it should be, ask to be added to the users table."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-fondo min-h-screen pb-16">
      <div className="max-w-[900px] mx-auto px-[22px]">
        <h1 className="font-display font-bold text-tinta text-3xl mb-1">{es ? "Cafés" : "Coffees"}</h1>
        <p className="font-body text-tinta-suave text-sm mb-8">
          {es
            ? "Nombre, precios, notas, propósito y fotos de cada café. Lo que guardes se ve en la tienda, las fichas y el home en la próxima visita. Un campo vacío vuelve al valor original."
            : "Name, prices, notes, purpose and photos for each coffee. What you save shows in the shop, product pages and home on the next visit. An empty field goes back to the original value."}
        </p>

        {error && (
          <p className="font-body text-vino text-sm mb-6" role="alert">
            {error}
          </p>
        )}

        {cargado && (
          <div className="space-y-4">
            {products.map((base) => (
              <EditorCafe
                key={base.id}
                base={base}
                edicion={ediciones[base.id]}
                fotoFinca={fotosFinca[base.id]}
                es={es}
                onEditar={alEditar}
                onFotoFinca={alCambiarFotoFinca}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Un café ────────────────────────────────────────────────────────────────

type Campo = keyof DatosEdicion;
type Formulario = Record<Campo, string>;

const CAMPOS: Campo[] = [
  "nombre", "precioCop", "precioSuscriptorCop", "precioUsd", "precioSuscriptorUsd",
  "notasEs", "notasEn", "propositoEs", "propositoEn",
];

/** Lo que se ve hoy (JSON + edición), como texto para los inputs. */
function formularioDe(p: Product): Formulario {
  return {
    nombre: p.name,
    precioCop: String(p.precioCop),
    precioSuscriptorCop: String(p.precioSuscriptorCop),
    precioUsd: p.precioUsd === undefined ? "" : String(p.precioUsd),
    precioSuscriptorUsd: p.precioSuscriptorUsd === undefined ? "" : String(p.precioSuscriptorUsd),
    notasEs: p.notas_es,
    notasEn: p.notas_en,
    propositoEs: p.historia_es ?? "",
    propositoEn: p.historia_en ?? "",
  };
}

function mensajeCampo(campo: string, es: boolean): string {
  const m: Record<string, [string, string]> = {
    nombre: ["El nombre no puede pasar de 60 caracteres.", "The name can't be longer than 60 characters."],
    precioCop: ["El precio de compra única debe ser un número entero mayor que cero.", "The one-time price must be a whole number above zero."],
    precioSuscriptorCop: [
      "El precio de suscriptor debe ser un entero mayor que cero y no más alto que el de compra única.",
      "The subscriber price must be a whole number above zero and not higher than the one-time price.",
    ],
    precioUsd: ["El precio en dólares debe ser mayor que cero.", "The USD price must be above zero."],
    precioSuscriptorUsd: [
      "El precio de suscriptor en dólares debe ser mayor que cero y no más alto que el de compra única.",
      "The subscriber USD price must be above zero and not higher than the one-time price.",
    ],
    notasEs: ["Las notas no pueden pasar de 200 caracteres.", "Notes can't be longer than 200 characters."],
    notasEn: ["Las notas no pueden pasar de 200 caracteres.", "Notes can't be longer than 200 characters."],
    propositoEs: ["El propósito no puede pasar de 1.200 caracteres.", "The purpose can't be longer than 1,200 characters."],
    propositoEn: ["El propósito no puede pasar de 1.200 caracteres.", "The purpose can't be longer than 1,200 characters."],
  };
  const par = m[campo] ?? ["Revisa los datos.", "Check the fields."];
  return es ? par[0] : par[1];
}

function EditorCafe({
  base,
  edicion,
  fotoFinca,
  es,
  onEditar,
  onFotoFinca,
}: {
  base: Product;
  edicion?: EdicionCafe;
  fotoFinca?: FotoFinca;
  es: boolean;
  onEditar: (e: EdicionCafe) => void;
  onFotoFinca: (slug: string, foto: FotoFinca | null) => void;
}) {
  const actual = useMemo(() => aplicarEdiciones([base], edicion ? [edicion] : [])[0], [base, edicion]);
  const original = useMemo(() => formularioDe(base), [base]);
  const guardado = useMemo(() => formularioDe(actual), [actual]);

  const [form, setForm] = useState<Formulario>(guardado);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  // Si la edición cambia desde fuera (otra foto, restablecer), el form la sigue.
  useEffect(() => setForm(guardado), [guardado]);

  const cambiado = CAMPOS.some((c) => form[c].trim() !== guardado[c].trim());
  const editado = Boolean(edicion) && CAMPOS.some((c) => guardado[c].trim() !== original[c].trim());

  const poner = (campo: Campo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    setAviso(null);
  };

  async function guardar(valores: Formulario) {
    // Igual al JSON = se guarda null: el café vuelve a seguir al catálogo base.
    const crudo = Object.fromEntries(
      CAMPOS.map((c) => [c, valores[c].trim() === original[c].trim() ? null : valores[c].trim() || null])
    );

    let datos: DatosEdicion;
    try {
      datos = validarDatosEdicion(crudo, base);
    } catch (e) {
      if (e instanceof EdicionInvalida) {
        setAviso({ tipo: "error", texto: mensajeCampo(e.campo, es) });
        return;
      }
      throw e;
    }

    setOcupado(true);
    setAviso(null);
    const r = await guardarDatos(base.id, datos);
    setOcupado(false);
    if (!r.ok) {
      setAviso({ tipo: "error", texto: es ? "No se pudo guardar. Intenta de nuevo." : "Couldn't save. Try again." });
      return;
    }
    onEditar(r.edicion);
    setAviso({
      tipo: "ok",
      texto: es ? "Guardado. El sitio lo muestra en la próxima visita." : "Saved. The site shows it on the next visit.",
    });
  }

  const miniatura = actual.img ? (
    <Image src={srcImagen(actual.img)} alt="" fill sizes="56px" className="object-contain p-1" />
  ) : (
    <BolsaMockup
      id={`admin-${base.id}`}
      nombre={actual.name}
      region={base.region}
      proceso={es ? base.proceso_es : base.proceso_en}
      {...base.bolsa}
      decorativa
      className="absolute inset-0 m-auto h-full w-auto p-1"
    />
  );

  return (
    <details className="group rounded-card border border-borde bg-white open:shadow-card-hover">
      <summary className="flex items-center gap-4 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="relative w-14 h-14 rounded-card overflow-hidden shrink-0" style={{ background: base.swatch }}>
          {miniatura}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-tinta text-xl leading-tight truncate">
            {actual.name}
            {editado && (
              <span className="ml-2 align-middle font-mono text-[9px] tracking-[.15em] uppercase text-naranja-700 bg-naranja/10 px-1.5 py-0.5 rounded-pill">
                {es ? "editado" : "edited"}
              </span>
            )}
          </p>
          <p className="font-mono text-[10px] tracking-[.12em] text-tinta-suave uppercase truncate">
            {base.finca} · {formatCOP(actual.precioCop)} · {es ? "suscrito" : "subscribed"} {formatCOP(actual.precioSuscriptorCop)}
          </p>
        </div>
        <span aria-hidden="true" className="text-tinta-suave transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="border-t border-borde p-5 space-y-8">
        {/* Datos */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void guardar(form);
          }}
          className="space-y-4"
        >
          <div>
            <label className={ETIQUETA} htmlFor={`nombre-${base.id}`}>{es ? "Nombre" : "Name"}</label>
            <input id={`nombre-${base.id}`} value={form.nombre} onChange={poner("nombre")} maxLength={60} disabled={ocupado} className={ENTRADA} placeholder={base.name} />
          </div>

          <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <legend className={`${ETIQUETA} mb-2`}>{es ? "Precios por bolsa" : "Prices per bag"}</legend>
            <div>
              <label className={ETIQUETA} htmlFor={`cop-${base.id}`}>{es ? "Compra única (COP)" : "One-time (COP)"}</label>
              <input id={`cop-${base.id}`} type="number" inputMode="numeric" min={1} step={1} value={form.precioCop} onChange={poner("precioCop")} disabled={ocupado} className={ENTRADA} />
            </div>
            <div>
              <label className={ETIQUETA} htmlFor={`cop-sus-${base.id}`}>{es ? "Suscriptor (COP)" : "Subscriber (COP)"}</label>
              <input id={`cop-sus-${base.id}`} type="number" inputMode="numeric" min={1} step={1} value={form.precioSuscriptorCop} onChange={poner("precioSuscriptorCop")} disabled={ocupado} className={ENTRADA} />
            </div>
            <div>
              <label className={ETIQUETA} htmlFor={`usd-${base.id}`}>{es ? "Compra única (USD)" : "One-time (USD)"}</label>
              <input id={`usd-${base.id}`} type="number" inputMode="decimal" min={0.01} step={0.01} value={form.precioUsd} onChange={poner("precioUsd")} disabled={ocupado} className={ENTRADA} />
            </div>
            <div>
              <label className={ETIQUETA} htmlFor={`usd-sus-${base.id}`}>{es ? "Suscriptor (USD)" : "Subscriber (USD)"}</label>
              <input id={`usd-sus-${base.id}`} type="number" inputMode="decimal" min={0.01} step={0.01} value={form.precioSuscriptorUsd} onChange={poner("precioSuscriptorUsd")} disabled={ocupado} className={ENTRADA} />
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={ETIQUETA} htmlFor={`notas-es-${base.id}`}>{es ? "Notas de cata (ES)" : "Tasting notes (ES)"}</label>
              <textarea id={`notas-es-${base.id}`} rows={2} maxLength={200} value={form.notasEs} onChange={poner("notasEs")} disabled={ocupado} className={ENTRADA} />
            </div>
            <div>
              <label className={ETIQUETA} htmlFor={`notas-en-${base.id}`}>{es ? "Notas de cata (EN)" : "Tasting notes (EN)"}</label>
              <textarea id={`notas-en-${base.id}`} rows={2} maxLength={200} value={form.notasEn} onChange={poner("notasEn")} disabled={ocupado} className={ENTRADA} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={ETIQUETA} htmlFor={`prop-es-${base.id}`}>{es ? "Propósito de la finca (ES)" : "Farm purpose (ES)"}</label>
              <textarea id={`prop-es-${base.id}`} rows={5} maxLength={1200} value={form.propositoEs} onChange={poner("propositoEs")} disabled={ocupado} className={ENTRADA} />
            </div>
            <div>
              <label className={ETIQUETA} htmlFor={`prop-en-${base.id}`}>{es ? "Propósito de la finca (EN)" : "Farm purpose (EN)"}</label>
              <textarea id={`prop-en-${base.id}`} rows={5} maxLength={1200} value={form.propositoEn} onChange={poner("propositoEn")} disabled={ocupado} className={ENTRADA} />
            </div>
          </div>
          <p className="font-body text-tinta-suave text-xs -mt-2">
            {es
              ? "El propósito se muestra en la ficha del café, al lado de la foto de la finca."
              : "The purpose shows on the coffee's page, next to the farm photo."}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={ocupado || !cambiado}
              className="font-body font-700 text-sm px-5 py-2.5 rounded-btn bg-naranja hover:bg-naranja-700 text-white transition-colors disabled:opacity-50"
            >
              {ocupado ? (es ? "Guardando…" : "Saving…") : es ? "Guardar cambios" : "Save changes"}
            </button>
            {cambiado && !ocupado && (
              <button type="button" onClick={() => { setForm(guardado); setAviso(null); }} className="font-body text-sm text-tinta-suave underline hover:text-vino">
                {es ? "Descartar" : "Discard"}
              </button>
            )}
            {editado && !cambiado && !ocupado && (
              <button type="button" onClick={() => void guardar(original)} className="font-body text-sm text-tinta-suave underline hover:text-vino">
                {es ? "Volver a los datos originales" : "Restore original data"}
              </button>
            )}
          </div>
          {aviso && (
            <p className={`font-body text-sm ${aviso.tipo === "ok" ? "text-verde" : "text-vino"}`} role={aviso.tipo === "error" ? "alert" : "status"}>
              {aviso.texto}
            </p>
          )}
        </form>

        {/* Foto del producto */}
        <div className="border-t border-borde pt-6">
          <EditorFoto
            id={`producto-${base.id}`}
            es={es}
            titulo={es ? "Foto del producto" : "Product photo"}
            ayuda={
              es
                ? "La bolsa, idealmente PNG con fondo transparente. Sin foto se muestra el mockup."
                : "The bag, ideally a PNG with a transparent background. Without one, the mockup shows."
            }
            urlActual={edicion?.fotoPath ? urlFotoCafe(edicion.fotoPath) : null}
            ajuste="contain"
            fondo={base.swatch}
            onGuardar={async (imagen) => {
              const r = await guardarFotoProducto(base.id, imagen, edicion?.fotoPath ?? null);
              if (r.ok) onEditar(r.edicion);
              return r.ok;
            }}
            onQuitar={async () => {
              if (!edicion?.fotoPath) return true;
              const r = await quitarFotoProducto(base.id, edicion.fotoPath);
              if (r.ok) onEditar(r.edicion);
              return r.ok;
            }}
          />
        </div>

        {/* Foto de la finca */}
        <div className="border-t border-borde pt-6">
          <EditorFoto
            key={fotoFinca?.storagePath ?? "sin-foto"}
            id={`finca-${base.id}`}
            es={es}
            titulo={es ? `Foto de la finca ${base.finca}` : `${base.finca} farm photo`}
            ayuda={
              es
                ? "Se ve en la ficha del café junto al propósito. Se reduce a 1600 px y se guarda en WebP."
                : "Shows on the coffee's page next to the purpose. Resized to 1600 px and saved as WebP."
            }
            urlActual={fotoFinca ? urlFoto(fotoFinca.storagePath) : null}
            alt={{ es: fotoFinca?.altEs ?? "", en: fotoFinca?.altEn ?? "" }}
            ajuste="cover"
            onGuardar={async (imagen, alt) => {
              const foto = await guardarFotoFinca(base.id, imagen, alt);
              onFotoFinca(base.id, foto);
              void llamarApi(`/api/admin/fincas/${base.id}`, { method: "POST" });
              return true;
            }}
            onQuitar={async () => {
              await borrarFotoFinca(base.id);
              onFotoFinca(base.id, null);
              void llamarApi(`/api/admin/fincas/${base.id}`, { method: "POST" });
              return true;
            }}
          />
        </div>
      </div>
    </details>
  );
}

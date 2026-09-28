"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { comprimirImagen, formatearBytes, type ImagenComprimida } from "@/lib/imagen";

// Elegir, comprimir, previsualizar, subir y quitar una foto. Lo usan la foto
// del producto y la de la finca; quién guarda y dónde lo decide el padre.

export const ENTRADA =
  "w-full bg-white border border-borde rounded-input px-3 py-2 font-body text-tinta text-sm focus:outline-none focus:border-naranja focus:ring-1 focus:ring-naranja transition-colors";
export const ETIQUETA =
  "block font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase mb-1";

interface Props {
  id: string;
  es: boolean;
  titulo: string;
  ayuda?: string;
  urlActual: string | null;
  /** Descripción para lectores de pantalla; solo la pide la foto de finca. */
  alt?: { es: string; en: string };
  /** "contain" para la bolsa (fondo de color), "cover" para la finca. */
  ajuste: "contain" | "cover";
  fondo?: string;
  onGuardar: (imagen: ImagenComprimida, alt: { es: string; en: string }) => Promise<boolean>;
  onQuitar?: () => Promise<boolean>;
}

export default function EditorFoto({ id, es, titulo, ayuda, urlActual, alt, ajuste, fondo, onGuardar, onQuitar }: Props) {
  const [elegida, setElegida] = useState<ImagenComprimida | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [bytesOriginales, setBytesOriginales] = useState(0);
  const [altEs, setAltEs] = useState(alt?.es ?? "");
  const [altEn, setAltEn] = useState(alt?.en ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState("");
  const [archivoKey, setArchivoKey] = useState(0);
  const pideAlt = alt !== undefined;

  // La vista previa es un object URL: si no se revoca, el blob se queda en
  // memoria hasta que se recargue la página.
  useEffect(() => {
    if (!elegida) {
      setVistaPrevia("");
      return;
    }
    const url = URL.createObjectURL(elegida.blob);
    setVistaPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [elegida]);

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setFallo("");
    setOcupado(true);
    try {
      setBytesOriginales(archivo.size);
      setElegida(await comprimirImagen(archivo));
    } catch {
      setFallo(es ? "No se pudo leer esa imagen." : "Couldn't read that image.");
      setElegida(null);
    } finally {
      setOcupado(false);
    }
  }

  async function subir() {
    if (!elegida) return;
    if (pideAlt && (!altEs.trim() || !altEn.trim())) {
      setFallo(es ? "Falta la descripción en los dos idiomas." : "The description is missing in both languages.");
      return;
    }
    setFallo("");
    setOcupado(true);
    try {
      if (await onGuardar(elegida, { es: altEs.trim(), en: altEn.trim() })) {
        setElegida(null);
        setBytesOriginales(0);
        setArchivoKey((k) => k + 1);
      } else {
        setFallo(es ? "No se pudo guardar la foto." : "Couldn't save the photo.");
      }
    } catch {
      setFallo(es ? "No se pudo guardar la foto." : "Couldn't save the photo.");
    } finally {
      setOcupado(false);
    }
  }

  async function quitar() {
    if (!onQuitar) return;
    setFallo("");
    setOcupado(true);
    try {
      if (await onQuitar()) {
        setAltEs("");
        setAltEn("");
      } else {
        setFallo(es ? "No se pudo quitar la foto." : "Couldn't remove the photo.");
      }
    } catch {
      setFallo(es ? "No se pudo quitar la foto." : "Couldn't remove the photo.");
    } finally {
      setOcupado(false);
    }
  }

  const url = vistaPrevia || urlActual || "";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4">
      <div
        className="relative aspect-4/3 rounded-card overflow-hidden border border-borde bg-arena"
        style={fondo ? { background: fondo } : undefined}
      >
        {url ? (
          <Image
            src={url}
            alt={vistaPrevia ? (es ? "Vista previa de la foto elegida" : "Preview of the chosen photo") : titulo}
            fill
            sizes="160px"
            // La vista previa es un blob local; el optimizador no la toca.
            unoptimized={Boolean(vistaPrevia)}
            className={ajuste === "cover" ? "object-cover" : "object-contain p-2"}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-mono text-[10px] tracking-widest uppercase ${fondo ? "text-white/70" : "text-tinta-suave"}`}>
              {es ? "sin foto" : "no photo"}
            </span>
          </div>
        )}
      </div>

      <div>
        <label className={ETIQUETA} htmlFor={`archivo-${id}`}>
          {titulo}
        </label>
        {ayuda && <p className="font-body text-tinta-suave text-xs mb-2">{ayuda}</p>}
        <input
          key={archivoKey}
          id={`archivo-${id}`}
          type="file"
          accept="image/*"
          disabled={ocupado}
          onChange={alElegirArchivo}
          className="block w-full font-body text-sm text-tinta-suave mb-3 file:mr-3 file:px-3 file:py-2 file:rounded-btn file:border-0 file:bg-arena file:font-body file:font-700 file:text-sm file:text-vino hover:file:bg-arena/70"
        />

        {elegida && (
          <p className="font-mono text-[11px] text-verde mb-3">
            {formatearBytes(bytesOriginales)} → {formatearBytes(elegida.blob.size)} · {elegida.ancho}×{elegida.alto}{" "}
            {elegida.extension.toUpperCase()}
          </p>
        )}

        {pideAlt && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className={ETIQUETA} htmlFor={`alt-es-${id}`}>
                {es ? "Descripción (ES)" : "Description (ES)"}
              </label>
              <input id={`alt-es-${id}`} value={altEs} onChange={(e) => setAltEs(e.target.value)} disabled={ocupado} className={ENTRADA} />
            </div>
            <div>
              <label className={ETIQUETA} htmlFor={`alt-en-${id}`}>
                {es ? "Descripción (EN)" : "Description (EN)"}
              </label>
              <input id={`alt-en-${id}`} value={altEn} onChange={(e) => setAltEn(e.target.value)} disabled={ocupado} className={ENTRADA} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={subir}
            disabled={ocupado || !elegida}
            className="font-body font-700 text-sm px-4 py-2 rounded-btn transition-colors bg-vino hover:bg-vino-800 text-crema-papel disabled:opacity-50"
          >
            {ocupado ? (es ? "Un momento…" : "One moment…") : es ? "Guardar foto" : "Save photo"}
          </button>
          {urlActual && onQuitar && (
            <button
              type="button"
              onClick={quitar}
              disabled={ocupado}
              className="font-body font-700 text-sm px-4 py-2 rounded-btn border border-borde-2 text-tinta-cafe hover:border-vino hover:text-vino transition-colors disabled:opacity-50"
            >
              {es ? "Quitar" : "Remove"}
            </button>
          )}
        </div>

        {fallo && (
          <p className="font-body text-vino text-sm mt-3" role="alert">
            {fallo}
          </p>
        )}
      </div>
    </div>
  );
}

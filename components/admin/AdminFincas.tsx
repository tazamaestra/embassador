"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth-store";
import { products } from "@/lib/content";
import { comprimirImagen, formatearBytes, type ImagenComprimida } from "@/lib/imagen";
import {
  borrarFotoFinca, esEquipo, guardarFotoFinca, listarFotosFinca, urlFoto,
  type FotoFinca,
} from "@/lib/finca-fotos";
import type { Locale, Product } from "@/lib/types";

type Permiso = "verificando" | "concedido" | "denegado";

const ENTRADA =
  "w-full bg-white border border-borde rounded-input px-3 py-2 font-body text-tinta text-sm focus:outline-none focus:border-naranja focus:ring-1 focus:ring-naranja transition-colors";
const ETIQUETA =
  "block font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase mb-1";

export default function AdminFincas({ locale }: { locale: Locale }) {
  const es = locale !== "en";
  const router = useRouter();
  const { user, loading: authLoading, init } = useAuthStore();

  const [permiso, setPermiso] = useState<Permiso>("verificando");
  const [fotos, setFotos] = useState<Record<string, FotoFinca>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/acceso");
  }, [authLoading, user, router]);

  // El permiso lo responde Postgres, no el navegador: aunque alguien fuerce
  // esta pantalla, las policies del bucket y de la tabla no lo dejan escribir.
  useEffect(() => {
    if (!user) return;
    let vigente = true;

    (async () => {
      try {
        const autorizado = await esEquipo();
        if (!vigente) return;
        setPermiso(autorizado ? "concedido" : "denegado");
        if (!autorizado) return;

        const lista = await listarFotosFinca();
        if (!vigente) return;
        setFotos(Object.fromEntries(lista.map((f) => [f.productoSlug, f])));
      } catch {
        if (vigente) setError(es ? "No se pudo cargar el panel." : "Couldn't load the panel.");
      }
    })();

    return () => {
      vigente = false;
    };
  }, [user?.id, es]);

  const alGuardar = useCallback((foto: FotoFinca) => {
    setFotos((previas) => ({ ...previas, [foto.productoSlug]: foto }));
  }, []);

  const alBorrar = useCallback((slug: string) => {
    setFotos((previas) => {
      const copia = { ...previas };
      delete copia[slug];
      return copia;
    });
  }, []);

  if (authLoading || permiso === "verificando") {
    return (
      <div className="bg-fondo min-h-[60vh] flex items-center justify-center">
        <p className="font-body text-tinta-suave text-base">
          {es ? "Verificando permisos…" : "Checking permissions…"}
        </p>
      </div>
    );
  }

  if (permiso === "denegado") {
    return (
      <div className="bg-fondo min-h-[60vh] flex items-center justify-center px-[22px]">
        <div className="text-center max-w-[420px]">
          <h1 className="font-display font-bold text-tinta text-3xl mb-3">
            {es ? "Panel del equipo" : "Team panel"}
          </h1>
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
    <div className="bg-fondo min-h-screen py-10">
      <div className="max-w-[760px] mx-auto px-[22px]">
        <h1 className="font-display font-bold text-tinta text-3xl mb-1">
          {es ? "Fotos de finca" : "Farm photos"}
        </h1>
        <p className="font-body text-tinta-suave text-sm mb-8">
          {es
            ? "Se comprimen en tu navegador antes de subirse: se reducen a 1600 px de lado y se guardan en WebP."
            : "They're compressed in your browser before uploading: resized to 1600 px and saved as WebP."}
        </p>

        {error && (
          <p className="font-body text-vino text-sm mb-6" role="alert">
            {error}
          </p>
        )}

        <div className="space-y-4">
          {products.map((producto) => (
            <FilaFinca
              key={producto.id}
              producto={producto}
              foto={fotos[producto.id]}
              es={es}
              onGuardar={alGuardar}
              onBorrar={alBorrar}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FilaFinca({
  producto,
  foto,
  es,
  onGuardar,
  onBorrar,
}: {
  producto: Product;
  foto?: FotoFinca;
  es: boolean;
  onGuardar: (foto: FotoFinca) => void;
  onBorrar: (slug: string) => void;
}) {
  const [elegida, setElegida] = useState<ImagenComprimida | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [bytesOriginales, setBytesOriginales] = useState(0);
  const [altEs, setAltEs] = useState(foto?.altEs ?? "");
  const [altEn, setAltEn] = useState(foto?.altEn ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState("");

  // La vista previa es un object URL: si no se revoca, el blob se queda en
  // memoria hasta que se recargue la página.
  useEffect(() => {
    if (!elegida) return;
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
    if (!altEs.trim() || !altEn.trim()) {
      setFallo(
        es
          ? "Falta la descripción en los dos idiomas."
          : "The description is missing in both languages."
      );
      return;
    }

    setFallo("");
    setOcupado(true);
    try {
      onGuardar(
        await guardarFotoFinca(producto.id, elegida, {
          es: altEs.trim(),
          en: altEn.trim(),
        })
      );
      setElegida(null);
      setBytesOriginales(0);
    } catch {
      setFallo(es ? "No se pudo guardar la foto." : "Couldn't save the photo.");
    } finally {
      setOcupado(false);
    }
  }

  async function quitar() {
    setFallo("");
    setOcupado(true);
    try {
      await borrarFotoFinca(producto.id);
      onBorrar(producto.id);
      setAltEs("");
      setAltEn("");
    } catch {
      setFallo(es ? "No se pudo quitar la foto." : "Couldn't remove the photo.");
    } finally {
      setOcupado(false);
    }
  }

  const url = vistaPrevia || (foto ? urlFoto(foto.storagePath) : "");

  return (
    <section className="rounded-card border border-borde bg-white p-6">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="font-display font-bold text-tinta text-xl">{producto.name}</h2>
        <p className="font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase">
          {producto.finca} · {producto.region}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5">
        <div
          className="relative aspect-4/3 rounded-card overflow-hidden border border-borde bg-arena"
          aria-hidden={!url}
        >
          {url ? (
            <Image
              src={url}
              alt={
                vistaPrevia
                  ? es ? "Vista previa de la foto elegida" : "Preview of the chosen photo"
                  : (es ? foto?.altEs : foto?.altEn) ?? ""
              }
              fill
              sizes="180px"
              // La vista previa es un blob local; el optimizador no la toca.
              unoptimized={Boolean(vistaPrevia)}
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-[10px] text-tinta-suave tracking-widest uppercase">
                {es ? "sin foto" : "no photo"}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className={ETIQUETA} htmlFor={`archivo-${producto.id}`}>
            {es ? "Foto de la finca" : "Farm photo"}
          </label>
          <input
            id={`archivo-${producto.id}`}
            type="file"
            accept="image/*"
            disabled={ocupado}
            onChange={alElegirArchivo}
            className="block w-full font-body text-sm text-tinta-suave mb-3 file:mr-3 file:px-3 file:py-2 file:rounded-btn file:border-0 file:bg-arena file:font-body file:font-700 file:text-sm file:text-vino hover:file:bg-arena/70"
          />

          {elegida && (
            <p className="font-mono text-[11px] text-verde mb-3">
              {formatearBytes(bytesOriginales)} → {formatearBytes(elegida.blob.size)} ·{" "}
              {elegida.ancho}×{elegida.alto} {elegida.extension.toUpperCase()}
            </p>
          )}

          {foto && !elegida && (
            <p className="font-mono text-[11px] text-tinta-suave mb-3">
              {formatearBytes(foto.bytes)} · {foto.ancho}×{foto.alto}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className={ETIQUETA} htmlFor={`alt-es-${producto.id}`}>
                {es ? "Descripción (ES)" : "Description (ES)"}
              </label>
              <input
                id={`alt-es-${producto.id}`}
                value={altEs}
                onChange={(e) => setAltEs(e.target.value)}
                disabled={ocupado}
                className={ENTRADA}
              />
            </div>
            <div>
              <label className={ETIQUETA} htmlFor={`alt-en-${producto.id}`}>
                {es ? "Descripción (EN)" : "Description (EN)"}
              </label>
              <input
                id={`alt-en-${producto.id}`}
                value={altEn}
                onChange={(e) => setAltEn(e.target.value)}
                disabled={ocupado}
                className={ENTRADA}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={subir}
              disabled={ocupado || !elegida}
              className="font-body font-700 text-sm px-4 py-2.5 rounded-btn transition-colors bg-vino hover:bg-vino-800 text-crema-papel disabled:opacity-50"
            >
              {ocupado ? (es ? "Un momento…" : "One moment…") : es ? "Guardar foto" : "Save photo"}
            </button>

            {foto && (
              <button
                onClick={quitar}
                disabled={ocupado}
                className="font-body font-700 text-sm px-4 py-2.5 rounded-btn border border-borde-2 text-tinta-cafe hover:border-vino hover:text-vino transition-colors disabled:opacity-50"
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
    </section>
  );
}

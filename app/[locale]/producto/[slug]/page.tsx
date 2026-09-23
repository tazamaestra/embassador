import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { findProduct, products } from "@/lib/content";
import { obtenerFotoFinca, urlFoto } from "@/lib/finca-fotos";
import ProductoScreen from "@/components/shop/ProductoScreen";
import type { Locale } from "@/lib/types";

// La ficha se prerenderiza, así que la foto de finca se lee al generar. Se
// revisa cada cinco minutos: subir una foto nueva en /admin la publica sin
// tener que volver a desplegar.
export const revalidate = 300;

/** Las fichas de café no cambian entre visitas: se generan todas en el build. */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    products.map((producto) => ({ locale, slug: producto.id }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const producto = findProduct(slug);
  if (!producto) return {};

  return {
    title: `${producto.name} · Taza Maestra`,
    description: locale === "en" ? producto.notas_en : producto.notas_es,
  };
}

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // Antes el "no encontrado" era una pantalla más dentro del componente
  // cliente. Ahora un slug que no existe es un 404 de verdad.
  if (!findProduct(slug)) notFound();

  // Que falle la foto no puede tumbar la ficha ni el build: si Supabase no
  // responde, la página sale igual, solo que sin foto de finca.
  const foto = await obtenerFotoFinca(slug).catch(() => null);

  return (
    <ProductoScreen
      slug={slug}
      foto={
        foto && {
          url: urlFoto(foto.storagePath),
          ancho: foto.ancho,
          alto: foto.alto,
          alt: locale === "en" ? foto.altEn : foto.altEs,
        }
      }
    />
  );
}

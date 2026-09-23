import { setRequestLocale } from "next-intl/server";
import BlogScreen from "@/components/blog/BlogScreen";
import type { Locale } from "@/lib/types";

// La página es de servidor y el listado una isla cliente (los filtros tienen
// estado). Así la ruta se prerenderiza en el build: el HTML con las historias
// ya va en la respuesta, y el JS solo la vuelve interactiva.
export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <BlogScreen />;
}

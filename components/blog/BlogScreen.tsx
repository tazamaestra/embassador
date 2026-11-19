"use client";

import { useLocale } from "next-intl";
import NuestraHistoria from "@/components/blog/NuestraHistoria";
import type { Locale } from "@/lib/types";

// La página de Historias es la historia de Taza Maestra. Las historias de
// clientes (blogPosts) ya no se listan aquí; sus páginas /blog/[slug] siguen
// existiendo para los enlaces que apuntan a ellas.
export default function BlogScreen() {
  const locale = useLocale() as Locale;
  return <NuestraHistoria locale={locale} />;
}

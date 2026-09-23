import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/nav";
import { routing } from "@/i18n/routing";
import { blogPosts, findPost, findProduct } from "@/lib/content";
import type { Locale } from "@/lib/types";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    blogPosts.map((post) => ({ locale, slug: post.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = findPost(slug);
  if (!post) return {};
  return {
    title: `${locale === "en" ? post.t_en : post.t_es} · Taza Maestra`,
    description: locale === "en" ? post.d_en : post.d_es,
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = findPost(slug);
  if (!post) notFound();

  const t = await getTranslations("blog");
  const es = locale !== "en";

  const titulo = es ? post.t_es : post.t_en;
  const entrada = es ? post.d_es : post.d_en;
  const cuerpo = es ? post.cuerpo_es : post.cuerpo_en;
  const cafe = post.cafeSlug ? findProduct(post.cafeSlug) : undefined;

  return (
    <article className="bg-fondo">
      {/* Foto de cabecera */}
      <div className="relative h-56 md:h-80 overflow-hidden" style={{ background: post.sw }}>
        {post.foto && (
          <Image src={post.foto} alt="" fill priority sizes="100vw" className="object-cover" />
        )}
        <div
          className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent"
          aria-hidden="true"
        />
      </div>

      <div className="max-w-[680px] mx-auto px-[22px] py-10">
        <Link
          href="/blog"
          className="inline-block font-body text-sm text-tinta-suave hover:text-vino transition-colors mb-6"
        >
          {t("back")}
        </Link>

        <h1
          className="font-display font-bold text-tinta leading-tight mb-4"
          style={{ fontSize: "clamp(30px,4.5vw,46px)" }}
        >
          {titulo}
        </h1>

        <p className="font-body text-tinta-suave text-lg leading-relaxed mb-8">{entrada}</p>

        <div className="space-y-5">
          {cuerpo.map((parrafo, i) => (
            <p key={i} className="font-body text-tinta text-base leading-relaxed">
              {parrafo}
            </p>
          ))}
        </div>

        {/* El café que acompaña la historia */}
        {cafe && (
          <aside className="mt-12 rounded-card border border-borde bg-white overflow-hidden flex flex-col sm:flex-row">
            <div
              className="sm:w-40 min-h-28 relative shrink-0"
              style={{ background: cafe.swatch }}
              aria-hidden="true"
            >
              {cafe.img && (
                <Image
                  src={`/${cafe.img.replace("assets/", "")}`}
                  alt=""
                  fill
                  sizes="160px"
                  className="object-contain p-4"
                />
              )}
            </div>
            <div className="p-6 flex-1">
              <p className="font-mono text-[10px] tracking-[.18em] text-dorado uppercase mb-2">
                {t("cafeRelacionado")}
              </p>
              <h2 className="font-display font-bold text-tinta text-xl mb-1">{cafe.name}</h2>
              <p className="font-body text-tinta-suave text-sm mb-4">
                {cafe.productor} · {cafe.region} · {cafe.altura}
              </p>
              <Link
                href={`/producto/${cafe.id}`}
                className="inline-block bg-vino hover:bg-vino-800 text-crema-papel font-body font-700 text-sm px-5 py-2.5 rounded-btn transition-colors"
              >
                {es ? "Ver el café" : "See the coffee"}
              </Link>
            </div>
          </aside>
        )}
      </div>
    </article>
  );
}

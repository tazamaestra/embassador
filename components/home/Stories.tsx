import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/nav";
import { blogPosts } from "@/lib/content";
import type { Locale } from "@/lib/types";

// Los mismos momentos del quiz, contados por quien los vive.
// Componente de servidor: no manda JavaScript al navegador.
export default async function Stories({ locale }: { locale: Locale }) {
  const t = await getTranslations("stories");
  const es = locale !== "en";

  const historias = blogPosts.filter((p) => p.cat === "historias").slice(0, 3);

  return (
    <section className="py-20 bg-fondo">
      <div className="max-w-[1240px] mx-auto px-[22px]">
        <div className="mb-10">
          <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">
            {t("kicker")}
          </p>
          <h2 className="font-display font-bold text-tinta" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
            {t("h2")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {historias.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="rounded-card border border-borde bg-white p-6 flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover group"
            >
              <div
                className="h-1 w-12 rounded-pill mb-5"
                style={{ background: post.sw }}
                aria-hidden="true"
              />
              <h3 className="font-display font-bold text-tinta text-xl leading-snug mb-3">
                {es ? post.t_es : post.t_en}
              </h3>
              <p className="font-body text-tinta-suave text-sm leading-relaxed flex-1">
                {es ? post.d_es : post.d_en}
              </p>
              <span className="font-body font-700 text-vino text-sm mt-5 group-hover:underline">
                {es ? "Leer" : "Read"} →
              </span>
            </Link>
          ))}
        </div>

        <Link
          href="/blog"
          className="inline-block mt-8 font-body font-700 text-vino text-sm hover:underline"
        >
          {t("cta")} →
        </Link>
      </div>
    </section>
  );
}

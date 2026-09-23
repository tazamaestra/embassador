import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/nav";
import type { BlogPost, Locale } from "@/lib/types";

// Texto y foto. Sin reproductor, sin miniaturas de YouTube.
export default function BlogCard({
  post,
  locale,
}: {
  post: BlogPost;
  locale: Locale;
}) {
  const t = useTranslations("blog");
  const title = locale === "en" ? post.t_en : post.t_es;
  const desc = locale === "en" ? post.d_en : post.d_es;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="rounded-card overflow-hidden border border-borde bg-white flex flex-col w-full transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover group"
    >
      {/* Foto */}
      <div
        className="relative h-36 flex items-end p-4 w-full overflow-hidden"
        style={{ background: post.sw }}
      >
        {post.foto && (
          <Image
            src={post.foto}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <div
          className="absolute inset-0 bg-linear-to-t from-black/55 via-black/5 to-transparent"
          aria-hidden="true"
        />
      </div>

      {/* Cuerpo */}
      <div className="p-5 flex flex-col flex-1 w-full">
        <h3 className="font-display font-bold text-tinta text-xl leading-snug mb-2">{title}</h3>
        <p className="font-body text-tinta-suave text-sm leading-relaxed flex-1">{desc}</p>
        <p className="font-body font-700 text-vino text-sm mt-4 group-hover:underline">
          {t("readMore")} →
        </p>
      </div>
    </Link>
  );
}

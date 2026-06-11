import { useTranslations } from "next-intl";
import type { BlogPost, Locale } from "@/lib/types";

export default function BlogCard({ post, locale }: { post: BlogPost; locale: Locale }) {
  const t = useTranslations("blog");
  const title = locale === "en" ? post.t_en : post.t_es;
  const desc = locale === "en" ? post.d_en : post.d_es;

  return (
    <article className="rounded-card overflow-hidden border border-borde bg-white flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover group cursor-pointer">
      {/* Header visual */}
      <div className="relative h-36 flex items-end p-4" style={{ background: post.sw }}>
        <span className="font-mono text-[9px] tracking-[.18em] text-white/80 bg-black/20 px-2 py-0.5 rounded-btn uppercase z-10">
          {post.tag}
        </span>
        {post.isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-white text-lg">
              ▶
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-display font-bold text-tinta text-xl leading-snug mb-2">{title}</h3>
        <p className="font-body text-tinta-suave text-sm leading-relaxed flex-1">{desc}</p>
        <p className="font-body font-700 text-vino text-sm mt-4 group-hover:underline">{t("readMore")}</p>
      </div>
    </article>
  );
}

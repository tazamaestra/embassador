"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export interface ActiveVideo {
  id: string;
  title: string;
}

export default function VideoModal({
  video,
  onClose,
}: {
  video: ActiveVideo | null;
  onClose: () => void;
}) {
  const t = useTranslations("blog");

  useEffect(() => {
    if (!video) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [video, onClose]);

  if (!video) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
    >
      <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="absolute -top-10 right-0 text-white/80 hover:text-white text-2xl leading-none"
        >
          ✕
        </button>
        <div className="aspect-video w-full overflow-hidden rounded-card bg-black">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/nav";
import { heroSlides, heroStats } from "@/lib/content";
import { obtenerCafes } from "@/lib/servidor/cafes";
import HeroCarrusel, { type SlideHero } from "@/components/home/HeroCarrusel";
import type { Locale } from "@/lib/types";

// Componente de servidor: arma los slides (un café por slide) con los datos
// del catálogo y deja al navegador solo la isla del carrusel.
export default async function Hero({ locale }: { locale: Locale }) {
  const t = await getTranslations("hero");
  const en = locale === "en";
  const products = await obtenerCafes();

  const slides: SlideHero[] = heroSlides.flatMap((s) => {
    const cafe = products.find((p) => p.id === s.cafeId);
    if (!cafe) return [];
    return [{
      id: cafe.id,
      nombre: cafe.name,
      kicker: `${(en ? cafe.finca_en ?? cafe.finca : cafe.finca).toUpperCase()} · ${cafe.region.toUpperCase()}`,
      titulo: en ? s.titulo_en : s.titulo_es,
      destacado: en ? s.destacado_en : s.destacado_es,
      relato: en ? s.relato_en : s.relato_es,
      sellos: en ? s.sellos_en : s.sellos_es,
      sabores: en ? s.sabores_en : s.sabores_es,
      insignia: { num: s.insignia.num, txt: en ? s.insignia.txt_en : s.insignia.txt_es },
      fondo: s.fondo,
      region: cafe.region,
      proceso: en ? cafe.proceso_en : cafe.proceso_es,
      img: cafe.img,
      bolsa: cafe.bolsa,
    }];
  });

  const pie = (
    <>
      <Link
        href="/tienda"
        className="inline-block bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5 mb-10"
      >
        {t("cta")}
      </Link>

      <div className="flex flex-wrap gap-8">
        {heroStats.map((stat, i) => (
          <div key={i}>
            <div className="font-display font-bold text-dorado-claro text-4xl leading-none">
              {stat.num}
            </div>
            <div className="font-mono text-[10px] tracking-[.15em] text-crema/60 uppercase mt-1">
              {en ? stat.label_en : stat.label_es}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <HeroCarrusel
      slides={slides}
      pie={pie}
      titulo={
        // El título de la página no rota con el carrusel.
        <h1 className="sr-only">
          {t("h1a")} {t("h1b")}. {t("sub")}
        </h1>
      }
      textos={{
        carrusel: t("carrusel"),
        anterior: t("anterior"),
        siguiente: t("siguiente"),
        pausar: t("pausar"),
        reanudar: t("reanudar"),
        irA: t("irA", { cafe: "{cafe}" }),
        verCafe: t("verCafe", { cafe: "{cafe}" }),
        sabores: t("sabores"),
      }}
    />
  );
}

import { describe, expect, it } from "vitest";
import {
  blogFeatured, blogFilters, blogPosts, momentos, productFilters,
  products, productsByMomento,
} from "@/lib/content";
import rawContent from "@/data/content.json";

describe("el blog no tiene videos", () => {
  it("ningún post expuesto trae campos de video", () => {
    for (const post of blogPosts) {
      expect(post).not.toHaveProperty("videoId");
      expect(post).not.toHaveProperty("isVideo");
    }
  });

  it("el destacado tampoco", () => {
    expect(blogFeatured).not.toHaveProperty("videoId");
    expect(blogFeatured).not.toHaveProperty("isVideo");
  });

  it("los descarta aunque sigan en el JSON", () => {
    // Se simula un post heredado con video: lib/content.ts no debe dejarlo pasar.
    const conVideo = { ...rawContent.blogPosts[0], videoId: "abc123", isVideo: true };
    const { videoId, isVideo, ...expuesto } = conVideo; // eslint-disable-line @typescript-eslint/no-unused-vars
    expect(expuesto).not.toHaveProperty("videoId");
    expect(blogPosts.some((p) => "videoId" in p)).toBe(false);
  });

  it("cada post tiene cuerpo de texto", () => {
    for (const post of blogPosts) {
      expect(post.cuerpo_es.length).toBeGreaterThan(0);
      expect(post.cuerpo_en.length).toBeGreaterThan(0);
    }
  });

  it("cada historia enlaza a un café que existe", () => {
    for (const post of blogPosts) {
      if (!post.cafeSlug) continue;
      expect(products.map((p) => p.id)).toContain(post.cafeSlug);
    }
  });

  it("las categorías de los posts están en los filtros", () => {
    const ids = blogFilters.map((f) => f.id);
    for (const post of blogPosts) {
      expect(ids).toContain(post.cat);
    }
  });

  it("los slugs no se repiten", () => {
    const slugs = blogPosts.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("catálogo multi-origen", () => {
  it("cada café trae la ficha completa", () => {
    for (const p of products) {
      expect(p.productor, `${p.id}: productor`).toBeTruthy();
      expect(p.finca, `${p.id}: finca`).toBeTruthy();
      expect(p.region, `${p.id}: región`).toBeTruthy();
      expect(p.altura, `${p.id}: altura`).toBeTruthy();
      expect(p.proceso_es, `${p.id}: proceso`).toBeTruthy();
      expect(p.variedad, `${p.id}: variedad`).toBeTruthy();
      expect(p.notas_es, `${p.id}: notas`).toBeTruthy();
      expect(p.tueste_es, `${p.id}: tueste`).toBeTruthy();
      expect(p.pesoG, `${p.id}: peso`).toBeGreaterThan(0);
      expect(p.precioCop, `${p.id}: precio`).toBeGreaterThan(0);
      expect(p.precioSuscriptorCop, `${p.id}: precio suscriptor`).toBeGreaterThan(0);
    }
  });

  it("viene de más de un productor", () => {
    const productores = new Set(products.map((p) => p.productor));
    expect(productores.size).toBeGreaterThan(1);
  });

  it("cada café tiene un momento que existe", () => {
    const ids = momentos.map((m) => m.id);
    for (const p of products) {
      expect(ids, `${p.id}`).toContain(p.momento);
    }
  });

  it("todo momento tiene al menos un café para recomendar", () => {
    for (const m of momentos) {
      expect(productsByMomento(m.id).length, m.id).toBeGreaterThan(0);
    }
  });

  it("los filtros de la tienda corresponden a momentos", () => {
    const ids = momentos.map((m) => m.id);
    for (const f of productFilters) {
      if (f.id === "todos") continue;
      expect(ids).toContain(f.id);
    }
  });

  it("el quiz tiene una opción por momento", () => {
    for (const m of momentos) {
      expect(m.opcion_es, m.id).toBeTruthy();
      expect(m.opcion_en, m.id).toBeTruthy();
      expect(m.historia_es, m.id).toBeTruthy();
    }
  });
});

describe("tono del copy", () => {
  const prohibidas = [
    "tú puedes", "tu puedes", "alcanza tus metas",
    "al siguiente nivel", "el mejor café", "the best coffee",
  ];

  const textos = [
    ...products.flatMap((p) => [p.notas_es, p.notas_en]),
    ...momentos.flatMap((m) => [m.historia_es, m.opcion_es]),
    ...blogPosts.flatMap((p) => [p.t_es, p.d_es, ...p.cuerpo_es]),
  ];

  it("no usa frases de póster", () => {
    for (const texto of textos) {
      for (const frase of prohibidas) {
        expect(texto.toLowerCase(), frase).not.toContain(frase);
      }
    }
  });

  it("no abusa de los signos de exclamación", () => {
    const conExclamacion = textos.filter((t) => t.includes("!") || t.includes("¡"));
    expect(conExclamacion).toEqual([]);
  });
});

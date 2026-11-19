import { describe, expect, it } from "vitest";
import { agruparPorModulo, clienteVeCurso, CursoInvalido, idYoutube, validarCurso, type VideoCurso } from "./cursos";

describe("idYoutube", () => {
  it("saca el id de cualquier enlace de YouTube", () => {
    for (const url of [
      "https://youtu.be/xQQhGsauRjs",
      "https://youtu.be/xQQhGsauRjs?si=abc123",
      "youtu.be/xQQhGsauRjs",
      "https://www.youtube.com/watch?v=xQQhGsauRjs&t=30s",
      "https://m.youtube.com/watch?v=xQQhGsauRjs",
      "https://www.youtube.com/embed/xQQhGsauRjs",
      "https://www.youtube-nocookie.com/embed/xQQhGsauRjs",
      "https://youtube.com/shorts/xQQhGsauRjs",
      "https://www.youtube.com/live/xQQhGsauRjs",
      "  xQQhGsauRjs  ",
    ]) expect(idYoutube(url), url).toBe("xQQhGsauRjs");
  });

  it("acepta guion y guion bajo en el id", () => {
    expect(idYoutube("https://youtu.be/078liJJU-FU")).toBe("078liJJU-FU");
    expect(idYoutube("https://youtu.be/_Ll8foD4kao")).toBe("_Ll8foD4kao");
  });

  it("rechaza lo que no es un video de YouTube", () => {
    for (const url of ["", "hola", "https://vimeo.com/123456789", "https://youtu.be/corto", "https://www.youtube.com/@tazamaestra", "https://evil.com/watch?v=xQQhGsauRjs"]) {
      expect(idYoutube(url), url).toBeNull();
    }
  });
});

describe("validarCurso", () => {
  const base = { titulo: "  Intro  ", videos: [{ modulo: "Bienvenida", titulo: "Presentación", url: "https://youtu.be/xQQhGsauRjs" }] };

  it("limpia y convierte los enlaces en ids", () => {
    const d = validarCurso(base);
    expect(d.titulo).toBe("Intro");
    expect(d.acceso).toBe("todos");
    expect(d.publicado).toBe(false);
    expect(d.videos[0]).toEqual({ id: undefined, modulo: "Bienvenida", titulo: "Presentación", descripcion: "", youtubeId: "xQQhGsauRjs" });
  });

  it("dice qué video está mal", () => {
    const malo = { ...base, videos: [...base.videos, { titulo: "Dos", url: "no-es-un-enlace" }] };
    expect(() => validarCurso(malo)).toThrow(CursoInvalido);
    try {
      validarCurso(malo);
    } catch (e) {
      expect((e as CursoInvalido).campo).toBe("videos.2.url");
    }
    expect(() => validarCurso({ ...base, titulo: " " })).toThrow(CursoInvalido);
    expect(() => validarCurso({ ...base, acceso: "nadie" })).toThrow(CursoInvalido);
  });

  it("solo guarda ids válidos de video y de cliente, sin repetidos", () => {
    const uuid = "3f2b8c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";
    const d = validarCurso({
      ...base,
      acceso: "seleccionados",
      videos: [{ ...base.videos[0], id: uuid }, { ...base.videos[0], id: "inventado" }],
      clientes: [uuid, uuid, "x", 3],
    });
    expect(d.videos.map((v) => v.id)).toEqual([uuid, undefined]);
    expect(d.clientes).toEqual([uuid]);
  });
});

describe("quién ve un curso", () => {
  it("publicado y abierto: todos; por elección: solo los elegidos; borrador: nadie", () => {
    expect(clienteVeCurso({ publicado: true, acceso: "todos" }, false)).toBe(true);
    expect(clienteVeCurso({ publicado: true, acceso: "seleccionados" }, false)).toBe(false);
    expect(clienteVeCurso({ publicado: true, acceso: "seleccionados" }, true)).toBe(true);
    expect(clienteVeCurso({ publicado: false, acceso: "todos" }, true)).toBe(false);
  });
});

describe("agruparPorModulo", () => {
  const v = (orden: number, modulo: string): VideoCurso => ({ id: String(orden), orden, modulo, titulo: "", descripcion: "", youtubeId: "" });

  it("agrupa los videos seguidos del mismo módulo, en orden", () => {
    const g = agruparPorModulo([v(3, "B"), v(1, "A"), v(2, "A"), v(4, "A")]);
    expect(g.map((x) => [x.modulo, x.videos.map((y) => y.orden)])).toEqual([["A", [1, 2]], ["B", [3]], ["A", [4]]]);
  });
});

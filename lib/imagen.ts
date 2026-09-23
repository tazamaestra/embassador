// Compresión de imágenes en el navegador, sin dependencias.
//
// Una foto de celular llega con 3000-4000 px de lado y 4-8 MB. En la ficha
// del café no se ve a más de ~800 px, así que subir el original es tirar
// ancho de banda y espacio de bucket. Aquí se redimensiona y se reencoda a
// WebP antes de que salga del navegador: lo que viaja y lo que se guarda ya
// va comprimido, normalmente por debajo de 200 KB.

/** Lado mayor de la imagen guardada. Da de sobra para pantallas retina. */
const LADO_MAXIMO = 1600;
const CALIDAD = 0.82;

export interface ImagenComprimida {
  blob: Blob;
  ancho: number;
  alto: number;
  /** Extensión que corresponde al tipo con el que salió. */
  extension: "webp" | "jpg";
}

/** Dimensiones de destino: encoge si hace falta, nunca agranda. */
export function calcularMedidas(
  ancho: number,
  alto: number,
  ladoMaximo = LADO_MAXIMO
): { ancho: number; alto: number } {
  const mayor = Math.max(ancho, alto);
  if (mayor <= ladoMaximo) return { ancho, alto };

  const escala = ladoMaximo / mayor;
  return {
    ancho: Math.max(1, Math.round(ancho * escala)),
    alto: Math.max(1, Math.round(alto * escala)),
  };
}

function aBlob(lienzo: HTMLCanvasElement, tipo: string): Promise<Blob | null> {
  return new Promise((resolver) => lienzo.toBlob(resolver, tipo, CALIDAD));
}

/**
 * Redimensiona y reencoda. Devuelve WebP salvo que el navegador no lo
 * soporte, en cuyo caso cae a JPEG.
 */
export async function comprimirImagen(archivo: File): Promise<ImagenComprimida> {
  const bitmap = await createImageBitmap(archivo);

  try {
    const { ancho, alto } = calcularMedidas(bitmap.width, bitmap.height);

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;

    const ctx = lienzo.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar el lienzo para comprimir.");
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    // toBlob devuelve null si el tipo no está soportado; Safari viejo no
    // encoda WebP y hay que dejarlo caer a JPEG.
    const webp = await aBlob(lienzo, "image/webp");
    if (webp && webp.type === "image/webp") {
      return { blob: webp, ancho, alto, extension: "webp" };
    }

    const jpeg = await aBlob(lienzo, "image/jpeg");
    if (!jpeg) throw new Error("El navegador no pudo comprimir la imagen.");
    return { blob: jpeg, ancho, alto, extension: "jpg" };
  } finally {
    bitmap.close();
  }
}

/** Para mostrar pesos en el panel: 184320 → "180 KB". */
export function formatearBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

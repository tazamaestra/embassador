import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { FEATURE_AMBASSADORS, isAmbassadorPath } from "./lib/flags";

const intlProxy = createMiddleware(routing);

export function proxy(request: NextRequest) {
  // Con el programa apagado, la ruta no existe para el visitante: se va a la
  // home en su idioma. La página sigue en el repo, lista para volver.
  if (!FEATURE_AMBASSADORS && isAmbassadorPath(request.nextUrl.pathname)) {
    const [, primerSegmento] = request.nextUrl.pathname.split("/");
    const locale = (routing.locales as readonly string[]).includes(primerSegmento)
      ? primerSegmento
      : routing.defaultLocale;

    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return intlProxy(request);
}

export const config = {
  matcher: [
    // `api` va excluido: son route handlers, no páginas, y no llevan prefijo
    // de idioma. Sin esta exclusión next-intl redirigía /api/... a /es/api/...
    // con un 307, y quien manda un POST —el webhook de Wompi, el navegador en
    // el checkout— se encontraba con una redirección en vez de la respuesta.
    "/((?!api|_next|_vercel|.*\\..*).*)",
    "/",
  ],
};

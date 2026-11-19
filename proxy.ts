import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export const proxy = createMiddleware(routing);

export const config = {
  matcher: [
    // `api` va excluido: son route handlers, no páginas, y no llevan prefijo
    // de idioma. Sin esta exclusión next-intl redirigía /api/... a /es/api/...
    // con un 307, y quien manda un POST —el webhook de Wompi, el navegador en
    // el checkout— se encontraba con una redirección en vez de la respuesta.
    "/((?!api|_next|_vercel|.*\..*).*)",
    "/",
  ],
};

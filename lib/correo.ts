// Correo transaccional por Resend. SOLO SERVIDOR: usa RESEND_API_KEY.
//
// Sin dependencias: la API de Resend es un POST con JSON, y meter un paquete
// entero para eso iría contra el trabajo de aligerar el bundle.
//
// Regla de oro: **mandar el correo nunca puede tumbar la suscripción**. Si
// falta la key o Resend responde mal, se anota y se sigue. Que a alguien no
// le llegue el correo es molesto; que se le pierda la suscripción, no.

const API = "https://api.resend.com/emails";

/**
 * Remitente. Mientras no verifiques tu dominio en Resend, el único permitido
 * es onboarding@resend.dev y solo llega a la dirección de tu propia cuenta.
 */
const REMITENTE = process.env.RESEND_FROM ?? "Taza Maestra <onboarding@resend.dev>";

export interface Correo {
  para: string;
  asunto: string;
  html: string;
  texto: string;
}

export type ResultadoCorreo =
  | { enviado: true; id: string }
  | { enviado: false; motivo: "sin_configurar" | "rechazado" | "error"; detalle?: string };

export async function enviarCorreo(correo: Correo): Promise<ResultadoCorreo> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(
      `[correo] RESEND_API_KEY sin configurar. No se envió "${correo.asunto}" a ${correo.para}.`
    );
    return { enviado: false, motivo: "sin_configurar" };
  }

  // Las claves de Resend empiezan por `re_`. Se avisa pero NO se corta: si
  // algún día cambian el formato, cortar aquí rompería algo que funciona.
  // Que decida el servidor; esto solo hace legible el error.
  if (!key.startsWith("re_")) {
    console.warn(
      `[correo] RESEND_API_KEY empieza por "${key.slice(0, 8)}…" y las de Resend ` +
        'empiezan por "re_". Si el envío falla, es casi seguro que la clave es de ' +
        "otro servicio. Se intenta igual."
    );
  }

  try {
    const r = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: REMITENTE,
        to: [correo.para],
        subject: correo.asunto,
        html: correo.html,
        text: correo.texto,
      }),
    });

    if (!r.ok) {
      const detalle = (await r.text()).slice(0, 300);
      console.error(`[correo] Resend respondió ${r.status}: ${detalle}`);
      return { enviado: false, motivo: "rechazado", detalle };
    }

    const { id } = (await r.json()) as { id: string };
    return { enviado: true, id };
  } catch (e) {
    console.error("[correo] No se pudo contactar a Resend:", e);
    return { enviado: false, motivo: "error" };
  }
}

// ── Plantilla de bienvenida ────────────────────────────────────────────────

export interface DatosBienvenida {
  nombre: string;
  plan: string;
  libras: number;
  frecuencia: string;
  molienda: string;
  metodo: string;
  proximoDespacho: string;
  direccion: string;
  totalCop: number;
  urlCuenta: string;
}

const COP = (n: number) => "$" + n.toLocaleString("es-CO");

/** Escapa lo que viene del cliente: nombre y dirección los escribe él. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function correoBienvenida(d: DatosBienvenida): Correo {
  const saludo = d.nombre ? `Hola, ${d.nombre.split(" ")[0]}.` : "Hola.";

  const filas: [string, string][] = [
    ["Plan", `${d.plan} · ${d.libras} ${d.libras === 1 ? "libra" : "libras"}`],
    ["Cada cuánto", d.frecuencia],
    ["Molienda", d.molienda],
    ["Método", d.metodo],
    ["Primer despacho", d.proximoDespacho],
    ["Envío a", d.direccion],
  ];

  const texto = [
    saludo,
    "",
    "Tu suscripción quedó lista. Esto es lo que pediste:",
    "",
    ...filas.map(([k, v]) => `${k}: ${v}`),
    `Total: ${COP(d.totalCop)} al mes, envío incluido`,
    "",
    "Se tuesta la semana del despacho y sale para tu ciudad.",
    "Pausas, saltas un mes o cancelas desde tu cuenta, en dos clics:",
    d.urlCuenta,
    "",
    "Taza Maestra · Café de especialidad",
  ].join("\n");

  // HTML con estilos en línea: los clientes de correo ignoran las hojas
  // de estilo y muchos ni siquiera leen <style> en el <head>.
  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#FAF6EE;">
  <div style="max-width:560px;margin:0 auto;padding:32px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2A1A12;">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#B6893B;margin:0 0 8px;">
      Taza Maestra
    </p>
    <h1 style="font-size:26px;line-height:1.2;margin:0 0 8px;color:#2A1A12;">${esc(saludo)}</h1>
    <p style="font-size:16px;line-height:1.6;color:#6B5547;margin:0 0 24px;">
      Tu suscripción quedó lista. Esto es lo que pediste.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #EADBBE;border-radius:12px;">
      <tbody>
        ${filas
          .map(
            ([k, v]) => `<tr>
          <td style="padding:12px 16px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#6B5547;border-bottom:1px solid #EADBBE;">${esc(k)}</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;text-align:right;color:#2A1A12;border-bottom:1px solid #EADBBE;">${esc(v)}</td>
        </tr>`
          )
          .join("\n        ")}
        <tr>
          <td style="padding:14px 16px;font-size:15px;color:#2A1A12;">Total</td>
          <td style="padding:14px 16px;font-size:20px;font-weight:700;text-align:right;color:#6E1417;">
            ${COP(d.totalCop)}<span style="font-size:11px;color:#6B5547;font-weight:400;"> al mes</span>
          </td>
        </tr>
      </tbody>
    </table>

    <p style="font-size:15px;line-height:1.6;color:#6B5547;margin:24px 0;">
      Se tuesta la semana del despacho y sale para tu ciudad. Pausas, saltas un mes
      o cancelas desde tu cuenta, en dos clics.
    </p>

    <a href="${esc(d.urlCuenta)}"
       style="display:inline-block;background:#E8731E;color:#fff;font-size:16px;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:13px;">
      Ver mi suscripción
    </a>

    <p style="font-size:12px;color:#6B5547;margin:32px 0 0;border-top:1px solid #EADBBE;padding-top:16px;">
      Taza Maestra · Café de especialidad · Colombia
    </p>
  </div>
</body>
</html>`;

  return {
    para: "",
    asunto: `Tu suscripción quedó lista · ${d.plan}`,
    html,
    texto,
  };
}

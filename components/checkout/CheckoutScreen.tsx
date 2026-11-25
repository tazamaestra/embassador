"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@/lib/nav";
import { useCartStore } from "@/lib/cart-store";
import { useAuthStore } from "@/lib/auth-store";
import { useCafes } from "@/components/shared/CafesProvider";
import { ciudades } from "@/lib/content";
import { formatCOP, formatUSD } from "@/lib/format";
import { formatPeso, presentacionDe } from "@/lib/presentaciones";
import { CONTACTO_VACIO, PedidoInvalido, validarContacto, type Contacto } from "@/lib/pedidos";
import { iniciarPago, type LineaCarrito } from "@/lib/pago";
import type { Locale } from "@/lib/types";

// Checkout del carrito: datos de envío y pago. Sin cuenta. El total que se
// muestra es el del catálogo de hoy; el que se cobra lo calcula el servidor.
// Si la pasarela no está configurada, el pedido queda registrado y el
// equipo cobra por fuera (lo dice la confirmación).

const ENTRADA =
  "w-full bg-white border border-borde rounded-input px-4 py-3 font-body text-tinta text-base focus:outline-none focus:border-naranja focus:ring-1 focus:ring-naranja aria-[invalid=true]:border-vino transition-colors";
const ETIQUETA = "block font-mono text-[11px] tracking-[.15em] text-tinta-suave uppercase mb-1";

export default function CheckoutScreen({ locale }: { locale: Locale }) {
  const es = locale !== "en";
  const { items: guardados } = useCartStore();
  const cafes = useCafes();
  const { user, init } = useAuthStore();
  const [contacto, setContacto] = useState<Contacto>(CONTACTO_VACIO);
  const [campoMalo, setCampoMalo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    init();
    setMontado(true);
  }, [init]);

  // Con sesión, el correo y el nombre ya se saben.
  useEffect(() => {
    if (user) setContacto((c) => ({ ...c, email: c.email || user.email, nombre: c.nombre || user.nombre, telefono: c.telefono || user.telefono }));
  }, [user]);

  // Las líneas con el precio del catálogo de hoy.
  const lineas = guardados.flatMap((item) => {
    const cafe = cafes.find((p) => p.id === (item.cafeId ?? item.id));
    const pres = cafe && presentacionDe(cafe, item.presentacion ?? "bolsa");
    return cafe && pres ? [{ key: item.id, cafe, pres, cantidad: item.qty }] : [];
  });
  const total = lineas.reduce((s, l) => s + l.pres.precioCop * l.cantidad, 0);
  const totalUsd = lineas.reduce((s, l) => s + (l.pres.precioUsd ?? 0) * l.cantidad, 0);

  const MENSAJES: Record<string, [string, string]> = {
    nombre: ["Escribe tu nombre.", "Enter your name."],
    email: ["Revisa el correo: ahí te llega la confirmación.", "Check the email: your confirmation goes there."],
    telefono: ["Revisa el celular.", "Check the phone number."],
    linea: ["Falta la dirección.", "The address is missing."],
    ciudad: ["Elige la ciudad.", "Choose the city."],
    departamento: ["Falta el departamento.", "The state is missing."],
    items: ["Algo cambió en el carrito. Revísalo y vuelve a intentar.", "Something changed in your cart. Check it and try again."],
  };

  async function pagar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      validarContacto(contacto);
    } catch (err) {
      if (err instanceof PedidoInvalido) {
        setCampoMalo(err.campo);
        document.getElementById(`co-${err.campo}`)?.focus();
        return;
      }
      throw err;
    }
    setCampoMalo(null);
    setEnviando(true);
    const items: LineaCarrito[] = lineas.map((l) => ({ cafe: l.cafe.id, presentacion: l.pres.id, cantidad: l.cantidad }));
    const r = await iniciarPago(items, contacto, locale);
    if (r.ok) {
      // El carrito se vacía en la confirmación: si el cliente vuelve atrás
      // desde la pasarela, todavía lo tiene.
      window.location.assign(r.url);
      return;
    }
    setEnviando(false);
    if (r.motivo === "campo_invalido" && r.campo) {
      setCampoMalo(r.campo);
      return;
    }
    setError(es ? "No pudimos registrar el pedido. Intenta de nuevo en un momento." : "We couldn't place the order. Please try again in a moment.");
  }

  const campo = (k: keyof Contacto) => ({
    id: `co-${k}`,
    value: contacto[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setContacto({ ...contacto, [k]: e.target.value }),
    "aria-invalid": campoMalo === k,
    "aria-describedby": campoMalo === k ? `co-${k}-error` : undefined,
  });
  const errorDe = (k: string) =>
    campoMalo === k && MENSAJES[k] ? <p id={`co-${k}-error`} className="font-body text-xs text-vino mt-1">{MENSAJES[k][es ? 0 : 1]}</p> : null;

  if (!montado) return <div className="bg-fondo min-h-[60vh]" />;

  if (lineas.length === 0) {
    return (
      <div className="bg-fondo min-h-[60vh] flex items-center justify-center px-5.5">
        <div className="text-center">
          <p className="font-display font-bold text-tinta text-2xl mb-2">{es ? "Tu carrito está vacío" : "Your cart is empty"}</p>
          <Link href="/tienda" className="inline-block mt-2 font-body font-700 text-sm px-5 py-2.5 rounded-btn bg-naranja text-white hover:bg-naranja-700">
            {es ? "Ver los cafés" : "See the coffees"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-fondo min-h-screen">
      <div className="max-w-310 mx-auto px-5.5 py-10 md:py-14">
        <p className="font-mono text-[11px] tracking-[.22em] text-dorado uppercase mb-2">{es ? "FINALIZAR COMPRA" : "CHECKOUT"}</p>
        <h1 className="font-display font-bold text-tinta mb-8" style={{ fontSize: "clamp(30px,4vw,46px)" }}>
          {es ? "¿A dónde te lo enviamos?" : "Where should we send it?"}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-8 items-start">
          {/* Datos */}
          <form id="checkout" onSubmit={pagar} noValidate className="rounded-card-lg bg-white border border-borde p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={ETIQUETA} htmlFor="co-nombre">{es ? "Nombre completo" : "Full name"}</label>
              <input autoComplete="name" className={ENTRADA} {...campo("nombre")} />
              {errorDe("nombre")}
            </div>
            <div>
              <label className={ETIQUETA} htmlFor="co-email">{es ? "Correo" : "Email"}</label>
              <input type="email" autoComplete="email" className={ENTRADA} {...campo("email")} />
              {errorDe("email")}
            </div>
            <div>
              <label className={ETIQUETA} htmlFor="co-telefono">{es ? "Celular" : "Phone"}</label>
              <input type="tel" inputMode="tel" autoComplete="tel" className={ENTRADA} {...campo("telefono")} />
              {errorDe("telefono")}
            </div>
            <div className="sm:col-span-2">
              <label className={ETIQUETA} htmlFor="co-linea">{es ? "Dirección" : "Address"}</label>
              <input autoComplete="street-address" placeholder={es ? "Calle 12 #4-56, apto 301" : "Street, number, apartment"} className={ENTRADA} {...campo("linea")} />
              {errorDe("linea")}
            </div>
            <div>
              <label className={ETIQUETA} htmlFor="co-ciudad">{es ? "Ciudad" : "City"}</label>
              <select autoComplete="address-level2" className={ENTRADA} {...campo("ciudad")}>
                <option value="">{es ? "Elige tu ciudad" : "Choose your city"}</option>
                {ciudades.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="Otra">{es ? "Otra" : "Other"}</option>
              </select>
              {errorDe("ciudad")}
            </div>
            <div>
              <label className={ETIQUETA} htmlFor="co-departamento">{es ? "Departamento" : "State"}</label>
              <input autoComplete="address-level1" className={ENTRADA} {...campo("departamento")} />
              {errorDe("departamento")}
            </div>
            <div className="sm:col-span-2">
              <label className={ETIQUETA} htmlFor="co-notas">{es ? "Indicaciones (opcional)" : "Notes (optional)"}</label>
              <input placeholder={es ? "Portería, punto de referencia, ciudad si elegiste Otra…" : "Doorman, landmark, city if you chose Other…"} className={ENTRADA} {...campo("notas")} />
            </div>
          </form>

          {/* Resumen */}
          <aside className="rounded-card-lg bg-white border border-borde p-6 md:p-7 lg:sticky lg:top-24">
            <p className="font-mono text-[11px] tracking-[.18em] text-tinta-suave uppercase mb-4">{es ? "TU PEDIDO" : "YOUR ORDER"}</p>
            <ul className="divide-y divide-borde mb-4">
              {lineas.map((l) => (
                <li key={l.key} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display font-bold text-tinta leading-tight">{l.cafe.name}</p>
                    <p className="font-body text-xs text-tinta-suave">
                      {l.pres.id === "negocio" ? (es ? "Cuarterón para negocios · " : "Business bag · ") : l.pres.id === "pequena" ? (es ? "Bolsa pequeña · " : "Small bag · ") : ""}
                      {formatPeso(l.pres.pesoG)} · {l.cantidad} × {formatCOP(l.pres.precioCop)}
                    </p>
                  </div>
                  <p className="font-body font-700 text-tinta tabular-nums">{formatCOP(l.pres.precioCop * l.cantidad)}</p>
                </li>
              ))}
            </ul>
            <div className="flex items-baseline justify-between border-t border-borde pt-4">
              <span className="font-body text-tinta-suave text-sm">{es ? "Total" : "Total"}</span>
              <span className="font-display font-bold text-tinta text-3xl tabular-nums">{formatCOP(total)}</span>
            </div>
            {totalUsd > 0 && <p className="font-mono text-xs text-tinta-suave text-right">≈ {formatUSD(totalUsd, locale)}</p>}
            <p className="font-body text-xs text-tinta-suave mt-1 mb-5">
              {es ? "+ costo de envío, que te confirmamos según tu ciudad." : "+ shipping, confirmed for your city."}
            </p>

            {error && <p role="alert" className="font-body text-sm text-vino mb-3">{error}</p>}
            {campoMalo === "items" && <p role="alert" className="font-body text-sm text-vino mb-3">{MENSAJES.items[es ? 0 : 1]}</p>}

            <button
              type="submit"
              form="checkout"
              disabled={enviando}
              className="w-full bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3.5 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {enviando ? (es ? "Registrando tu pedido…" : "Placing your order…") : (es ? `Confirmar pedido · ${formatCOP(total)}` : `Place order · ${formatCOP(total)}`)}
            </button>
            <Link href="/tienda" className="block text-center mt-3 font-body text-sm text-tinta-suave hover:text-vino">
              {es ? "← Seguir comprando" : "← Keep shopping"}
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}

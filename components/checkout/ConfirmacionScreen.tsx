"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/lib/nav";
import { useCartStore } from "@/lib/cart-store";
import { formatCOP } from "@/lib/format";
import { formatPeso } from "@/lib/presentaciones";
import type { EstadoPedido, LineaPedido, Locale } from "@/lib/types";

// Aquí llega el cliente después de confirmar el pedido (directo, si no hay
// pasarela; o de vuelta de Wompi). Quien marca el pedido "pagado" es el
// webhook, así que con pasarela se consulta un par de veces antes de
// decir "pendiente".

interface EstadoRemoto {
  estado: EstadoPedido;
  items: LineaPedido[];
  totalCop: number;
}

export default function ConfirmacionScreen({ locale }: { locale: Locale }) {
  const es = locale !== "en";
  const referencia = useSearchParams().get("ref") ?? "";
  // Wompi agrega ?id=<transacción> al volver; sin eso, no hubo pasarela.
  const volvioDeWompi = Boolean(useSearchParams().get("id"));
  const { clear } = useCartStore();
  const [pedido, setPedido] = useState<EstadoRemoto | null>(null);
  const [noExiste, setNoExiste] = useState(false);

  useEffect(() => {
    if (!referencia) {
      setNoExiste(true);
      return;
    }
    let cancelado = false;
    let intentos = 0;

    async function revisar() {
      intentos += 1;
      const r = await fetch(`/api/pedidos/${encodeURIComponent(referencia)}`).catch(() => null);
      if (cancelado) return;
      if (!r || !r.ok) {
        setNoExiste(true);
        return;
      }
      const datos = (await r.json()) as EstadoRemoto;
      setPedido(datos);
      clear();
      // Con pasarela, el webhook puede tardar unos segundos en llegar.
      if (volvioDeWompi && datos.estado === "pendiente" && intentos < 6) setTimeout(revisar, 2000);
    }

    revisar();
    return () => {
      cancelado = true;
    };
  }, [referencia, volvioDeWompi, clear]);

  const titulo = (() => {
    if (noExiste) return es ? "No encontramos ese pedido" : "We couldn't find that order";
    if (!pedido) return es ? "Confirmando tu pedido…" : "Confirming your order…";
    if (pedido.estado === "pagado") return es ? "¡Pago recibido! Tu café va en camino." : "Payment received! Your coffee is on its way.";
    if (pedido.estado === "fallido") return es ? "El pago no pasó" : "The payment didn't go through";
    return es ? "¡Recibimos tu pedido!" : "We got your order!";
  })();

  const texto = (() => {
    if (noExiste) return es ? "Revisa el enlace o escríbenos." : "Check the link or contact us.";
    if (!pedido) return "";
    if (pedido.estado === "pagado") return es ? "Te escribimos al correo con la guía del envío." : "We'll email you the tracking details.";
    if (pedido.estado === "fallido") return es ? "No te cobramos nada. Puedes intentarlo de nuevo desde la tienda." : "You weren't charged. You can try again from the store.";
    return volvioDeWompi
      ? es ? "Estamos confirmando el pago con el banco. Te avisamos al correo." : "We're confirming the payment with the bank. We'll email you."
      : es ? "Te escribimos pronto para confirmar el pago y el costo del envío." : "We'll contact you soon to confirm payment and shipping cost.";
  })();

  return (
    <div className="bg-fondo min-h-[70vh] flex items-center justify-center px-5.5 py-20">
      <div className="w-full max-w-120 text-center">
        {!pedido && !noExiste ? (
          <div className="h-1 bg-arena rounded-pill overflow-hidden mb-6" aria-hidden="true">
            <div className="h-full bg-naranja" style={{ animation: "llenando 1.4s ease-in-out infinite" }} />
          </div>
        ) : (
          <div
            className={`mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center text-3xl animate-[fadeUp_.3s_ease-out] ${
              pedido?.estado === "fallido" || noExiste ? "bg-vino/10 text-vino" : "bg-verde-claro text-verde"
            }`}
            aria-hidden="true"
          >
            {pedido?.estado === "fallido" || noExiste ? "!" : "✓"}
          </div>
        )}

        <div role="status" className="animate-[fadeUp_.3s_ease-out]">
          <h1 className="font-display font-bold text-tinta text-3xl md:text-4xl mb-3">{titulo}</h1>
          {texto && <p className="font-body text-tinta-suave text-base mb-6">{texto}</p>}
        </div>

        {pedido && (
          <ul className="text-left rounded-card border border-borde bg-white divide-y divide-borde mb-6">
            {pedido.items.map((l, i) => (
              <li key={i} className="px-4 py-2.5 flex justify-between gap-3 font-body text-sm">
                <span className="text-tinta">
                  {l.cantidad} × {l.nombre}{" "}
                  <span className="text-tinta-suave">({l.presentacion === "negocio" ? (es ? "cuarterón " : "large bag ") : ""}{formatPeso(l.pesoG)})</span>
                </span>
                <span className="text-tinta tabular-nums">{formatCOP(l.precioCop * l.cantidad)}</span>
              </li>
            ))}
            <li className="px-4 py-2.5 flex justify-between font-body text-sm font-700">
              <span>{es ? "Total (+ envío)" : "Total (+ shipping)"}</span>
              <span className="tabular-nums">{formatCOP(pedido.totalCop)}</span>
            </li>
          </ul>
        )}

        <Link href="/tienda" className="inline-block bg-vino hover:bg-vino-800 text-crema-papel font-body font-700 text-base px-6 py-3 rounded-btn transition-colors">
          {es ? "Volver a la tienda" : "Back to the store"}
        </Link>

        {referencia && <p className="font-mono text-[10px] tracking-[.14em] text-tinta-suave/70 mt-8">{referencia}</p>}
      </div>
    </div>
  );
}

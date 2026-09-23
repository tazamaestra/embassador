"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

// Aparición al entrar en pantalla, con IntersectionObserver. Reemplaza a una
// librería de animación entera por ~1 KB: la transición la hace la CSS de
// globals.css y aquí solo se cambia un atributo.
//
// El atributo `data-revelar` se pone al montar, no en el HTML del servidor:
// si el JS no carga, el contenido se ve normal en vez de quedar invisible.

const OBSERVADOR_OPCIONES: IntersectionObserverInit = {
  // Dispara un poco antes de que el borde superior entre, para que el
  // movimiento termine cuando el usuario ya lo está mirando.
  rootMargin: "0px 0px -10% 0px",
  threshold: 0.1,
};

export default function Revelar({
  children,
  as: Etiqueta = "div",
  retrasoMs = 0,
  className = "",
}: {
  children: ReactNode;
  as?: ElementType;
  /** Para escalonar hermanos: 0, 60, 120… */
  retrasoMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [estado, setEstado] = useState<"oculto" | "visible" | null>(null);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    // Sin soporte del observador, se muestra y ya.
    if (typeof IntersectionObserver === "undefined") {
      setEstado("visible");
      return;
    }

    setEstado("oculto");

    const observador = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        setEstado("visible");
        // Una sola vez: no se vuelve a esconder al salir de pantalla.
        observador.disconnect();
      }
    }, OBSERVADOR_OPCIONES);

    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  return (
    <Etiqueta
      ref={ref}
      className={className}
      data-revelar={estado ?? undefined}
      style={retrasoMs ? ({ "--tm-retraso": `${retrasoMs}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Etiqueta>
  );
}

"use client";

import { createContext, useContext, type ReactNode } from "react";
import { products as base } from "@/lib/content";
import type { MomentoId, Product } from "@/lib/types";

// Los cafés con las ediciones del panel, leídos en el servidor (layout) y
// repartidos a las islas cliente: tienda, ficha, carrito, quiz del home.
// Sin provider (tests, pantallas sueltas) queda el catálogo del JSON.

const Contexto = createContext<Product[]>(base);

export function CafesProvider({ cafes, children }: { cafes: Product[]; children: ReactNode }) {
  return <Contexto.Provider value={cafes}>{children}</Contexto.Provider>;
}

export function useCafes(): Product[] {
  return useContext(Contexto);
}

export function useCafe(slug: string | null | undefined): Product | undefined {
  const cafes = useCafes();
  return slug ? cafes.find((p) => p.id === slug) : undefined;
}

export function useCafesPorMomento(momento: MomentoId | null): Product[] {
  const cafes = useCafes();
  return momento ? cafes.filter((p) => p.momento === momento) : [];
}

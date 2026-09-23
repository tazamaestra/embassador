"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createContext, useContext, type ReactNode } from "react";
import { FEATURE_AMBASSADORS } from "@/lib/flags";
import type { Mode } from "@/lib/types";

interface ModeStore {
  mode: Mode;
  setMode: (m: Mode) => void;
}

const useModeStore = create<ModeStore>()(
  persist(
    (set) => ({
      mode: "cliente",
      setMode: (m) => set({ mode: m }),
    }),
    { name: "tm-mode" }
  )
);

const ModeContext = createContext<ModeStore | null>(null);

// Con el programa de embajadores apagado el modo queda clavado en "cliente",
// incluso si el navegador tiene "embajador" guardado de una visita anterior.
// Así ningún componente puede caer en la rama de precios mayoristas.
const MODO_CLIENTE: ModeStore = { mode: "cliente", setMode: () => {} };

export function ModeProvider({ children }: { children: ReactNode }) {
  const store = useModeStore();
  const value = FEATURE_AMBASSADORS ? store : MODO_CLIENTE;
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeStore {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used inside ModeProvider");
  return ctx;
}

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createContext, useContext, type ReactNode } from "react";
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

export function ModeProvider({ children }: { children: ReactNode }) {
  const store = useModeStore();
  return <ModeContext.Provider value={store}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeStore {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used inside ModeProvider");
  return ctx;
}

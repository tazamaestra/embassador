import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Ambassador {
  name: string;
  email: string;
  phone: string;
}

interface StoredAmbassador extends Ambassador {
  password: string;
}

interface AuthState {
  user: Ambassador | null;
  users: StoredAmbassador[];
  register: (data: StoredAmbassador) => { success: boolean; error?: "email_exists" };
  login: (email: string, password: string) => { success: boolean; error?: "not_found" | "wrong_password" };
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      users: [],
      register: (data) => {
        const already = get().users.some((u) => u.email === data.email);
        if (already) return { success: false, error: "email_exists" };
        const { password, ...profile } = data;
        set((s) => ({ users: [...s.users, data], user: profile }));
        return { success: true };
      },
      login: (email, password) => {
        const found = get().users.find((u) => u.email === email);
        if (!found) return { success: false, error: "not_found" };
        if (found.password !== password) return { success: false, error: "wrong_password" };
        const { password: _pw, ...profile } = found;
        set({ user: profile });
        return { success: true };
      },
      logout: () => set({ user: null }),
    }),
    { name: "tm-auth" }
  )
);

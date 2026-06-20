import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Ambassador {
  name: string;
  email: string;
  phone: string;
  city: string;
}

interface AuthState {
  user: Ambassador | null;
  users: Ambassador[];
  register: (data: Ambassador) => { success: boolean; error?: "email_exists" };
  login: (email: string) => { success: boolean; error?: "not_found" };
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
        set((s) => ({ users: [...s.users, data], user: data }));
        return { success: true };
      },
      login: (email) => {
        const found = get().users.find((u) => u.email === email);
        if (!found) return { success: false, error: "not_found" };
        set({ user: found });
        return { success: true };
      },
      logout: () => set({ user: null }),
    }),
    { name: "tm-auth" }
  )
);

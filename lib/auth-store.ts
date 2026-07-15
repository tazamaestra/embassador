import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export interface Ambassador {
  id: string;
  email: string;
  nombre: string;
  telefono: string;
  codigoReferido: string;
  estado: string;
}

interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface AuthState {
  user: Ambassador | null;
  loading: boolean;
  init: () => void;
  register: (data: RegisterInput) => Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

async function loadProfile(id: string, email: string | undefined): Promise<Ambassador | null> {
  const { data } = await supabase
    .from("embajadores")
    .select("nombre, telefono, codigo_referido, estado")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    id,
    email: email ?? "",
    nombre: data.nombre,
    telefono: data.telefono,
    codigoReferido: data.codigo_referido,
    estado: data.estado,
  };
}

// onAuthStateChange fires on every tab/hook that calls init(); guard so we
// only subscribe once per page load instead of once per component mount.
let initialized = false;

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  loading: true,

  init: () => {
    if (initialized) return;
    initialized = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        set({ user: null, loading: false });
        return;
      }
      loadProfile(session.user.id, session.user.email).then((profile) => {
        set({ user: profile, loading: false });
      });
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        set({ user: null, loading: false });
        return;
      }
      loadProfile(session.user.id, session.user.email).then((profile) => {
        set({ user: profile, loading: false });
      });
    });
  },

  register: async ({ name, email, phone, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre: name, telefono: phone, role: "embajador" } },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, needsEmailConfirmation: !data.session };
  },

  login: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  logout: async () => {
    await supabase.auth.signOut();
  },
}));

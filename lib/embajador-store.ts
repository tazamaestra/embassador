// Perfil de embajador. DORMIDO detrás de FEATURE_AMBASSADORS.
//
// Vive aparte de lib/auth-store.ts —que es el de clientes— para que el código
// de la tienda no arrastre la tabla `embajadores` ni el código de referido.
// Solo lo usa components/dashboard/AmbassadorDashboard.tsx.

import { create } from "zustand";
import { getSupabase, haySesionGuardada } from "@/lib/supabase";

export interface Embajador {
  id: string;
  email: string;
  nombre: string;
  telefono: string;
  codigoReferido: string;
  estado: string;
}

interface EmbajadorState {
  user: Embajador | null;
  loading: boolean;
  init: () => void;
}

async function cargarPerfil(
  id: string,
  email: string | undefined
): Promise<Embajador | null> {
  const supabase = await getSupabase();
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

let initialized = false;

export const useEmbajadorStore = create<EmbajadorState>()((set) => ({
  user: null,
  loading: true,

  init: () => {
    if (initialized) return;
    initialized = true;

    const sincronizar = (id?: string, email?: string) => {
      if (!id) {
        set({ user: null, loading: false });
        return;
      }
      cargarPerfil(id, email).then((user) => set({ user, loading: false }));
    };

    // Sin sesión guardada no hace falta bajar el SDK para saber que no hay
    // embajador: se responde de una y el panel manda a /acceso.
    if (!haySesionGuardada()) {
      set({ user: null, loading: false });
      return;
    }

    void getSupabase().then(async (supabase) => {
      const { data } = await supabase.auth.getSession();
      sincronizar(data.session?.user?.id, data.session?.user?.email);

      supabase.auth.onAuthStateChange((_event, session) => {
        sincronizar(session?.user?.id, session?.user?.email);
      });
    });
  },
}));

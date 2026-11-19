import { create } from "zustand";
import { getSupabase, haySesionGuardada, hayRespuestaOAuth } from "@/lib/supabase";

// Sesión del cliente o del equipo. No hay registro público: las cuentas las
// crea el equipo desde el panel. Dos formas de entrar:
//   · correo y la contraseña que se le envió;
//   · código de 6 dígitos al correo (solo para cuentas que ya existen).

export interface Cliente {
  id: string;
  email: string;
  nombre: string;
  telefono: string;
}

interface Resultado {
  ok: boolean;
  error?: string;
}

interface AuthState {
  user: Cliente | null;
  loading: boolean;
  /** null mientras se pregunta. true = cuenta del equipo (va a /admin). */
  esEquipo: boolean | null;
  init: () => void;
  entrarConPassword: (email: string, password: string) => Promise<Resultado>;
  pedirCodigo: (email: string) => Promise<Resultado>;
  verificarCodigo: (email: string, codigo: string) => Promise<Resultado>;
  cambiarClave: (nueva: string) => Promise<Resultado>;
  logout: () => Promise<void>;
}

/** Mínimo de Supabase; se valida aquí para no gastar un viaje de red. */
export const LARGO_MINIMO_PASSWORD = 6;

export function traducirErrorAuth(mensaje: string | undefined, es: boolean): string {
  const m = (mensaje ?? "").toLowerCase();
  if (m.includes("invalid") && m.includes("token")) {
    return es ? "Ese código no es. Revísalo o pide otro." : "That code isn't right. Check it or ask for another.";
  }
  if (m.includes("expired")) {
    return es ? "El código venció. Pide uno nuevo." : "The code expired. Request a new one.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return es ? "Muchos intentos seguidos. Espera un minuto." : "Too many attempts. Wait a minute.";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return es ? "Revisa el correo." : "Check the email address.";
  }
  if (m.includes("invalid login credentials")) {
    return es ? "Ese correo y esa contraseña no coinciden." : "That email and password don't match.";
  }
  if (m.includes("already registered") || m.includes("already exists")) {
    return es
      ? "Ese correo ya tiene cuenta. Entra con tu contraseña."
      : "That email already has an account. Sign in with your password.";
  }
  if (m.includes("email not confirmed")) {
    return es ? "Confirma tu correo antes de entrar." : "Confirm your email before signing in.";
  }
  if (m.includes("password") && (m.includes("short") || m.includes("at least"))) {
    return es
      ? `La contraseña necesita al menos ${LARGO_MINIMO_PASSWORD} caracteres.`
      : `The password needs at least ${LARGO_MINIMO_PASSWORD} characters.`;
  }
  if (m.includes("signups not allowed") || m.includes("signup") && m.includes("disabled") || m.includes("user not found")) {
    return es
      ? "Ese correo no tiene cuenta. Las cuentas las creamos nosotros y te llegan con tu compra."
      : "That email has no account. We create accounts and send them with your purchase.";
  }
  if (m.includes("same") && m.includes("password")) {
    return es ? "La contraseña nueva debe ser distinta de la actual." : "The new password must be different from the current one.";
  }
  return es ? "No se pudo. Intenta de nuevo." : "That didn't work. Try again.";
}

async function cargarPerfil(id: string, email: string | undefined): Promise<Cliente> {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("clientes")
    .select("nombre, telefono")
    .eq("id", id)
    .maybeSingle();

  return {
    id,
    email: email ?? "",
    nombre: data?.nombre ?? "",
    telefono: data?.telefono ?? "",
  };
}

// onAuthStateChange se dispara por cada componente que llama init(); estos
// guards hacen que solo nos suscribamos una vez por carga de página.
let initialized = false;
let escuchando = false;

type Aplicar = (estado: Partial<AuthState>) => void;

/** Carga el SDK, resuelve la sesión y queda atento a los cambios. */
async function escucharSesion(set: Aplicar) {
  if (escuchando) return;
  escuchando = true;

  const supabase = await getSupabase();

  const sincronizar = async (id?: string, email?: string) => {
    if (!id) {
      set({ user: null, loading: false, esEquipo: null });
      return;
    }

    // La sesión ya dice quién es. Se publica de una, sin esperar a la consulta
    // del perfil: así /cuenta pide su resumen en paralelo. El nombre y el
    // teléfono entran un instante después, encima de lo ya pintado.
    set({ user: { id, email: email ?? "", nombre: "", telefono: "" }, loading: false, esEquipo: null });
    const [perfil, rol] = await Promise.all([
      cargarPerfil(id, email),
      supabase.rpc("es_equipo").then((r) => !r.error && r.data === true, () => false),
    ]);
    set({ user: perfil, esEquipo: rol });
  };

  const { data } = await supabase.auth.getSession();
  await sincronizar(data.session?.user?.id, data.session?.user?.email);

  supabase.auth.onAuthStateChange((_event, session) => {
    void sincronizar(session?.user?.id, session?.user?.email);
  });
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  loading: true,
  esEquipo: null,

  // Sin sesión guardada no hay nada que resolver: se responde "anónimo" al
  // instante y el SDK ni se descarga. Solo quien ya entró alguna vez paga esos
  // 225 KB, y los paga después del primer pintado.
  init: () => {
    if (initialized) return;
    initialized = true;

    // Al volver de un enlace de correo el token viene en el hash y todavía
    // no hay nada guardado, así que ese caso también obliga a cargar el SDK.
    if (!haySesionGuardada() && !hayRespuestaOAuth()) {
      set({ user: null, loading: false });
      return;
    }

    escucharSesion(set);
  },

  entrarConPassword: async (email, password) => {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };

    await escucharSesion(set);
    return { ok: true };
  },

  pedirCodigo: async (email) => {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // false: el código solo sirve para cuentas que ya creó el equipo.
      options: { shouldCreateUser: false },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  verificarCodigo: async (email, codigo) => {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: codigo.trim(),
      type: "email",
    });
    if (error) return { ok: false, error: error.message };

    // Si al cargar la página no había sesión, nadie está escuchando todavía.
    // Ahora sí la hay, así que se engancha el listener y se carga el perfil.
    await escucharSesion(set);
    return { ok: true };
  },

  cambiarClave: async (nueva) => {
    if (nueva.length < LARGO_MINIMO_PASSWORD) return { ok: false, error: "password is too short" };
    const supabase = await getSupabase();
    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  logout: async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    set({ user: null, loading: false, esEquipo: null });
  },
}));

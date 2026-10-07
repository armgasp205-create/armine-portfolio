import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase.ts";

interface AuthState { session: Session | null; loading: boolean; error: string }
const AuthContext = createContext<AuthState>({ session: null, loading: true, error: "" });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: !!supabase, error: "" });
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    let changed = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      changed = true;
      if (alive) setState({ session, loading: false, error: "" });
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (alive && !changed) setState({ session: data.session, loading: false, error: error ? "Չհաջողվեց ստուգել մուտքը։ Թարմացրու էջը։" : "" });
    }).catch(() => { if (alive && !changed) setState({ session: null, loading: false, error: "Չհաջողվեց ստուգել մուտքը։" }); });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);

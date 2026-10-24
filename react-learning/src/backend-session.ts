import { supabase } from "./supabase.ts";

export async function backendHeaders(): Promise<Record<string, string>> {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

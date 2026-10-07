import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
// Only a browser-safe publishable key belongs in Vite's public environment.
export const supabase = url && /^https:\/\//.test(url) && key?.startsWith("sb_publishable_")
  ? createClient(url, key, {
    auth: { flowType: "pkce", detectSessionInUrl: true },
    global: { fetch: (input, init) => fetch(input, {
      ...init,
      signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    }) },
  })
  : null;

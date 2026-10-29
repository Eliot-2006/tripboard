import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * Supabase in the browser. The session lives in cookies, so the server sees the same sign-in. Only used on pages that
 * the server rendered after `currentUser()`, which reports accounts as unavailable when Supabase isn't configured.
 */
export const createClient = () => createBrowserClient(supabaseEnv!.url, supabaseEnv!.key);

/**
 * Supabase as a logged-out visitor, whatever the browser's session: the publishable key only, nothing stored. For the
 * share page, which must show the same thing to everyone holding the link. Needs `supabaseEnv`.
 */
export const createPublicClient = () =>
  createSupabaseClient(supabaseEnv!.url, supabaseEnv!.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

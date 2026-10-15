import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/**
 * Supabase in the browser. The session lives in cookies, so the server sees the same sign-in. Only used on pages that
 * the server rendered after `currentUser()`, which reports accounts as unavailable when Supabase isn't configured.
 */
export const createClient = () => createBrowserClient(supabaseEnv!.url, supabaseEnv!.key);

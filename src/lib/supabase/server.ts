import { createServerClient } from "@supabase/ssr";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/** Supabase for one server request, reading that request's cookies. Needs `supabaseEnv`. */
async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseEnv!.url, supabaseEnv!.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        // Server Components cannot set cookies. The proxy has already refreshed the session for this request.
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {}
      },
    },
  });
}

/**
 * The signed-in user's id, verified from the session cookie. `unavailable` means Supabase isn't configured or could not
 * be reached (for example a paused free project), so pages can say so and point to the demo instead of treating it as
 * signed out.
 */
export async function currentUser(): Promise<{ id: string | null; unavailable: boolean }> {
  if (!supabaseEnv) return { id: null, unavailable: true };
  const { data, error } = await (await createClient()).auth.getClaims();
  if (data) return { id: data.claims.sub, unavailable: false };
  return { id: null, unavailable: isAuthRetryableFetchError(error) };
}

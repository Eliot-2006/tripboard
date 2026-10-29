import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Keeps the Supabase session fresh: an expired access token is refreshed here, once per request, and the new cookies
 * go both to the page being rendered and back to the browser. Pages decide who may see them.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Without Supabase there is no session to refresh. The pages show accounts as unavailable.
  if (!supabaseEnv) return response;
  const supabase = createServerClient(
    supabaseEnv.url,
    supabaseEnv.key,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    },
  );
  // Nothing may run between creating the client and this call, or sessions can be dropped at random.
  await supabase.auth.getClaims();
  return response;
}

// Only the pages that use accounts. The demo never touches Supabase (DEMO-1).
export const config = { matcher: ["/", "/login", "/signup", "/auth/confirm", "/forgot-password", "/reset-password", "/trips/:path*"] };

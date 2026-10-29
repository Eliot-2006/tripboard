import { type NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/auth/safeNext";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** Where Google sign-in returns (PKCE): trade the code for a session, which sets the cookies, then go on. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  // Google or Supabase reports a refusal (for example "access_denied" when the user cancels) as an `error` parameter.
  if (supabaseEnv && code && !params.has("error")) {
    const { error } = await (await createClient()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext(params.get("next")), request.url));
  }
  return NextResponse.redirect(new URL("/login?error=google", request.url));
}

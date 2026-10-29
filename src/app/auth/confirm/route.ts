import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["email", "recovery", "signup", "invite", "magiclink", "email_change"];

/** Where email links land (confirm sign-up, reset password): verify the token, which signs the user in, then go on. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token_hash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType;
  // Only ever redirect within this site: "//evil.test" or "/\evil.test" parse to another origin and fall back.
  const next = new URL(params.get("next")?.startsWith("/") ? params.get("next")! : "/trips", request.url);
  const destination = next.origin === request.nextUrl.origin ? next : new URL("/trips", request.url);

  if (supabaseEnv && token_hash && TYPES.includes(type)) {
    const { error } = await (await createClient()).auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(destination);
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}

import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * One cheap database query a day (vercel.json cron), so the free Supabase project isn't paused for inactivity while
 * nobody is signed in. Anonymous visitors may not read trips, so Postgres answers "permission denied" (42501): the
 * query still reached the database, which is all this needs.
 * ponytail: daily is the Hobby plan's cron limit; Supabase emails a warning before pausing if that ever falls short.
 */
export async function GET() {
  if (!supabaseEnv) return new Response("Supabase not configured", { status: 503 });
  const { error } = await createClient(supabaseEnv.url, supabaseEnv.key).from("trips").select("id").limit(1);
  const reached = !error || error.code === "42501";
  return new Response(reached ? "ok" : error.message, { status: reached ? 200 : 502 });
}

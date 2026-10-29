import type { Metadata } from "next";
import { SharedWorkspace } from "@/components/trip/SharedWorkspace";
import { Unavailable } from "@/components/Unavailable";
import { supabaseEnv } from "@/lib/supabase/env";

// A link is a secret between the owner and whoever they sent it to: keep it out of search results.
export const metadata: Metadata = { title: "Shared trip · Tripboard", robots: { index: false, follow: false } };

// The trip is fetched in the browser, straight from Supabase as a logged-out visitor, so this page needs no session.
export default async function SharePage({ params }: PageProps<"/share/[token]">) {
  if (!supabaseEnv) return <Unavailable />;
  const { token } = await params;
  return <SharedWorkspace token={token} />;
}

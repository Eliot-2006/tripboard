"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/** Logs out and returns to the landing page (AUTH-2). Styled for the black band. */
export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const signOut = async () => {
    setBusy(true);
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
  };
  return (
    <Button
      variant="ghost"
      className="min-h-11 px-4 text-signage-foreground hover:bg-white/10 hover:text-signage-foreground focus-visible:ring-white"
      disabled={busy}
      onClick={signOut}
    >
      {busy ? "Logging out…" : "Log out"}
    </Button>
  );
}

import { redirect } from "next/navigation";
import { AccountShell } from "@/components/AccountShell";
import { AuthForm } from "@/components/auth/AuthForm";
import { GUTTER } from "@/components/trip/TripHeader";
import { Unavailable } from "@/components/Unavailable";
import { currentUser } from "@/lib/supabase/server";
import { cn } from "cn";

/** Account pages share availability and session checks. */
export async function AuthPage({ mode, linkError }: { mode: "login" | "signup" | "forgot-password" | "reset-password"; linkError?: boolean }) {
  const user = await currentUser();
  if (user.unavailable) return <Unavailable />;
  if (mode === "reset-password") {
    if (!user.id) redirect("/forgot-password");
  } else if (user.id) redirect("/trips");
  return (
    <AccountShell>
      <div className={cn("flex flex-1 flex-col py-12 sm:py-16", GUTTER)}>
        <AuthForm mode={mode} linkError={linkError} />
      </div>
    </AccountShell>
  );
}

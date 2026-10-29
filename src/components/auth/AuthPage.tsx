import { redirect } from "next/navigation";
import { AccountShell } from "@/components/AccountShell";
import { AuthForm } from "@/components/auth/AuthForm";
import { GUTTER } from "@/components/trip/TripHeader";
import { Unavailable } from "@/components/Unavailable";
import { currentUser } from "@/lib/supabase/server";
import { cn } from "cn";

/** The log in and sign up pages. Someone already signed in goes straight to their trips. */
export async function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const user = await currentUser();
  if (user.unavailable) return <Unavailable />;
  if (user.id) redirect("/trips");
  return (
    <AccountShell>
      <div className={cn("flex flex-1 flex-col py-12 sm:py-16", GUTTER)}>
        <AuthForm mode={mode} />
      </div>
    </AccountShell>
  );
}

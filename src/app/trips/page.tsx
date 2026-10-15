import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/AccountShell";
import { AccountProvider } from "@/components/auth/AccountProvider";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { TripList } from "@/components/trip/TripList";
import { Unavailable } from "@/components/Unavailable";
import { currentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your trips · Tripboard" };

export default async function TripsPage() {
  const user = await currentUser();
  if (user.unavailable) return <Unavailable />;
  if (!user.id) redirect("/login");
  return (
    <AccountShell actions={<SignOutButton />}>
      <AccountProvider>
        <TripList />
      </AccountProvider>
    </AccountShell>
  );
}

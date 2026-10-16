"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountProvider } from "@/components/auth/AccountProvider";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Workspace } from "@/components/trip/Workspace";

/** A signed-in user's trip: the workspace on Supabase, with a way back to all trips (TRIP-6). */
export function AccountWorkspace({ tripId }: { tripId: string }) {
  const router = useRouter();
  return (
    <AccountProvider>
      <Workspace
        tripId={tripId}
        nav={
          <>
            <Link
              href="/trips"
              className="flex min-h-11 items-center text-sm font-semibold text-signage-muted hover:text-signage-foreground focus-visible:outline-2 focus-visible:outline-signage-foreground"
            >
              ← All trips
            </Link>
            <SignOutButton />
          </>
        }
        onTripDeleted={() => router.replace("/trips")}
      />
    </AccountProvider>
  );
}

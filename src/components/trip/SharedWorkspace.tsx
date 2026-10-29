"use client";

import Link from "next/link";
import { useState } from "react";
import { Workspace } from "@/components/trip/Workspace";
import { TripLoading, TripMessage } from "@/components/trip/WorkspaceState";
import { Button, buttonVariants } from "@/components/ui/button";
import { DemoRepository } from "@/lib/data/demo-repository";
import { useSharedTrip } from "@/lib/data/hooks";
import { RepositoryProvider } from "@/lib/data/provider";
import type { SharedTrip } from "@/lib/data/shared";
import { SupabaseRepository } from "@/lib/data/supabase-repository";
import { createPublicClient } from "@/lib/supabase/client";

/** What a read-only link shows, for anyone, signed in or not. The database decides what a link may reveal. */
export function SharedWorkspace({ token }: { token: string }) {
  const [repository] = useState(() => new SupabaseRepository(createPublicClient()));
  return (
    <RepositoryProvider repository={repository}>
      <SharedTripView token={token} />
    </RepositoryProvider>
  );
}

function SharedTripView({ token }: { token: string }) {
  const shared = useSharedTrip(token);
  if (shared.isPending) return <TripLoading />;
  if (shared.isError) {
    return (
      <TripMessage title="We couldn't load this trip">
        <p className="text-muted-foreground">Check your connection and try again.</p>
        <Button className="min-h-11 px-4" onClick={() => void shared.refetch()}>
          Try again
        </Button>
      </TripMessage>
    );
  }
  if (!shared.data) {
    // Unknown, mistyped and turned-off links look the same, so a link reveals nothing about which trips exist.
    return (
      <TripMessage title="We couldn't find this trip">
        <p className="text-muted-foreground">The link may be mistyped, or the owner may have turned it off. Ask them for a new one.</p>
        <Link href="/" className={buttonVariants({ className: "min-h-11 px-4" })}>
          Go to Tripboard
        </Link>
      </TripMessage>
    );
  }
  return <Snapshot shared={shared.data} />;
}

/** The shared trip held in memory, so the workspace reads it like any other trip. Nothing here can be saved. */
function Snapshot({ shared }: { shared: SharedTrip }) {
  const [repository] = useState(() => new DemoRepository({ trips: [shared.trip], items: shared.items }));
  return (
    <RepositoryProvider repository={repository}>
      <Workspace
        tripId={shared.trip.id}
        readOnly
        nav={
          <>
            <Link
              href="/"
              className="flex min-h-11 items-center text-sm font-semibold text-signage-muted hover:text-signage-foreground focus-visible:outline-2 focus-visible:outline-signage-foreground"
            >
              Tripboard
            </Link>
            <span className="text-sm text-signage-muted">Read-only view</span>
          </>
        }
      />
    </RepositoryProvider>
  );
}

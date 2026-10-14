"use client";

import Link from "next/link";
import { useState } from "react";
import { Workspace } from "@/components/trip/Workspace";
import { buttonVariants } from "@/components/ui/button";
import { createDemoRepository, DEMO_TRIP_ID } from "@/lib/data/demo-seed";
import { RepositoryProvider } from "@/lib/data/provider";

export function DemoApp() {
  // One in-memory repository per page load: edits live here and reset on refresh (DEMO-2).
  const [repository] = useState(createDemoRepository);

  return (
    <>
      <div role="note" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b bg-muted px-4 py-2 text-sm">
        <span>You&apos;re viewing sample data. Changes reset when you refresh.</span>
        <Link href="/signup" className={buttonVariants({ size: "sm" })}>
          Sign up to plan your own
        </Link>
      </div>
      <RepositoryProvider repository={repository}>
        <Workspace tripId={DEMO_TRIP_ID} />
      </RepositoryProvider>
    </>
  );
}

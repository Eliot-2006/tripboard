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
      <div role="note" className="flex items-center justify-between gap-3 border-b bg-muted px-4 py-1 text-xs sm:justify-center sm:gap-4 sm:text-sm">
        <span>Sample data. Changes reset when you refresh.</span>
        <Link href="/signup" className={buttonVariants({ size: "sm", className: "min-h-11 shrink-0 px-3 text-xs sm:text-[0.8rem]" })}>
          Sign up<span className="sr-only sm:not-sr-only">&nbsp;to plan your own</span>
        </Link>
      </div>
      <RepositoryProvider repository={repository}>
        <Workspace tripId={DEMO_TRIP_ID} />
      </RepositoryProvider>
    </>
  );
}

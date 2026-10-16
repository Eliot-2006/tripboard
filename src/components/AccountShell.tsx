import Link from "next/link";
import type { ReactNode } from "react";
import { GUTTER } from "@/components/trip/TripHeader";
import { cn } from "cn";

/** The black band with the Tripboard name, over a page's content. `actions` sit at the band's far end. */
export function AccountShell({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col">
      <div className={cn("flex min-h-16 items-center justify-between gap-4 bg-signage py-3 text-signage-foreground", GUTTER)}>
        <Link
          href="/"
          className="text-xl font-bold tracking-tight font-stretch-condensed outline-offset-4 focus-visible:outline-2 focus-visible:outline-signage-foreground"
        >
          Tripboard
        </Link>
        {actions}
      </div>
      {children}
    </main>
  );
}

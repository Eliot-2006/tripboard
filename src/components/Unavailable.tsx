import Link from "next/link";
import { AccountShell } from "@/components/AccountShell";
import { GUTTER } from "@/components/trip/TripHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

/** Shown when accounts can't be reached, for example while the free database is paused (NFR-6). */
export function Unavailable() {
  return (
    <AccountShell>
      <div className={cn("flex flex-1 flex-col justify-center gap-5 py-16", GUTTER)}>
        <h1 className="text-4xl font-semibold tracking-tight font-stretch-condensed sm:text-5xl">
          Accounts are unavailable right now
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          We can&apos;t reach sign-in or your trips at the moment. Your trips are safe. Please try again later, or explore
          the demo trip, which works without an account.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/demo" className={buttonVariants({ className: "min-h-11 px-5 text-base" })}>
            Try the demo
          </Link>
          <Link href="/" className={buttonVariants({ variant: "outline", className: "min-h-11 px-5 text-base" })}>
            Back to home
          </Link>
        </div>
      </div>
    </AccountShell>
  );
}

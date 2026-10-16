import type { ReactNode } from "react";
import { GUTTER } from "@/components/trip/TripHeader";
import { cn } from "cn";

const bar = "rounded-full motion-safe:animate-pulse";

/** The trip's shape while it loads: the signage band, the budget strip and a few stations on a line. */
export function TripLoading() {
  return (
    <div role="status" className="flex flex-1 flex-col">
      <span className="sr-only">Loading trip…</span>
      <div aria-hidden className="bg-signage">
        <div className={cn("flex flex-col gap-3 pt-6 pb-5", GUTTER)}>
          <div className={cn(bar, "h-9 w-56 max-w-full bg-white/20 sm:h-12 sm:w-80")} />
          <div className={cn(bar, "h-4 w-64 max-w-full bg-white/10")} />
          <div className="flex gap-3 pt-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={cn(bar, "size-8 bg-white/15")} />
            ))}
          </div>
        </div>
      </div>
      <div aria-hidden className={cn("flex gap-8 border-b py-5", GUTTER)}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className={cn(bar, "h-3 w-16 bg-secondary")} />
            <div className={cn(bar, "h-5 w-20 bg-secondary")} />
          </div>
        ))}
      </div>
      <div aria-hidden className={cn("flex flex-col gap-8 py-6", GUTTER)}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex gap-4">
            <div className={cn(bar, "size-7 shrink-0 bg-secondary")} />
            <div className="flex flex-1 flex-col gap-3">
              <div className={cn(bar, "h-5 w-32 bg-secondary")} />
              <div className={cn(bar, "h-4 w-full max-w-md bg-secondary")} />
              <div className={cn(bar, "h-4 w-2/3 max-w-xs bg-secondary")} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A trip that cannot be shown: a band with what happened, then what to do about it. */
export function TripMessage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="alert" className="flex flex-1 flex-col">
      <div className={cn("bg-signage pt-6 pb-5 text-signage-foreground", GUTTER)}>
        <h1 className="text-3xl leading-none font-semibold tracking-tight font-stretch-condensed sm:text-5xl">{title}</h1>
      </div>
      <div className={cn("flex max-w-prose flex-col items-start gap-4 py-6", GUTTER)}>{children}</div>
    </div>
  );
}

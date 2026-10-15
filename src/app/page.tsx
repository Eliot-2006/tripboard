import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { buttonVariants } from "@/components/ui/button";
import { loadDemoSeed } from "@/lib/data/demo-seed";
import { dayColor, dayTextColor } from "@/lib/map/colors";
import { sortItems } from "@/lib/ordering";
import { currentUser } from "@/lib/supabase/server";
import { daysBetween, formatDay } from "@/lib/time";
import { cn } from "cn";

const onDark = "min-h-11 px-5 text-base";

export default async function Home() {
  // Signed-in travelers go straight to their trips. If accounts can't be reached, the landing page still works.
  if ((await currentUser()).id) redirect("/trips");

  // The sample trip from /demo, drawn as a strip map: one bullet per day, its stops listed under it.
  const { trips, items } = loadDemoSeed();
  const trip = trips[0];
  const byDay = Object.groupBy(sortItems(items), (i) => i.day);
  const days = daysBetween(trip.start_date, trip.end_date);

  return (
    <main className="flex flex-1 flex-col">
      <div className="bg-signage text-signage-foreground">
        <div className="flex flex-col gap-10 px-4 pt-8 pb-14 sm:px-6 lg:px-8 lg:pt-10 lg:pb-20 2xl:px-12">
          <h1 className="text-xl font-bold tracking-tight font-stretch-condensed">Tripboard</h1>
          <div className="flex max-w-6xl flex-col gap-8">
            <p className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance font-stretch-condensed sm:text-5xl lg:text-7xl">
              Your whole trip in one place: a day-by-day itinerary with a map that shows every stop.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/demo" className={cn(buttonVariants(), onDark, "bg-white text-foreground hover:bg-white/85")}>
                Try the demo
              </Link>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  onDark,
                  "border-white/30 bg-transparent text-signage-foreground hover:bg-white/10 hover:text-signage-foreground",
                )}
              >
                Sign up
              </Link>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost" }), onDark, "text-signage-foreground hover:bg-white/10 hover:text-signage-foreground")}
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>

      <section aria-labelledby="sample" className="flex flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8 lg:py-16 2xl:px-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="sample" className="text-3xl font-semibold tracking-tight font-stretch-condensed">
              {trip.name}
            </h2>
            <p className="mt-1 text-muted-foreground tabular-nums">
              {formatDay(trip.start_date)} to {formatDay(trip.end_date)} · {trip.destinations.join(", ")}
            </p>
          </div>
          <Link href="/demo" className="text-sm font-semibold underline">
            Open this trip
          </Link>
        </div>

        <ol className="grid gap-x-4 lg:grid-cols-9">
          {days.map((day, i) => {
            const stops = byDay[day] ?? [];
            return (
              <li key={day} className="group relative flex gap-4 pb-8 lg:flex-col lg:gap-3 lg:pb-0" style={{ "--line": dayColor(i) } as CSSProperties}>
                {/* Each day's segment runs to the next bullet: down on phones, across on wide screens. */}
                <span
                  aria-hidden
                  className="absolute top-7 bottom-0 left-3 w-1 bg-(--line) group-last:hidden lg:top-3 lg:right-[-1rem] lg:bottom-auto lg:left-7 lg:h-1 lg:w-auto"
                />
                <span
                  aria-hidden
                  className="relative flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums"
                  style={{ backgroundColor: dayColor(i), color: dayTextColor(i) }}
                >
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-col gap-1.5 pt-0.5 lg:pt-0">
                  <p className="font-semibold font-stretch-condensed">
                    <span className="sr-only">Day {i + 1}, </span>
                    {formatDay(day)}
                  </p>
                  <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {stops.length === 0 ? <li>Open day</li> : stops.map((s) => <li key={s.id}>{s.title}</li>)}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}

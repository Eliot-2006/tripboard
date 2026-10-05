import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Tripboard</h1>
      <p className="text-lg text-muted-foreground">
        Your whole trip in one place: a day-by-day itinerary with a map that shows every stop.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/signup" className={buttonVariants({ size: "lg" })}>
          Sign up
        </Link>
        <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Log in
        </Link>
      </div>
    </main>
  );
}

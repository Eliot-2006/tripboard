import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function BackendPending({ title }: { title: string }) {
  return (
    <main className="flex flex-1 flex-col">
      <div className="bg-signage px-4 py-4 text-signage-foreground sm:px-6 lg:px-8 2xl:px-12">
        <Link href="/" className="text-xl font-bold tracking-tight font-stretch-condensed outline-offset-4 focus-visible:outline-2 focus-visible:outline-white">
          Tripboard
        </Link>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-5 px-4 py-16 sm:px-6 lg:px-8 2xl:px-12">
        <h1 className="text-4xl font-semibold tracking-tight font-stretch-condensed sm:text-5xl">{title}</h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          Accounts aren&apos;t connected yet. The demo trip works without signing in.
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
    </main>
  );
}

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function BackendPending({ title }: { title: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">
        Accounts aren&apos;t connected yet. The demo trip works without signing in.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/demo" className={buttonVariants()}>
          Try the demo
        </Link>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to home
        </Link>
      </div>
    </main>
  );
}

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function BackendPending({ title }: { title: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">
        Accounts aren&apos;t connected yet. This page will work once the backend is added.
      </p>
      <Link href="/" className={buttonVariants()}>
        Back to home
      </Link>
    </main>
  );
}

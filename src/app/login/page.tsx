import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Log in · Tripboard" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  return <AuthPage mode="login" googleError={(await searchParams).error === "google"} />;
}

import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Reset password · Tripboard" };

export default function Page() {
  return <AuthPage mode="reset-password" />;
}

import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Forgot password? · Tripboard" };

export default function Page() {
  return <AuthPage mode="forgot-password" />;
}

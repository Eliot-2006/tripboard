import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Sign up · Tripboard" };

export default function SignupPage() {
  return <AuthPage mode="signup" />;
}

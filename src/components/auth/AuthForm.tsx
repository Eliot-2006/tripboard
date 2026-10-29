"use client";

import { isAuthApiError, isAuthRetryableFetchError } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "forgot-password" | "reset-password";

const COPY = {
  "forgot-password": { title: "Forgot password?", submit: "Send reset link", busy: "Sending…", other: "Remember your password?", otherLink: "Log in", otherHref: "/login" },
  "reset-password": { title: "Reset password", submit: "Save password", busy: "Saving…", other: "Back to", otherLink: "Log in", otherHref: "/login" },
  login: { title: "Log in", submit: "Log in", busy: "Logging in…", other: "No account yet?", otherLink: "Sign up", otherHref: "/signup" },
  signup: { title: "Sign up", submit: "Create account", busy: "Creating account…", other: "Already have an account?", otherLink: "Log in", otherHref: "/login" },
} as const;

const MIN_PASSWORD = 6;

/** What went wrong, in words a traveler can act on. */
function explain(error: unknown, mode: Mode): string {
  if (isAuthRetryableFetchError(error)) {
    return "We can't reach sign-in right now. Please try again later, or explore the demo, which works without an account.";
  }
  const code = isAuthApiError(error) ? error.code : undefined;
  if (code === "email_not_confirmed") return "Confirm your email first: check your inbox for the link we sent.";
  if (code === "invalid_credentials") return "That email and password don't match. Check them and try again.";
  if (code === "user_already_exists") return "There's already an account with this email. Log in instead.";
  if (code === "weak_password") return `Choose a stronger password, at least ${MIN_PASSWORD} characters.`;
  if (code === "email_address_invalid") return "Enter a valid email address.";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit") {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (mode === "forgot-password") return "We couldn't send the reset link. Please try again.";
  if (mode === "reset-password") return "We couldn't update your password. Please try again, or request a new reset link.";
  return mode === "login" ? "We couldn't log you in. Please try again." : "We couldn't create your account. Please try again.";
}

/** Account forms share validation, error messages and layout. */
export function AuthForm({ mode, linkError = false }: { mode: Mode; linkError?: boolean }) {
  const copy = COPY[mode];
  const router = useRouter();
  const uid = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});
  const needsEmail = mode !== "reset-password";
  const needsPassword = mode !== "forgot-password";
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const errors = {
      email: !needsEmail || /^\S+@\S+\.\S+$/.test(email.trim()) ? undefined : "Enter your email address, like you@example.com",
      password:
        (mode === "signup" || mode === "reset-password") && password.length < MIN_PASSWORD
          ? `Use at least ${MIN_PASSWORD} characters`
          : !needsPassword || password
            ? undefined
            : "Enter your password",
      confirm: mode === "reset-password" && confirm !== password ? "Passwords must match" : undefined,
    };
    setFieldErrors(errors);
    if (errors.email || errors.password || errors.confirm) return;

    setBusy(true);
    const auth = createClient().auth;
    const credentials = { email: email.trim(), password };
    try {
      if (mode === "forgot-password") {
        const { error: authError } = await auth.resetPasswordForEmail(credentials.email);
        if (authError && authError.code !== "user_not_found") throw authError;
        setNotice(`If there's an account for ${credentials.email}, we've sent a link to reset your password.`);
        return;
      }
      if (mode === "reset-password") {
        const { error: authError } = await auth.updateUser({ password });
        if (authError) throw authError;
        router.replace("/trips");
        router.refresh();
        return;
      }
      const { data, error: authError } =
        mode === "login" ? await auth.signInWithPassword(credentials) : await auth.signUp(credentials);
      if (authError) throw authError;
      if (!data.session) {
        // The project asks new users to confirm their email first.
        setNotice(`Check ${credentials.email} for a link to confirm your account, then log in.`);
        return;
      }
      router.replace("/trips");
      router.refresh();
    } catch (e) {
      setError(explain(e, mode));
    } finally {
      setBusy(false);
    }
  };

  const id = (name: string) => `${uid}-${name}`;
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <h1 className="text-4xl font-semibold tracking-tight font-stretch-condensed sm:text-5xl">{copy.title}</h1>
      {linkError && (
        <p role="alert" className="text-sm text-destructive">
          That link has expired or was already used. Request a new password reset link, or check your inbox for your latest confirmation email.
        </p>
      )}
      {notice ? (
        <p role="status" className="text-lg">
          {notice}
        </p>
      ) : (
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          {needsEmail && (
            <Field id={id("email")} label="Email" error={fieldErrors.email}>
              {(a11y) => (
                <Input {...a11y} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </Field>
          )}
          {needsPassword && (
            <Field
              id={id("password")}
              label={mode === "reset-password" ? "New password" : "Password"}
              error={fieldErrors.password}
              hint={mode !== "login" ? `At least ${MIN_PASSWORD} characters` : undefined}
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
          )}
          {mode === "reset-password" && (
            <Field id={id("confirm")} label="Confirm password" error={fieldErrors.confirm}>
              {(a11y) => <Input {...a11y} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
            </Field>
          )}
          {mode === "login" && <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-semibold underline">Forgot password?</Link>}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="min-h-11 text-base" disabled={busy}>
            {busy ? copy.busy : copy.submit}
          </Button>
        </form>
      )}
      <p className="text-sm text-muted-foreground">
        {copy.other}{" "}
        <Link href={copy.otherHref} className="font-semibold text-foreground underline">
          {copy.otherLink}
        </Link>
        {" · "}
        <Link href="/demo" className="font-semibold text-foreground underline">
          Try the demo
        </Link>
      </p>
    </div>
  );
}

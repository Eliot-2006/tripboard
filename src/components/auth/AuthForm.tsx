"use client";

import { isAuthApiError, isAuthRetryableFetchError } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

const COPY = {
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
  if (code === "invalid_credentials") return "That email and password don't match. Check them and try again.";
  if (code === "user_already_exists") return "There's already an account with this email. Log in instead.";
  if (code === "weak_password") return `Choose a stronger password, at least ${MIN_PASSWORD} characters.`;
  if (code === "email_address_invalid") return "Enter a valid email address.";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit") {
    return "Too many attempts. Please wait a minute and try again.";
  }
  return mode === "login" ? "We couldn't log you in. Please try again." : "We couldn't create your account. Please try again.";
}

/** Email and password sign-in and sign-up (AUTH-1, AUTH-2). Both land on the trip list. */
export function AuthForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const router = useRouter();
  const uid = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const errors = {
      email: /^\S+@\S+\.\S+$/.test(email.trim()) ? undefined : "Enter your email address, like you@example.com",
      password:
        mode === "signup" && password.length < MIN_PASSWORD
          ? `Use at least ${MIN_PASSWORD} characters`
          : password
            ? undefined
            : "Enter your password",
    };
    setFieldErrors(errors);
    if (errors.email || errors.password) return;

    setBusy(true);
    const auth = createClient().auth;
    const credentials = { email: email.trim(), password };
    try {
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
      {notice ? (
        <p role="status" className="text-lg">
          {notice}
        </p>
      ) : (
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <Field id={id("email")} label="Email" error={fieldErrors.email}>
            {(a11y) => (
              <Input {...a11y} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            )}
          </Field>
          <Field
            id={id("password")}
            label="Password"
            error={fieldErrors.password}
            hint={mode === "signup" ? `At least ${MIN_PASSWORD} characters` : undefined}
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

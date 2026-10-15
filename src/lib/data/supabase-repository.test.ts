import { createClient } from "@supabase/supabase-js";
import { afterAll, describe } from "vitest";
import { makeTrip } from "@/test/factories";
import { runRepositoryContract } from "./repository.contract";
import { SupabaseRepository } from "./supabase-repository";

// Runs against the real project as a dedicated test account, set in .env.local:
//   TEST_USER_EMAIL=...  TEST_USER_PASSWORD=...
// Create that account through the app's sign-up page. Without it the suite is skipped. It deletes the account's
// trips when it ends, so never point it at an account with real trips.
try {
  process.loadEnvFile(".env.local");
} catch {}
const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key } = process.env;
const { TEST_USER_EMAIL: email, TEST_USER_PASSWORD: password } = process.env;
const configured = Boolean(url && key && email && password);

const db = configured ? createClient(url!, key!, { auth: { persistSession: false } }) : null;
let signedIn: Promise<unknown> | null = null;
const signIn = () =>
  (signedIn ??= db!.auth.signInWithPassword({ email: email!, password: password! }).then(({ error }) => {
    if (error) throw error;
  }));

describe.skipIf(!configured)("SupabaseRepository (needs TEST_USER_EMAIL and TEST_USER_PASSWORD)", () => {
  runRepositoryContract("SupabaseRepository", async () => {
    await signIn();
    const repo = new SupabaseRepository(db!);
    const { name, start_date, end_date, destinations, currency, total_budget } = makeTrip();
    const trip = await repo.createTrip({ name, start_date, end_date, destinations, currency, total_budget });
    return { repo, trip };
  });

  afterAll(async () => {
    if (!signedIn) return;
    // Row Level Security limits this to the test account's own trips. Their items go with them.
    await db!.from("trips").delete().not("id", "is", null);
    await db!.auth.signOut();
  });
});

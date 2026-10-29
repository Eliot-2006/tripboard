import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";
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

describe("SupabaseRepository.getSharedTrip (no database needed)", () => {
  const TOKEN = "3f0c1a52-8d6e-4b8e-9a54-7a1b2c3d4e5f";
  const repoWith = (reply: { data: unknown; error: unknown }) => {
    const rpc = vi.fn(async () => reply);
    return { rpc, repo: new SupabaseRepository({ rpc } as unknown as SupabaseClient) };
  };

  it("calls get_shared_trip with the token and maps the reply", async () => {
    const trip = { name: "Lisbon", start_date: "2027-05-01", end_date: "2027-05-02", destinations: [], currency: "EUR" };
    const { rpc, repo } = repoWith({ data: { trip, items: [] }, error: null });
    expect((await repo.getSharedTrip(TOKEN))?.trip.name).toBe("Lisbon");
    expect(rpc).toHaveBeenCalledWith("get_shared_trip", { p_token: TOKEN });
  });

  it("returns null for an unknown token, and does not ask the database about something that is not a token", async () => {
    const { rpc, repo } = repoWith({ data: null, error: null });
    expect(await repo.getSharedTrip(TOKEN)).toBeNull();
    expect(await repo.getSharedTrip("not-a-token")).toBeNull();
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("throws when the database fails, so the page can say so instead of showing not found", async () => {
    const { repo } = repoWith({ data: null, error: new Error("down") });
    await expect(repo.getSharedTrip(TOKEN)).rejects.toThrow("down");
  });
});

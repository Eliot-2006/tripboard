import { createClient } from "@supabase/supabase-js";
import { expect, type Browser, type Locator, type Page, test as base } from "@playwright/test";
import { card, day, dialog, drag, expectBudget, fillAuth, handle, titles } from "./helpers";

// Signed-in flows against the real Supabase project, as the dedicated test account set in .env.local
// (TEST_USER_EMAIL / TEST_USER_PASSWORD). Without them the whole file is skipped. Every trip made here is named
// with PREFIX, and only the trips a test made are deleted afterwards, so the account's other data is never touched.
try {
  process.loadEnvFile(".env.local");
} catch {}
const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key } = process.env;
const { TEST_USER_EMAIL: email, TEST_USER_PASSWORD: password } = process.env;
base.skip(!(url && key && email && password), "needs NEXT_PUBLIC_SUPABASE_* and TEST_USER_EMAIL / TEST_USER_PASSWORD in .env.local");

const PREFIX = "E2E-acct";
// Tests run in parallel on one account, so each cleans up only the trips it named itself.
const made: string[] = [];
const name = (label: string) => {
  const tripName = `${PREFIX} ${label} ${Math.random().toString(36).slice(2, 8)}`;
  made.push(tripName);
  return tripName;
};

// One sign-in per worker for the test helpers, and one more for the browser, since Supabase rate limits sign-ins.
let signedIn: ReturnType<typeof signInDb> | null = null;
async function signInDb() {
  const db = createClient(url!, key!, { auth: { persistSession: false } });
  const { error } = await db.auth.signInWithPassword({ email: email!, password: password! });
  if (error) throw error;
  return db;
}
const adminDb = () => (signedIn ??= signInDb());

const test = base.extend<{ userPage: Page }, { authState: Exclude<Parameters<Browser["newContext"]>[0], undefined>["storageState"] }>({
  authState: [
    async ({ browser }, provide) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await logIn(page);
      await provide(await context.storageState());
      await context.close();
    },
    { scope: "worker" },
  ],
  /** A page already signed in as the test account. */
  userPage: async ({ browser, authState }, provide) => {
    const context = await browser.newContext({ storageState: authState, viewport: { width: 1280, height: 1400 } });
    await provide(await context.newPage());
    await context.close();
  },
});

/** Row Level Security limits this to the test account; items go with their trips. */
test.afterEach(async () => {
  const db = await adminDb();
  await db.from("trips").delete().in("name", made.splice(0));
});

async function seedTrip(tripName: string, start = "2027-06-01", end = "2027-06-04") {
  const db = await adminDb();
  const { data, error } = await db
    .from("trips")
    .insert({ name: tripName, start_date: start, end_date: end, destinations: ["Tokyo"], currency: "USD", total_budget: 1000 })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function logIn(page: Page) {
  await page.goto("/login");
  await fillAuth(page, email!, password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/trips$/);
  await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
}

// Next.js also keeps an empty role=alert route announcer on the page.
const alert = (scope: Page | Locator) => scope.getByRole("alert").filter({ hasText: /\S/ });

async function addItem(page: Page, type: "Flight" | "Stay" | "Activity", fill: (d: Locator) => Promise<void>) {
  await page.getByRole("button", { name: "Add to trip" }).click();
  await dialog(page).getByRole("button", { name: new RegExp(`^(?!Move |\\d+\\. ).*${type}`) }).click();
  await fill(dialog(page));
  await dialog(page).getByRole("button", { name: `Add ${type.toLowerCase()}` }).click();
  await expect(dialog(page)).toHaveCount(0);
}

// Tall enough that a drag's source and target are on screen together.
test.use({ viewport: { width: 1280, height: 1400 } });

test("log in, keep the session on refresh, log out (AUTH-2, AUTH-3)", async ({ page }) => {
  await logIn(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/trips");
  await expect(page).toHaveURL(/\/login$/);
});

test("rejects a wrong password next to the form", async ({ page }) => {
  await page.goto("/login");
  await fillAuth(page, email!, `${password}-wrong`);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(alert(page)).toContainText("don't match");
  await expect(page).toHaveURL(/\/login$/);
});

test("signs up and asks to confirm the email (AUTH-1)", async ({ page }) => {
  // Supabase's reply when email confirmation is on: a user and no session. Mocked so no real user is created.
  await page.route("**/auth/v1/signup*", (route) =>
    route.fulfill({ json: { id: "00000000-0000-4000-8000-000000000000", aud: "authenticated", email: "new@example.com", identities: [{}] } }),
  );
  await page.goto("/signup");
  await fillAuth(page, "new@example.com", "e2e-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status").filter({ hasText: "new@example.com" })).toContainText("confirm your account");
});

test("creates a trip with validation, opens it, edits dates with a warning, then deletes it (TRIP-2..4, TRIP-6)", async ({ userPage: page }) => {
  const tripName = name("create");
  await page.goto("/trips");
  await page.getByRole("button", { name: "New trip" }).first().click();
  const d = dialog(page);

  await d.getByLabel("Name").fill(tripName);
  await d.getByLabel("Start date").fill("2027-06-10");
  await d.getByLabel("End date").fill("2027-06-05");
  await d.getByRole("button", { name: "Create trip" }).click();
  await expect(d.getByLabel("End date")).toHaveAccessibleDescription(/before|after/i);
  await expect(d.getByLabel("End date")).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/\/trips$/);

  await d.getByLabel("End date").fill("2027-06-13");
  await d.getByLabel("Destinations").fill("Tokyo, Kyoto");
  await d.getByLabel("Total budget").fill("2500");
  await d.getByLabel("Currency").fill("eur");
  await d.getByRole("button", { name: "Create trip" }).click();

  await expect(page).toHaveURL(/\/trips\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: tripName })).toBeVisible();
  await expect(page.getByText("Tokyo, Kyoto").first()).toBeVisible();
  await expect(day(page, 4)).toBeVisible();

  // Items outside shrunken dates warn before saving (TRIP-3).
  await addItem(page, "Activity", async (f) => {
    await f.getByLabel("Name", { exact: true }).fill("Late walk");
    await f.getByLabel("Start date").fill("2027-06-13");
    await f.getByLabel("Start time", { exact: true }).fill("10:00");
    await f.getByLabel("Time zone").fill("Tokyo");
  });
  await page.getByRole("button", { name: "Edit trip" }).click();
  await d.getByLabel("End date").fill("2027-06-11");
  await d.getByRole("button", { name: "Save changes" }).click();
  await expect(alert(d)).toContainText("1 item falls outside these dates");
  await d.getByRole("button", { name: "Save anyway" }).click();
  await expect(day(page, 2)).toBeVisible();
  await expect(day(page, 3)).toHaveCount(0);

  // Delete needs confirming; cancelling keeps the trip (TRIP-4).
  await page.getByRole("button", { name: "Edit trip" }).click();
  await d.getByRole("button", { name: "Delete trip" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText(`Delete “${tripName}”?`);
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(d).toBeVisible();
  await d.getByRole("button", { name: "Delete trip" }).click();
  await confirm.getByRole("button", { name: "Delete trip" }).click();

  await expect(page).toHaveURL(/\/trips$/);
  await expect(page.getByRole("link", { name: new RegExp(tripName) })).toHaveCount(0);
});

test("adds, edits, deletes, reorders and moves items, and it all persists (ITEM-1, ITEM-6, ITIN-5, ITIN-6)", async ({ userPage: page }) => {
  const tripName = name("items");
  const tripId = await seedTrip(tripName);
  await page.goto("/trips");
  await page.getByRole("link", { name: new RegExp(tripName) }).click();
  await expect(page).toHaveURL(`/trips/${tripId}`);
  await expect(page.getByRole("heading", { name: tripName })).toBeVisible();

  await addItem(page, "Flight", async (f) => {
    await f.getByLabel("Name", { exact: true }).fill("E2E flight");
    await f.getByLabel("Departure date").fill("2027-06-01");
    await f.getByLabel("Departure time", { exact: true }).fill("08:00");
    await f.getByLabel("Departure time zone").fill("Tokyo");
    await f.getByLabel("Arrival time (optional)").fill("11:00");
    await f.getByLabel("Arrival time zone").fill("Tokyo");
    await f.getByLabel("Estimated cost (USD)").fill("300");
  });
  await addItem(page, "Stay", async (f) => {
    await f.getByLabel("Name", { exact: true }).fill("E2E hotel");
    await f.getByLabel("Check-in date").fill("2027-06-01");
    await f.getByLabel("Check-in time", { exact: true }).fill("15:00");
    await f.getByLabel("Time zone").fill("Tokyo");
    await f.getByLabel("Estimated cost (USD)").fill("200");
  });
  for (const [title, time, cost] of [["E2E museum", "10:00", "50"], ["E2E park", "14:00", "25"]]) {
    await addItem(page, "Activity", async (f) => {
      await f.getByLabel("Name", { exact: true }).fill(title);
      await f.getByLabel("Start date").fill("2027-06-01");
      await f.getByLabel("Start time", { exact: true }).fill(time);
      await f.getByLabel("Time zone").fill("Tokyo");
      await f.getByLabel("Estimated cost (USD)").fill(cost);
    });
  }
  expect(await titles(day(page, 1))).toEqual(["E2E flight", "E2E museum", "E2E park", "E2E hotel"]);
  await expectBudget(page, { "Estimated cost": /^\$575(\.00)?$/ });

  // Edit.
  await card(page, "E2E flight").click();
  await page.getByRole("region", { name: "Item details" }).getByRole("button", { name: "Edit" }).click();
  await dialog(page).getByLabel("Name", { exact: true }).fill("E2E flight edited");
  await dialog(page).getByRole("button", { name: "Save changes" }).click();
  await expect(card(day(page, 1), "E2E flight edited")).toBeVisible();

  // Delete, after confirming.
  await card(page, "E2E hotel").click();
  await page.getByRole("region", { name: "Item details" }).getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(card(page, "E2E hotel")).toHaveCount(0);
  await expectBudget(page, { "Estimated cost": /^\$375(\.00)?$/ });

  // Reorder within a day, then move to another day.
  await expect(async () => {
    await drag(page, handle(page, "E2E park"), card(day(page, 1), "E2E flight edited"), "top");
    await expect.poll(() => titles(day(page, 1)), { timeout: 3000 }).toEqual(["E2E park", "E2E flight edited", "E2E museum"]);
  }).toPass();
  await expect(page.getByRole("status").filter({ hasText: "Moved “E2E park”" })).toBeVisible();
  // A pointer drag occasionally isn't picked up while the machine is busy, so try again if the item stays put.
  await expect(async () => {
    await drag(page, handle(page, "E2E museum"), day(page, 2));
    await expect(card(day(page, 2), "E2E museum")).toContainText("10:00 AM", { timeout: 3000 });
  }).toPass();
  await expect(page.getByRole("status").filter({ hasText: "Moved “E2E museum”" })).toBeVisible();

  const check = async () => {
    await expect.poll(() => titles(day(page, 1))).toEqual(["E2E park", "E2E flight edited"]);
    await expect.poll(() => titles(day(page, 2))).toEqual(["E2E museum"]);
    await expect(card(page, "E2E hotel")).toHaveCount(0);
    await expectBudget(page, { "Estimated cost": /^\$375(\.00)?$/ });
  };
  await check();
  await page.reload();
  await expect(day(page, 1)).toBeVisible();
  await check();
});

test.describe("database unavailable (NFR-6, UX-3)", () => {
  test("trip list and workspace show a friendly error that points to the demo", async ({ userPage: page }) => {
    const tripId = await seedTrip(name("down"));
    await page.goto("/trips");
    await page.route("**/rest/v1/**", (route) => route.fulfill({ status: 500, contentType: "application/json", body: "{}" }));

    // The data layer retries a failed request a few times (about 7 s) before giving up.
    test.setTimeout(60_000);
    await page.goto("/trips");
    await expect(alert(page)).toContainText("We couldn't load your trips", { timeout: 20_000 });
    await expect(page.getByRole("link", { name: "Try the demo" })).toHaveAttribute("href", "/demo");

    await page.goto(`/trips/${tripId}`);
    await expect(alert(page)).toContainText("We couldn't load this trip", { timeout: 20_000 });
    await expect(page.getByRole("link", { name: "Try the demo" })).toHaveAttribute("href", "/demo");
    await expect(page.getByText(/Error:|at \w+ \(/)).toHaveCount(0);
  });
});

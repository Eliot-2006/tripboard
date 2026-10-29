import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { card, dialog, fillAuth } from "./helpers";

try {
  process.loadEnvFile(".env.local");
} catch {}
const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key } = process.env;
const { TEST_USER_EMAIL: email, TEST_USER_PASSWORD: password, ANTHROPIC_API_KEY: anthropic } = process.env;

test("the demo has no Import booking action, since each import costs money", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Japan 2027" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to trip" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Import booking" })).toHaveCount(0);
});

// The signed-in flow runs against the real Supabase test account (like account.spec.ts) with /api/import mocked, so
// the model is never called. The dev server needs any ANTHROPIC_API_KEY value for the action to show.
test.describe("import a booking", () => {
  test.skip(
    !(url && key && email && password && anthropic),
    "needs NEXT_PUBLIC_SUPABASE_*, TEST_USER_EMAIL / TEST_USER_PASSWORD and ANTHROPIC_API_KEY (any value) in .env.local",
  );
  test.use({ viewport: { width: 1280, height: 1400 } });

  const flight = {
    type: "flight",
    title: "LAX to Tokyo",
    start_date: "2027-06-01",
    start_time: "11:30",
    start_timezone: "America/Los_Angeles",
    end_date: "2027-06-02",
    end_time: "15:45",
    end_timezone: "Asia/Tokyo",
    start_place: "LAX",
    end_place: "HND",
    address: null,
    cost: 900,
    currency: "USD",
    confirmation_number: "ZZ9PLURAL",
    airline: "ANA",
    flight_number: "NH105",
    notes: null,
  };
  const hotel = { ...flight, type: "stay", title: "Hotel Gracery", start_date: "2027-06-02", start_time: "15:00", end_date: "2027-06-04", end_time: "11:00", start_timezone: "Asia/Tokyo", confirmation_number: null, cost: null };

  test("reads a file, flags a duplicate, and adds the confirmed bookings", async ({ page }) => {
    const db = createClient(url!, key!, { auth: { persistSession: false } });
    const { error: signInError } = await db.auth.signInWithPassword({ email: email!, password: password! });
    if (signInError) throw signInError;
    const tripName = `E2E-import ${Math.random().toString(36).slice(2, 8)}`;
    const { data: trip, error } = await db
      .from("trips")
      .insert({ name: tripName, start_date: "2027-06-01", end_date: "2027-06-04", destinations: [], currency: "USD", total_budget: null })
      .select("id")
      .single();
    if (error) throw error;
    try {
      // The flight already exists, so its draft must come back flagged and unselected.
      await db.from("items").insert({
        trip_id: trip.id, type: "flight", title: "Existing flight", day: "2027-06-01", position: 0, status: "reserved",
        is_flexible: true, confirmation_number: "zz9-plural", metadata: {},
      });

      let uploads = 0;
      await page.route("**/api/import", async (route) => {
        uploads++;
        await route.fulfill({ json: { items: [flight, hotel] } });
      });

      await page.goto("/login");
      await fillAuth(page, email!, password!);
      await page.getByRole("button", { name: "Log in" }).click();
      await expect(page).toHaveURL(/\/trips$/);
      await page.goto(`/trips/${trip.id}`);

      await page.getByRole("button", { name: "Import booking" }).click();
      const d = dialog(page);
      await d.getByLabel("Booking file").setInputFiles({ name: "booking.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7") });
      expect(uploads).toBe(1);

      await expect(d.getByRole("heading", { name: "Review 2 bookings" })).toBeFocused();
      await expect(d.getByText("Looks like a duplicate of “Existing flight”")).toBeVisible();
      await expect(d.getByRole("checkbox", { name: "LAX to Tokyo" })).not.toBeChecked();
      await expect(d.getByRole("checkbox", { name: "Hotel Gracery" })).toBeChecked();

      await d.getByRole("button", { name: "Add 1 booking" }).click();
      await expect(d).toHaveCount(0);
      await expect(card(page, "Hotel Gracery")).toBeVisible();
      await expect(card(page, "LAX to Tokyo")).toHaveCount(0);
    } finally {
      await db.from("trips").delete().eq("id", trip.id);
    }
  });
});

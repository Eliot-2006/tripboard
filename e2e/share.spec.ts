import { expect, type Page, test } from "@playwright/test";
import { card } from "./helpers";

// The public share page, with Supabase's RPC answered by the test: no database, no account. It needs the Supabase
// variables only so the app treats accounts as configured; every request to them is mocked, so nothing is sent.
try {
  process.loadEnvFile(".env.local");
} catch {}
test.skip(
  !(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  "needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (any values; Supabase is mocked)",
);

const TOKEN = "3f0c1a52-8d6e-4b8e-9a54-7a1b2c3d4e5f";

const item = (over: Record<string, unknown>) => ({
  id: crypto.randomUUID(),
  type: "activity",
  is_flexible: false,
  start_at: null,
  end_at: null,
  start_timezone: null,
  end_timezone: null,
  start_location_name: null,
  start_address: null,
  start_lat: null,
  start_lng: null,
  end_location_name: null,
  end_address: null,
  end_lat: null,
  end_lng: null,
  status: "planned",
  metadata: {},
  ...over,
});

// What get_shared_trip() returns. The private fields are added on purpose: the page must not show them even if a
// bug in the database function sent them.
const shared = {
  trip: {
    name: "Shared Lisbon",
    start_date: "2027-05-01",
    end_date: "2027-05-02",
    destinations: ["Lisbon"],
    currency: "EUR",
    total_budget: 4321,
    user_id: "SECRET-USER",
  },
  items: [
    item({
      title: "Pastel de nata tour",
      day: "2027-05-01",
      position: 1000,
      start_location_name: "Pasteis de Belem",
      start_address: "R. de Belem 84",
      start_lat: 38.6975,
      start_lng: -9.2032,
      status: "reserved",
      notes: "SECRET-NOTES",
      confirmation_number: "SECRET-CONF",
      estimated_cost: 77,
      actual_cost: 88,
      payment_status: "paid",
    }),
    item({ title: "Fado dinner", day: "2027-05-02", position: 1000, start_location_name: "Alfama", start_lat: 38.711, start_lng: -9.13 }),
  ],
};

const rpc = (page: Page, body: unknown, status = 200) =>
  page.route("**/rest/v1/rpc/get_shared_trip", (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }),
  );

test("shows a shared trip read-only, without private fields, to a logged-out visitor", async ({ page }) => {
  const asked: string[] = [];
  await page.route("**/rest/v1/rpc/get_shared_trip", async (route) => {
    asked.push(route.request().postData() ?? "");
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(shared) });
  });
  await page.goto(`/share/${TOKEN}`);

  await expect(page.getByRole("heading", { name: "Shared Lisbon" })).toBeVisible();
  expect(asked.map((body) => JSON.parse(body))).toEqual([{ p_token: TOKEN }]);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByText("Read-only view")).toBeVisible();
  await expect(page.locator('section[aria-label="Map"]')).toBeAttached();

  // No way to change anything, and no budget.
  for (const name of [/^Edit/, /^Add/, "Share", /^Move /, /^Duplicate/, /^Delete/]) {
    await expect(page.getByRole("button", { name })).toHaveCount(0);
  }
  await expect(page.getByRole("region", { name: "Budget summary" })).toHaveCount(0);

  // The details show what a link may: place, status, and none of the private fields.
  await card(page, "Pastel de nata tour").click();
  const details = page.getByLabel("Item details").last();
  await expect(details).toContainText("Pasteis de Belem");
  await expect(details).toContainText("Reserved");
  await expect(details.getByRole("button", { name: /^(Edit|Duplicate|Delete|Move)/ })).toHaveCount(0);
  await expect(page.getByText("Move to day")).toHaveCount(0);

  const text = await page.locator("body").innerText();
  for (const secret of ["SECRET", "4321", "4,321", "77", "88", "Paid", "Payment", "Confirmation", "Notes", "Estimated cost"]) {
    expect(text).not.toContain(secret);
  }
});

test("a link that is unknown or turned off shows the not-found state", async ({ page }) => {
  await rpc(page, null);
  await page.goto(`/share/${TOKEN}`);
  await expect(page.getByRole("heading", { name: "We couldn't find this trip" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to Tripboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Shared Lisbon" })).toHaveCount(0);
});

test("a mistyped link is not found without asking the database", async ({ page }) => {
  let asked = 0;
  await page.route("**/rest/v1/rpc/get_shared_trip", (route) => {
    asked++;
    return route.fulfill({ contentType: "application/json", body: "null" });
  });
  await page.goto("/share/not-a-real-token");
  await expect(page.getByRole("heading", { name: "We couldn't find this trip" })).toBeVisible();
  expect(asked).toBe(0);
});

import { expect, type Page, test } from "@playwright/test";

/** Checks budget figures by their labels (BUD-3: they update right after a change). */
async function expectBudget(page: Page, figures: Record<string, string>) {
  const budget = page.getByRole("region", { name: "Budget summary" });
  for (const [label, amount] of Object.entries(figures)) {
    const term = budget.getByRole("term").filter({ hasText: new RegExp(`^${label}$`) });
    await expect(term.locator("xpath=following-sibling::dd[1]")).toHaveText(amount);
  }
}

const day = (page: Page, n: number) => page.getByRole("region", { name: new RegExp(`^Day ${n} · `) });
const dialog = (page: Page) => page.getByRole("dialog");

test.beforeEach(async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Japan 2027" })).toBeVisible();
});

test("adds an activity from an empty day and updates the budget (ITEM-1, ITEM-4, ITIN-9, BUD-3)", async ({ page }) => {
  await day(page, 7).getByRole("button", { name: "Add something" }).click();
  await expect(dialog(page)).toContainText("What are you adding on Fri, Apr 16?");
  await dialog(page).getByRole("button", { name: /^Activity/ }).click();
  await dialog(page).getByLabel("Name", { exact: true }).fill("Nishiki Market");
  await dialog(page).getByLabel("Kind").selectOption("restaurant");
  await dialog(page).getByLabel("Start time", { exact: true }).fill("11:00");
  await dialog(page).getByLabel("Estimated cost (USD)").fill("50");
  await dialog(page).getByRole("button", { name: "Add activity" }).click();

  await expect(dialog(page)).toHaveCount(0);
  const card = day(page, 7).getByRole("button", { name: /Nishiki Market/ });
  await expect(card).toContainText("11:00 AM");
  await expect(card).toHaveAttribute("aria-expanded", "true");
  await expectBudget(page, { "Estimated cost": "$2,990", "Budget remaining": "$10" });
  await expect(page.getByRole("status").filter({ hasText: "Added" })).toHaveText("Added “Nishiki Market”");
  // A restaurant is labelled as one (ITEM-4).
  await expect(day(page, 7).getByRole("region", { name: "Item details" })).toContainText("Restaurant");
});

test("adds an overnight cross-time-zone flight, with zones typed as cities (ITEM-2)", async ({ page }) => {
  await page.getByRole("button", { name: "Add to trip" }).click();
  await dialog(page).getByRole("button", { name: /^Flight/ }).click();
  const d = dialog(page);
  await expect(d.getByLabel("Name", { exact: true })).toBeFocused();
  await d.getByLabel("Name", { exact: true }).fill("SFO to Osaka");
  await d.getByLabel("Flight number (optional)").fill("UA33");
  await d.getByLabel("Departure date").fill("2027-04-10");
  await d.getByLabel("Departure time", { exact: true }).fill("13:00");
  await d.getByLabel("Departure time zone").fill("Los Angeles");
  await d.getByLabel("Arrival date (optional)").fill("2027-04-11");
  await d.getByLabel("Arrival time (optional)").fill("17:30");
  await d.getByLabel("Arrival time zone").fill("tokyo");
  await d.getByRole("button", { name: "Add flight" }).click();

  const card = day(page, 1).getByRole("button", { name: /SFO to Osaka/ });
  await expect(card).toContainText("1:00 PM → 5:30 PM +1");
  const details = day(page, 1).getByRole("region", { name: "Item details" });
  await expect(details).toContainText("Sat, Apr 10, 1:00 PM GMT-7");
  await expect(details).toContainText("Sun, Apr 11, 5:30 PM GMT+9");
  // Inserted by start time, after the 11:30 AM LAX flight (ITIN-10).
  await expect(day(page, 1).getByRole("listitem").first()).toContainText("LAX to Tokyo Haneda");
});

test("saves an item with no exact time as Anytime (ITEM-5)", async ({ page }) => {
  await day(page, 9).getByRole("button", { name: "Add something" }).click();
  await dialog(page).getByRole("button", { name: /^Activity/ }).click();
  await dialog(page).getByLabel("Name", { exact: true }).fill("Souvenir shopping");
  await dialog(page).getByLabel("No exact time").check();
  await expect(dialog(page).getByLabel("Start time", { exact: true })).toHaveCount(0);
  await dialog(page).getByRole("button", { name: "Add activity" }).click();
  await expect(day(page, 9).getByRole("button", { name: /Souvenir shopping/ })).toContainText("Anytime");
});

test("shows errors next to the fields and saves nothing (UX-4)", async ({ page }) => {
  await page.getByRole("button", { name: "Add to trip" }).click();
  await dialog(page).getByRole("button", { name: /^Stay/ }).click();
  const d = dialog(page);
  await d.getByLabel("Estimated cost (USD)").fill("-20");
  await d.getByRole("button", { name: "Add stay" }).click();

  await expect(d.getByLabel("Name", { exact: true })).toBeFocused();
  await expect(d.getByLabel("Name", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(d.getByLabel("Name", { exact: true })).toHaveAccessibleDescription("Enter a name");
  await d.getByLabel("Time zone").fill("Tokio");
  await d.getByRole("button", { name: "Add stay" }).click();
  await expect(d.getByLabel("Time zone")).toHaveAccessibleDescription(
    "We don't recognise “Tokio”. Type a city like Tokyo, or pick from the list.",
  );
  await expect(d.getByLabel("Check-in time", { exact: true })).toHaveAccessibleDescription(/Enter a check-in time/);
  await expect(d.getByLabel("Estimated cost (USD)")).toHaveAccessibleDescription("Cost cannot be negative");

  page.once("dialog", (confirm) => confirm.accept());
  await d.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expectBudget(page, { "Estimated cost": "$2,940" });
});

test("asks before discarding typed changes, and keeps them when the type changes", async ({ page }) => {
  await page.getByRole("button", { name: "Add to trip" }).click();
  await dialog(page).getByRole("button", { name: /^Activity/ }).click();
  await dialog(page).getByLabel("Name", { exact: true }).fill("Tea ceremony");

  await dialog(page).getByRole("button", { name: "Not a activity? Change type" }).click();
  await dialog(page).getByRole("button", { name: /^Stay/ }).click();
  await expect(dialog(page).getByLabel("Name", { exact: true })).toHaveValue("Tea ceremony");

  page.once("dialog", (confirm) => confirm.dismiss());
  await page.keyboard.press("Escape");
  await expect(dialog(page).getByLabel("Name", { exact: true })).toHaveValue("Tea ceremony");

  page.once("dialog", (confirm) => confirm.accept());
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
});

test("edits an item: marking it paid reserves it and updates the budget (ITEM-6, ITEM-7)", async ({ page }) => {
  await page.getByRole("button", { name: /Ramen at Ichiran/ }).click();
  await page.getByRole("region", { name: "Item details" }).getByRole("button", { name: "Edit" }).click();
  const d = dialog(page);
  await expect(d.getByLabel("Name", { exact: true })).toHaveValue("Ramen at Ichiran Shinjuku");
  await expect(d.getByLabel("Booking")).toHaveValue("planned");

  await d.getByLabel("Payment").selectOption("paid");
  await expect(d.getByLabel("Booking")).toHaveValue("reserved");
  await expect(d.getByRole("option", { name: "Planned" })).toBeDisabled();
  await d.getByRole("button", { name: "Save changes" }).click();

  const card = page.getByRole("button", { name: /Ramen at Ichiran/ });
  await expect(card).toContainText("Reserved");
  await expect(card).toContainText("Paid");
  await expectBudget(page, { Paid: "$925", "Remaining to pay": "$2,015" });
  // Focus goes back to where editing started.
  await expect(page.getByRole("region", { name: "Item details" }).getByRole("button", { name: "Edit" })).toBeFocused();
});

test("editing the date moves the item to that day", async ({ page }) => {
  await page.getByRole("button", { name: /Senso-ji Temple/ }).click();
  await page.getByRole("region", { name: "Item details" }).getByRole("button", { name: "Edit" }).click();
  await dialog(page).getByLabel("Start date").fill("2027-04-16");
  await dialog(page).getByRole("button", { name: "Save changes" }).click();
  await expect(day(page, 3).getByRole("button", { name: /Senso-ji Temple/ })).toHaveCount(0);
  await expect(day(page, 7).getByRole("button", { name: /Senso-ji Temple/ })).toContainText("9:00 AM");
});

test("deletes an item only after confirming (ITEM-6)", async ({ page }) => {
  const card = page.getByRole("button", { name: /Kaiseki dinner in Gion/ });
  await card.click();
  const details = page.getByRole("region", { name: "Item details" });

  await details.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Delete “Kaiseki dinner in Gion”?");
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
  await expect(card).toBeVisible();

  await details.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(card).toHaveCount(0);
  await expectBudget(page, { "Estimated cost": "$2,820", "Budget remaining": "$180" });
  await expect(page.getByRole("status").filter({ hasText: "Deleted" })).toHaveText("Deleted “Kaiseki dinner in Gion”");
  // Focus stays where the item was: its day.
  await expect(page.getByRole("heading", { name: /^Day 6 · / })).toBeFocused();
});

import { expect, test } from "@playwright/test";
import { day, dialog, card, expectBudget } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Japan 2027" })).toBeVisible();
});

test("adds an activity from an empty day and updates the budget (ITEM-1, ITEM-4, ITIN-9, BUD-3)", async ({ page }) => {
  await day(page, 7).getByRole("button", { name: "Add something" }).click();
  await expect(dialog(page)).toContainText("What are you adding on Fri, Apr 16?");
  await card(dialog(page), "Activity").click();
  await dialog(page).getByLabel("Name", { exact: true }).fill("Nishiki Market");
  await dialog(page).getByLabel("Kind").selectOption("restaurant");
  await dialog(page).getByLabel("Start time", { exact: true }).fill("11:00");
  await dialog(page).getByLabel("Estimated cost (USD)").fill("50");
  await dialog(page).getByRole("button", { name: "Add activity" }).click();

  const details = page.getByRole("region", { name: "Item details" });
  await expect(details).toContainText("Restaurant");
  await details.getByRole("button", { name: "Close" }).click();
  await expect(dialog(page)).toHaveCount(0);
  const item = card(day(page, 7), "Nishiki Market");
  await expect(item).toContainText("11:00 AM");
  await expectBudget(page, { "Estimated cost": "$2,990", "Budget remaining": "$10" });
  await expect(page.getByRole("status").filter({ hasText: "Added" })).toHaveText("Added “Nishiki Market”");
});

test("adds an overnight cross-time-zone flight, with zones typed as cities (ITEM-2)", async ({ page }) => {
  await page.getByRole("button", { name: "Add to trip" }).click();
  await card(dialog(page), "Flight").click();
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

  const details = page.getByRole("region", { name: "Item details" });
  await expect(details).toContainText("Sat, Apr 10, 1:00 PM Los Angeles time");
  await expect(details).toContainText("Sun, Apr 11, 5:30 PM Tokyo time");
  await details.getByRole("button", { name: "Close" }).click();
  const item = card(day(page, 1), "SFO to Osaka");
  await expect(item).toContainText("1:00 PM → 5:30 PM +1");
  // Inserted by start time, after the 11:30 AM LAX flight (ITIN-10).
  await expect(day(page, 1).getByRole("listitem").first()).toContainText("LAX to Tokyo Haneda");
});

test("saves an item with no exact time as Anytime (ITEM-5)", async ({ page }) => {
  await day(page, 9).getByRole("button", { name: "Add something" }).click();
  await card(dialog(page), "Activity").click();
  await dialog(page).getByLabel("Name", { exact: true }).fill("Souvenir shopping");
  await dialog(page).getByLabel("No exact time").check();
  await expect(dialog(page).getByLabel("Start time", { exact: true })).toHaveCount(0);
  await dialog(page).getByRole("button", { name: "Add activity" }).click();
  await page.getByRole("region", { name: "Item details" }).getByRole("button", { name: "Close" }).click();
  await expect(card(day(page, 9), "Souvenir shopping")).toContainText("Anytime");
});

test("shows errors next to the fields and saves nothing (UX-4)", async ({ page }) => {
  await page.getByRole("button", { name: "Add to trip" }).click();
  await card(dialog(page), "Stay").click();
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
  await card(dialog(page), "Activity").click();
  await dialog(page).getByLabel("Name", { exact: true }).fill("Tea ceremony");

  await dialog(page).getByRole("button", { name: "Not a activity? Change type" }).click();
  await card(dialog(page), "Stay").click();
  await expect(dialog(page).getByLabel("Name", { exact: true })).toHaveValue("Tea ceremony");

  page.once("dialog", (confirm) => confirm.dismiss());
  await page.keyboard.press("Escape");
  await expect(dialog(page).getByLabel("Name", { exact: true })).toHaveValue("Tea ceremony");

  page.once("dialog", (confirm) => confirm.accept());
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
});

test("edits an item: marking it paid reserves it and updates the budget (ITEM-6, ITEM-7)", async ({ page }) => {
  await card(page, "Ramen at Ichiran").click();
  await page.getByRole("region", { name: "Item details" }).getByRole("button", { name: "Edit" }).click();
  const d = dialog(page);
  await expect(d.getByLabel("Name", { exact: true })).toHaveValue("Ramen at Ichiran Shinjuku");
  await expect(d.getByLabel("Booking")).toHaveValue("planned");

  await d.getByLabel("Payment").selectOption("paid");
  await expect(d.getByLabel("Booking")).toHaveValue("reserved");
  await expect(d.getByRole("option", { name: "Planned" })).toBeDisabled();
  await d.getByRole("button", { name: "Save changes" }).click();

  const details = page.getByRole("region", { name: "Item details" });
  await expect(details).toContainText("Reserved");
  await expect(details).toContainText("Paid");
  await expect(details.getByRole("button", { name: "Edit" })).toBeFocused();
  await details.getByRole("button", { name: "Close" }).click();
  const item = card(page, "Ramen at Ichiran");
  await expect(item).toContainText("Reserved");
  await expect(item).toContainText("Paid");
  await expectBudget(page, { Paid: "$925", "Remaining to pay": "$2,015" });
  await expect(item).toBeFocused();
});

test("editing the date moves the item to that day", async ({ page }) => {
  await card(page, "Senso-ji Temple").click();
  await page.getByRole("region", { name: "Item details" }).getByRole("button", { name: "Edit" }).click();
  await dialog(page).getByLabel("Start date").fill("2027-04-16");
  await dialog(page).getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("region", { name: "Item details" }).getByRole("button", { name: "Close" }).click();
  await expect(card(day(page, 3), "Senso-ji Temple")).toHaveCount(0);
  await expect(card(day(page, 7), "Senso-ji Temple")).toContainText("9:00 AM");
});

test("deletes an item only after confirming (ITEM-6)", async ({ page }) => {
  const item = card(page, "Kaiseki dinner in Gion");
  await item.click();
  const details = page.getByRole("region", { name: "Item details" });

  await details.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Delete “Kaiseki dinner in Gion”?");
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
  await expect(details).toBeVisible();

  await details.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(item).toHaveCount(0);
  await expectBudget(page, { "Estimated cost": "$2,820", "Budget remaining": "$180" });
  await expect(page.getByRole("status").filter({ hasText: "Deleted" })).toHaveText("Deleted “Kaiseki dinner in Gion”");
  // Focus stays where the item was: its day's heading button.
  await expect(page.getByRole("button", { name: /^Day 6 · / })).toBeFocused();
});

test("duplicates an item right after the original, as an unpaid planned copy (ITEM-12)", async ({ page }) => {
  const budget = page.getByRole("region", { name: "Budget summary" });
  const figure = (label: string) =>
    budget.getByRole("term").filter({ hasText: new RegExp(`^${label}$`) }).locator("xpath=following-sibling::dd[1]");
  const paid = await figure("Paid").textContent();

  await card(day(page, 3), "teamLab Planets").click();
  await page.getByRole("region", { name: "Item details" }).getByRole("button", { name: "Duplicate" }).click();

  // The copy is selected and is not a second booking.
  const details = page.getByRole("region", { name: "Item details" });
  await expect(details).toContainText("Planned");
  await expect(details).toContainText("Unpaid");
  await expect(details).not.toContainText("TLP-99120");
  await expect(details).not.toContainText("Actual cost");
  await details.getByRole("button", { name: "Close" }).click();

  const handles = day(page, 3).getByRole("button", { name: /^Move / });
  await expect(handles).toHaveCount(4);
  await expect(handles.nth(1)).toHaveAttribute("aria-label", "Move teamLab Planets");
  await expect(handles.nth(2)).toHaveAttribute("aria-label", "Move teamLab Planets");
  await expect(handles.nth(3)).toHaveAttribute("aria-label", "Move Explore Akihabara");

  // The copy keeps the original's time.
  const copy = card(day(page, 3), "teamLab Planets").nth(1);
  const original = card(day(page, 3), "teamLab Planets").first();
  await expect(copy).toContainText(((await original.textContent()) ?? "").match(/\d+:\d+ [AP]M/)![0]);
  await expect(page.getByRole("status").filter({ hasText: "Duplicated" })).toHaveText(/^Duplicated “teamLab Planets”/);

  // No phantom payment: Paid is unchanged while the estimate grows by the copy's cost.
  await expect(figure("Paid")).toHaveText(paid!);
  await expect(figure("Estimated cost")).toHaveText("$2,972");
});

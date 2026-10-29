import { expect, test } from "@playwright/test";
import { card, day } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Japan 2027" })).toBeVisible();
});

test("demo loads without login and shows the banner and budget (DEMO-1, DEMO-3, BUD-1)", async ({ page }) => {
  await expect(page.getByText(/sample data/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up to plan your own" })).toBeVisible();
  const budget = page.getByRole("region", { name: "Budget summary" });
  const figures = {
    "Total budget": "$3,000",
    "Estimated cost": "$2,940",
    Paid: "$907",
    "Remaining to pay": "$2,033",
    "Budget remaining": "$60",
  };
  for (const [label, amount] of Object.entries(figures)) {
    const term = budget.getByRole("term").filter({ hasText: new RegExp(`^${label}$`) });
    await expect(term.locator("xpath=following-sibling::dd[1]")).toHaveText(amount);
  }
});

test("shows every trip day, the empty state and the Anytime label (ITIN-1, ITIN-9, ITEM-5)", async ({ page }) => {
  await expect(page.getByRole("heading", { name: /^Day \d+ · / })).toHaveCount(9);
  await expect(page.getByText("Nothing planned yet.")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Add something" })).toHaveCount(2);
  await expect(card(page, "Explore Akihabara")).toContainText("Anytime");
});

test("shows free-time hints between timed items, and hides them with the day (PRD V3)", async ({ page }) => {
  // Senso-ji ends 11:00 and teamLab starts 14:00 (Tokyo); Fushimi Inari ends 10:00 and the Gion dinner starts 18:30.
  await expect(day(page, 3).getByText("Free time: 3 h")).toBeVisible();
  await expect(day(page, 6).getByText("Free time: 8 h 30 min")).toBeVisible();
  await expect(day(page, 2).getByText(/Free time|Overlap|Tight/)).toHaveCount(0);
  await page.getByRole("button", { name: /^Day 3 · / }).click();
  await expect(page.getByText("Free time: 3 h")).toHaveCount(0);
});

test("selecting an item opens its details and Close clears them (ITIN-3)", async ({ page }) => {
  await expect(page.getByRole("region", { name: "Item details" })).toHaveCount(0);
  await card(page, "LAX to Tokyo Haneda").click();
  const details = page.getByRole("region", { name: "Item details" });
  await expect(details).toContainText("LAX to Tokyo Haneda");
  await expect(details).toContainText("NH7K2Q");
  await details.getByRole("button", { name: "Close" }).click();
  await expect(details).toHaveCount(0);
});

test("details expand under the item and a second click collapses them", async ({ page }) => {
  test.skip(await page.getByRole("button", { name: "map", exact: true }).isVisible(), "Inline details are only shown in the desktop layout");
  const item = card(page, "Kaiseki dinner in Gion");
  await item.click();
  const row = page.getByRole("listitem").filter({ has: item });
  const details = row.getByRole("region", { name: "Item details" });
  await expect(details).toBeInViewport();
  await expect(details).toContainText("GION-0415");
  await expect(item).toHaveAttribute("aria-expanded", "true");
  await expect(item).toHaveAttribute("aria-controls", (await details.getAttribute("id"))!);
  await item.click();
  await expect(page.getByRole("region", { name: "Item details" })).toHaveCount(0);
  await expect(item).toHaveAttribute("aria-expanded", "false");
});

test("closing the details returns keyboard focus to the item (NFR-4)", async ({ page }) => {
  const item = card(page, "Senso-ji Temple");
  await item.focus();
  await page.keyboard.press("Enter");
  const close = page.getByRole("region", { name: "Item details" }).getByRole("button", { name: "Close" });
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(item).toBeFocused();
});

test("a selection hidden by the date range does not reopen when the range widens", async ({ page }) => {
  await card(page, "Senso-ji Temple").click();
  await page.getByLabel("From day").selectOption("2027-04-14");
  await page.getByRole("button", { name: "Whole trip" }).click();
  await expect(card(page, "Senso-ji Temple")).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("region", { name: "Item details" })).toHaveCount(0);
});

test("the date range filters the itinerary and Whole trip restores it (ITIN-4)", async ({ page }) => {
  await page.getByLabel("From day").selectOption("2027-04-14");
  await expect(card(page, "Senso-ji Temple")).toHaveCount(0);
  await expect(card(page, "Shinkansen to Kyoto")).toBeVisible();
  await page.getByRole("button", { name: "Whole trip" }).click();
  await expect(card(page, "Senso-ji Temple")).toBeVisible();
});

test("an inverted range is swapped, not emptied", async ({ page }) => {
  await page.getByLabel("To day").selectOption("2027-04-12");
  await page.getByLabel("From day").selectOption("2027-04-14");
  await expect(page.getByLabel("From day")).toHaveValue("2027-04-12");
  await expect(page.getByLabel("To day")).toHaveValue("2027-04-14");
  await expect(card(page, "Shinkansen to Kyoto")).toBeVisible();
});

test("the budget counts the whole trip when the range narrows (PRD 4.6)", async ({ page }) => {
  await page.getByLabel("From day").selectOption("2027-04-14");
  await expect(page.getByRole("region", { name: "Budget summary" })).toContainText("$2,940");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("Itinerary and Map are switchable (UX-2)", async ({ page }) => {
    const itinerary = page.getByRole("region", { name: "Itinerary" });
    const map = page.getByRole("region", { name: "Map" });
    await expect(itinerary).toBeVisible();
    await expect(map).toBeHidden();
    await page.getByRole("button", { name: "map", exact: true }).click();
    await expect(map).toBeVisible();
    await expect(itinerary).toBeHidden();
  });
});

test("editing the trip warns before new dates leave items out (TRIP-3)", async ({ page }) => {
  await page.getByRole("button", { name: "Edit trip" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Japan in spring");
  await dialog.getByLabel("End date").fill("2027-04-16");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog.getByRole("alert")).toContainText("1 item falls outside these dates");
  await dialog.getByRole("button", { name: "Save anyway" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Japan in spring" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Day \d+ · / })).toHaveCount(7);
  // The left-out item still counts in the budget (PRD 4.6).
  await expect(page.getByRole("region", { name: "Budget summary" })).toContainText("$2,940");
  // The demo trip can't be deleted.
  await page.getByRole("button", { name: "Edit trip" }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Delete trip" })).toHaveCount(0);
});

test("shows a text warning, a negative remainder and the type breakdown when over budget (BUD-5, BUD-6)", async ({ page }) => {
  const budget = page.getByRole("region", { name: "Budget summary" });
  await expect(budget.getByText(/over budget/i)).toHaveCount(0);
  await expect(budget).toContainText("Flights");
  await expect(budget).toContainText("Stays");
  await expect(budget).toContainText("Activities");

  await card(page, "Ramen at Ichiran").click();
  await page.getByRole("region", { name: "Item details" }).getByRole("button", { name: "Edit" }).click();
  await page.getByRole("dialog").getByLabel("Estimated cost (USD)").fill("300");
  await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("region", { name: "Item details" }).getByRole("button", { name: "Close" }).click();

  await expect(budget.getByText(/^Over budget by \$\d/)).toBeVisible();
  const remaining = budget.getByRole("term").filter({ hasText: /^Budget remaining$/ });
  await expect(remaining.locator("xpath=following-sibling::dd[1]")).toHaveText(/^-\$\d/);
});

test("follows a dark system color scheme (UX-5)", async ({ page }) => {
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await bg()).toBe("rgb(255, 255, 255)");
  await page.emulateMedia({ colorScheme: "dark" });
  expect(await bg()).toBe("rgb(13, 17, 23)");
});

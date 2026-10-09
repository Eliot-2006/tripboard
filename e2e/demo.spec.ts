import { expect, test } from "@playwright/test";

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
  await expect(page.getByText("Nothing planned yet. Add something.")).toHaveCount(2);
  await expect(page.getByRole("button", { name: /Explore Akihabara/ })).toContainText("Anytime");
});

test("selecting an item opens its details and Close clears them (ITIN-3)", async ({ page }) => {
  await expect(page.getByRole("region", { name: "Item details" })).toHaveCount(0);
  await page.getByRole("button", { name: /LAX to Tokyo Haneda/ }).click();
  const details = page.getByRole("region", { name: "Item details" });
  await expect(details).toContainText("LAX to Tokyo Haneda");
  await expect(details).toContainText("NH7K2Q");
  await details.getByRole("button", { name: "Close" }).click();
  await expect(details).toHaveCount(0);
});

test("details expand under the item and a second click collapses them", async ({ page }) => {
  const card = page.getByRole("button", { name: /Kaiseki dinner in Gion/ });
  await card.click();
  const row = page.getByRole("listitem").filter({ has: card });
  const details = row.getByRole("region", { name: "Item details" });
  await expect(details).toBeInViewport();
  await expect(details).toContainText("GION-0415");
  await expect(card).toHaveAttribute("aria-expanded", "true");
  await expect(card).toHaveAttribute("aria-controls", (await details.getAttribute("id"))!);
  await card.click();
  await expect(page.getByRole("region", { name: "Item details" })).toHaveCount(0);
  await expect(card).toHaveAttribute("aria-expanded", "false");
});

test("closing the details returns keyboard focus to the item (NFR-4)", async ({ page }) => {
  const card = page.getByRole("button", { name: /Senso-ji Temple/ });
  await card.focus();
  await page.keyboard.press("Enter");
  const close = page.getByRole("region", { name: "Item details" }).getByRole("button", { name: "Close" });
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(card).toBeFocused();
});

test("a selection hidden by the date range does not reopen when the range widens", async ({ page }) => {
  await page.getByRole("button", { name: /Senso-ji Temple/ }).click();
  await page.getByLabel("From day").selectOption("2027-04-14");
  await page.getByRole("button", { name: "Whole trip" }).click();
  await expect(page.getByRole("button", { name: /Senso-ji Temple/ })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("region", { name: "Item details" })).toHaveCount(0);
});

test("the date range filters the itinerary and Whole trip restores it (ITIN-4)", async ({ page }) => {
  await page.getByLabel("From day").selectOption("2027-04-14");
  await expect(page.getByRole("button", { name: /Senso-ji Temple/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Shinkansen to Kyoto/ })).toBeVisible();
  await page.getByRole("button", { name: "Whole trip" }).click();
  await expect(page.getByRole("button", { name: /Senso-ji Temple/ })).toBeVisible();
});

test("an inverted range is swapped, not emptied", async ({ page }) => {
  await page.getByLabel("To day").selectOption("2027-04-12");
  await page.getByLabel("From day").selectOption("2027-04-14");
  await expect(page.getByLabel("From day")).toHaveValue("2027-04-12");
  await expect(page.getByLabel("To day")).toHaveValue("2027-04-14");
  await expect(page.getByRole("button", { name: /Shinkansen to Kyoto/ })).toBeVisible();
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

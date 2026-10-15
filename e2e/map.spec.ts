import { expect, type Page, test } from "@playwright/test";

const pins = (page: Page) => page.locator(".leaflet-marker-icon");

test.beforeEach(async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Japan 2027" })).toBeVisible();
  await expect(pins(page).first()).toBeVisible();
});

test("shows a numbered pin per mappable item, a legend and attribution (MAP-1, MAP-2, MAP-7)", async ({ page }) => {
  await expect(pins(page)).toHaveCount(12);
  await expect(page.getByRole("button", { name: "1. LAX to Tokyo Haneda" })).toContainText("1");
  await expect(page.getByRole("list", { name: /Map legend/ }).getByRole("listitem")).toHaveCount(7);
  await expect(page.locator(".leaflet-control-attribution")).toContainText("OpenStreetMap");
  // Lines between stops and arcs for flights (MAP-3).
  await expect(page.locator(".leaflet-overlay-pane path")).not.toHaveCount(0);
});

test("pins follow the date range and are renumbered (MAP-1, MAP-5)", async ({ page }) => {
  await page.getByLabel("From day").selectOption("2027-04-14");
  await expect(pins(page)).toHaveCount(5);
  await expect(page.getByRole("button", { name: "1. Shinkansen to Kyoto" })).toBeVisible();
  await page.getByLabel("From day").selectOption("2027-04-16");
  await page.getByLabel("To day").selectOption("2027-04-16");
  await expect(pins(page)).toHaveCount(0);
  await expect(page.getByText("No stops with a map location in this range.")).toBeVisible();
});

test("a pin selects its item, and selecting an item highlights its pin (MAP-4)", async ({ page }) => {
  const sensoji = page.getByRole("button", { name: "4. Senso-ji Temple" });
  await sensoji.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^(?!Move |\d+\. ).*Senso-ji Temple/ })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "Item details" })).toContainText("Senso-ji Temple");
  await expect(sensoji.locator(".tripboard-pin")).toHaveClass(/is-selected/);

  await page.getByRole("button", { name: /^(?!Move |\d+\. ).*teamLab Planets/ }).click();
  await expect(page.getByRole("button", { name: "5. teamLab Planets" }).locator(".tripboard-pin")).toHaveClass(/is-selected/);
  await expect(sensoji.locator(".tripboard-pin")).not.toHaveClass(/is-selected/);
});

test("items without coordinates stay off the map", async ({ page }) => {
  await page.getByRole("button", { name: "Add to trip" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^(?!Move |\d+\. ).*Activity/ }).click();
  await page.getByRole("dialog").getByLabel("Name", { exact: true }).fill("Laundry");
  await page.getByRole("dialog").getByLabel("No exact time").check();
  await page.getByRole("dialog").getByRole("button", { name: "Add activity" }).click();
  await expect(page.getByRole("region", { name: "Item details" })).toContainText("No map location");
  await expect(pins(page)).toHaveCount(12);
});

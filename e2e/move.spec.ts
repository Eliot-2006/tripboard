import { expect, type Locator, type Page, test } from "@playwright/test";

const day = (page: Page, n: number) => page.getByRole("region", { name: new RegExp(`^Day ${n} · `) });
const handle = (page: Page, title: string) => page.getByRole("button", { name: `Move ${title}` });
// Item titles in order, read from the drag handles ("Move <title>").
const titles = async (region: Locator) =>
  (await region.getByRole("button", { name: /^Move / }).evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).map(
    (label) => label!.replace(/^Move /, ""),
  );

/** A real pointer drag with intermediate moves, as dnd-kit needs to see movement before it starts. */
async function drag(page: Page, from: Locator, to: Locator, where: "top" | "center" = "center") {
  // Center the pair on screen: a pointer near the viewport edge makes dnd-kit auto-scroll mid-drag, so the drop
  // would land below the target measured here.
  const mid = ((await from.boundingBox())!.y + (await to.boundingBox())!.y) / 2;
  await page.evaluate((y) => window.scrollBy(0, y - window.innerHeight / 2), mid);
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + 10, { steps: 5 });
  const y = where === "top" ? b.y + 8 : b.y + b.height / 2;
  await page.mouse.move(b.x + b.width / 2, y, { steps: 20 });
  // WebKit needs a frame to dispatch the final pointer move before mouseup.
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await page.mouse.up();
}

test.beforeEach(async ({ page, isMobile }, testInfo) => {
  // Keep desktop drag targets together without replacing phone or tablet project viewports.
  if (!isMobile && testInfo.project.name !== "tablet") await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Japan 2027" })).toBeVisible();
});

test("drags an item to another day, keeping its clock time (ITIN-6)", async ({ page, isMobile }) => {
  test.skip(isMobile, "Pointer mouse drags do not model the 200ms touch sensor; keyboard and Move to day cover phones");
  await drag(page, handle(page, "Senso-ji Temple"), day(page, 4).getByRole("button", { name: /^(?!Move |\d+\. ).*Breakfast at Tsukiji/ }), "top");
  await expect(day(page, 3).getByRole("button", { name: /^(?!Move |\d+\. ).*Senso-ji Temple/ })).toHaveCount(0);
  const moved = day(page, 4).getByRole("button", { name: /^(?!Move |\d+\. ).*Senso-ji Temple/ });
  await expect(moved).toContainText("9:00 AM");
  expect(await titles(day(page, 4))).toEqual(["Senso-ji Temple", "Breakfast at Tsukiji Outer Market"]);
  await expect(page.getByRole("status").filter({ hasText: "Moved" })).toHaveText("Moved “Senso-ji Temple” to Tue, Apr 13");

  // The move was saved, not just shown: it survives a refetch of the list.
  await page.getByRole("button", { name: "Add to trip" }).click();
  await page.keyboard.press("Escape");
  await expect(day(page, 4).getByRole("button", { name: /^(?!Move |\d+\. ).*Senso-ji Temple/ })).toBeVisible();
});

test("reorders within a day (ITIN-5)", async ({ page, isMobile }) => {
  test.skip(isMobile, "Pointer mouse drags do not model the 200ms touch sensor; keyboard and Move to day cover phones");
  expect(await titles(day(page, 3))).toEqual(["Senso-ji Temple", "teamLab Planets", "Explore Akihabara"]);
  await drag(page, handle(page, "Explore Akihabara"), day(page, 3).getByRole("button", { name: /^(?!Move |\d+\. ).*Senso-ji Temple/ }), "top");
  await expect.poll(() => titles(day(page, 3))).toEqual(["Explore Akihabara", "Senso-ji Temple", "teamLab Planets"]);
});

test("drops onto an empty day", async ({ page, isMobile }) => {
  test.skip(isMobile, "Pointer mouse drags do not model the 200ms touch sensor; keyboard and Move to day cover phones");
  await drag(page, handle(page, "Kaiseki dinner in Gion"), day(page, 7));
  await expect(day(page, 7).getByRole("button", { name: /^(?!Move |\d+\. ).*Kaiseki dinner in Gion/ })).toContainText("6:30 PM");
  await expect(day(page, 6).getByRole("button", { name: /^(?!Move |\d+\. ).*Kaiseki/ })).toHaveCount(0);
});

test("moves with the keyboard alone", async ({ page }) => {
  const announced = page.locator('[id^="DndLiveRegion"]');
  await handle(page, "teamLab Planets").focus();
  await page.keyboard.press("Space");
  await expect(announced).toContainText("teamLab Planets is in its current place");
  // Arrow keys only move a drag once it has measured its targets, a frame or two after pick-up.
  await expect(async () => {
    await page.keyboard.press("ArrowUp");
    await expect(announced).toContainText("will go before Senso-ji Temple on day 3", { timeout: 500 });
  }).toPass();
  await page.keyboard.press("Space");
  await expect(announced).toContainText("Dropped teamLab Planets on day 3");
  await expect.poll(() => titles(day(page, 3))).toEqual(["teamLab Planets", "Senso-ji Temple", "Explore Akihabara"]);
});

test("puts an item last on another day with the keyboard, and keeps focus on it", async ({ page }) => {
  const announced = page.locator('[id^="DndLiveRegion"]');
  await handle(page, "Explore Akihabara").focus();
  await page.keyboard.press("Space");
  await expect(announced).toContainText("Explore Akihabara is in its current place");
  // Arrow down until the drag reaches the end of day 6 (each press moves one target).
  await expect(async () => {
    await page.keyboard.press("ArrowDown");
    await expect(announced).toContainText("is at the end of day 6", { timeout: 300 });
  }).toPass({ timeout: 15_000 });
  await page.keyboard.press("Space");
  await expect.poll(() => titles(day(page, 6))).toEqual(["Fushimi Inari Shrine", "Kaiseki dinner in Gion", "Explore Akihabara"]);
  await expect(handle(page, "Explore Akihabara")).toBeFocused();
});

test("moves with the Move to day menu, placing it by time (ITIN-7)", async ({ page }) => {
  await page.getByRole("button", { name: /^(?!Move |\d+\. ).*Ramen at Ichiran/ }).click();
  const details = page.getByRole("region", { name: "Item details" });
  await expect(details.getByRole("button", { name: "Move", exact: true })).toBeDisabled();
  await details.getByLabel("Move to day").selectOption("2027-04-15");
  await details.getByRole("button", { name: "Move", exact: true }).click();
  await expect(page.getByRole("region", { name: "Item details" })).toContainText("Thu, Apr 15, 7:00 PM");
  await page.getByRole("region", { name: "Item details" }).getByRole("button", { name: "Close" }).click();
  // 7:00 PM goes after Fushimi Inari (7:30 AM) and Kaiseki (6:30 PM).
  await expect.poll(() => titles(day(page, 6))).toEqual(["Fushimi Inari Shrine", "Kaiseki dinner in Gion", "Ramen at Ichiran Shinjuku"]);
  // Focus follows the item to its new day.
  await expect(page.getByRole("button", { name: /^(?!Move |\d+\. ).*Ramen at Ichiran/ })).toBeFocused();
});

test("collapses and expands a day from its heading (ITIN-11)", async ({ page }) => {
  const toggle = page.getByRole("button", { name: /Day 3 · / });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toContainText("3 items");
  await expect(handle(page, "Senso-ji Temple")).toHaveCount(0);
  const mapToggle = page.getByRole("button", { name: "map", exact: true });
  if (await mapToggle.isVisible()) await mapToggle.click();
  await expect(page.getByRole("button", { name: "4. Senso-ji Temple" })).toBeVisible();
  if (await mapToggle.isVisible()) await page.getByRole("button", { name: "itinerary", exact: true }).click();

  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(await titles(day(page, 3))).toEqual(["Senso-ji Temple", "teamLab Planets", "Explore Akihabara"]);
});

test("a map pin opens its collapsed day (ITIN-11)", async ({ page }) => {
  test.skip(await page.getByRole("button", { name: "map", exact: true }).isVisible(), "This cross-panel check requires the side-by-side desktop layout");
  const toggle = page.getByRole("button", { name: /Day 3 · / });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "4. Senso-ji Temple" }).focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(day(page, 3).getByRole("button", { name: /^(?!Move |\d+\. ).*Senso-ji Temple/ })).toHaveAttribute("aria-expanded", "true");

  await toggle.click();
  await page.getByRole("button", { name: "4. Senso-ji Temple" }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
});

test("drops onto a collapsed day, at its end", async ({ page, isMobile }) => {
  test.skip(isMobile, "Pointer mouse drags do not model the 200ms touch sensor; keyboard and Move to day cover phones");
  await page.getByRole("button", { name: /Day 6 · / }).click();
  await drag(page, handle(page, "Explore Akihabara"), page.getByRole("button", { name: /Day 6 · / }));
  await expect(page.getByRole("status").filter({ hasText: "Moved" })).toContainText("Explore Akihabara");
  // A click while the drop animation settles can be swallowed, so retry until the day opens.
  const heading = page.getByRole("button", { name: /Day 6 · / });
  await expect(async () => {
    if ((await heading.getAttribute("aria-expanded")) === "false") await heading.click();
    await expect(heading).toHaveAttribute("aria-expanded", "true", { timeout: 500 });
  }).toPass();
  await expect.poll(() => titles(day(page, 6))).toEqual(["Fushimi Inari Shrine", "Kaiseki dinner in Gion", "Explore Akihabara"]);
});

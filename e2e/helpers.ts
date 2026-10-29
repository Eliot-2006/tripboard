import { expect, type Locator, type Page } from "@playwright/test";

export const day = (page: Page, n: number) => page.getByRole("region", { name: new RegExp(`^Day ${n} · `) });
export const dialog = (page: Page) => page.getByRole("dialog");
/** A button whose name contains `title`, but not its drag handle ("Move …") or map pin ("4. …"). */
export const card = (scope: Page | Locator, title: string) =>
  scope.getByRole("button", { name: new RegExp(`^(?!Move |\\d+\\. ).*${title}`) });
export const handle = (page: Page, title: string) => page.getByRole("button", { name: `Move ${title}` });

// Item titles in order, read from the drag handles ("Move <title>").
export const titles = async (region: Locator) =>
  (await region.getByRole("button", { name: /^Move / }).evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).map(
    (label) => label!.replace(/^Move /, ""),
  );

/** A real pointer drag with intermediate moves, as dnd-kit needs to see movement before it starts. */
export async function drag(page: Page, from: Locator, to: Locator, where: "top" | "center" = "center") {
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

/** Checks budget figures by their labels (they update right after a change). */
export async function expectBudget(page: Page, figures: Record<string, string | RegExp>) {
  const budget = page.getByRole("region", { name: "Budget summary" });
  for (const [label, amount] of Object.entries(figures)) {
    const term = budget.getByRole("term").filter({ hasText: new RegExp(`^${label}$`) });
    await expect(term.locator("xpath=following-sibling::dd[1]")).toHaveText(amount);
  }
}

/** Fill the auth form, retrying until the values stick: typing before hydration (slow on WebKit) gets wiped. */
export async function fillAuth(page: Page, address: string, secret?: string) {
  await expect(async () => {
    await page.getByLabel("Email").fill(address);
    if (secret) await page.getByLabel("Password").fill(secret);
    await expect(page.getByLabel("Email")).toHaveValue(address, { timeout: 500 });
  }).toPass();
}

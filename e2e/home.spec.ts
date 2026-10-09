import { expect, test } from "@playwright/test";

test("landing page leads with the demo and offers sign-in links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Tripboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  await page.getByRole("link", { name: "Try the demo" }).click();
  await expect(page).toHaveURL(/\/demo$/);
});

test("placeholder routes load and point to the demo", async ({ page }) => {
  for (const path of ["/login", "/signup", "/trips", "/trips/abc"]) {
    const res = await page.goto(path);
    expect(res?.ok(), path).toBe(true);
    await expect(page.getByRole("link", { name: "Try the demo" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
  }
});

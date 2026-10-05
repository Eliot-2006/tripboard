import { expect, test } from "@playwright/test";

test("landing page shows the pitch and sign-in links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Tripboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
});

test("placeholder routes load and link home", async ({ page }) => {
  for (const path of ["/login", "/signup", "/trips", "/trips/abc"]) {
    const res = await page.goto(path);
    expect(res?.ok(), path).toBe(true);
    await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
  }
});

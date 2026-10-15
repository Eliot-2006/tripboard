import { expect, test } from "@playwright/test";

test("landing page leads with the demo and offers sign-in links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Tripboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  await page.getByRole("link", { name: "Try the demo" }).click();
  await expect(page).toHaveURL(/\/demo$/);
});

test("account pages send logged-out visitors to log in (AUTH-3)", async ({ page }) => {
  for (const path of ["/trips", "/trips/abc"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  }
});

test("log in and sign up check the fields before sending anything (UX-4)", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Enter your email address, like you@example.com")).toBeVisible();
  await expect(page.getByText("Enter your password")).toBeVisible();

  await page.getByRole("link", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { name: "Sign up" })).toBeVisible();
  await page.getByLabel("Email").fill("traveler@example.com");
  await page.getByLabel("Password").fill("123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 6 characters")).toBeVisible();
  await expect(page.getByLabel("Password")).toHaveAttribute("aria-invalid", "true");
});

test("the demo never calls the database (DEMO-1)", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", (r) => r.url().includes("supabase.co") && calls.push(r.url()));
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Japan 2027" })).toBeVisible();
  expect(calls).toEqual([]);
});

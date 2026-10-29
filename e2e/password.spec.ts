import { expect, test } from "@playwright/test";
import { fillAuth } from "./helpers";

for (const missing of [false, true]) {
  test(`reset requests give a neutral confirmation (missing account: ${missing})`, async ({ page }) => {
    let calls = 0;
    await page.route("**/auth/v1/recover*", async (route) => {
      calls++;
      expect(route.request().postDataJSON().email).toBe("traveler@example.com");
      await route.fulfill({
        status: missing ? 422 : 200,
        contentType: "application/json", headers: { "x-supabase-api-version": "2024-01-01", "access-control-expose-headers": "x-supabase-api-version" },
        body: missing ? JSON.stringify({ code: "user_not_found", message: "User not found" }) : "{}",
      });
    });
    await page.goto("/forgot-password");
    await fillAuth(page, "traveler@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toHaveText("If there's an account for traveler@example.com, we've sent a link to reset your password.");
    expect(calls).toBe(1);
  });
}

test("reset page requires a signed-in session", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole("heading", { name: "Forgot password?" })).toBeVisible();
});

test("bad email link lands on login with a friendly message", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=bad-token&type=email&next=/trips");
  await expect(page).toHaveURL(/\/login\?error=link$/);
  await expect(page.getByRole("alert").filter({ hasText: "That link has expired or was already used." })).toBeVisible();
});

test("login links to password recovery", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
});

test("recover rate limits show an actionable error", async ({ page }) => {
  await page.route("**/auth/v1/recover*", (route) => route.fulfill({
    status: 429, contentType: "application/json", headers: { "x-supabase-api-version": "2024-01-01", "access-control-expose-headers": "x-supabase-api-version" },
    body: JSON.stringify({ code: "over_email_send_rate_limit", message: "Too many requests" }),
  }));
  await page.goto("/forgot-password");
  await fillAuth(page, "traveler@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Too many attempts" })).toBeVisible();
});

test("unconfirmed email explains the next step", async ({ page }) => {
  await page.route("**/auth/v1/token*", (route) => route.fulfill({
    status: 400, contentType: "application/json", headers: { "x-supabase-api-version": "2024-01-01", "access-control-expose-headers": "x-supabase-api-version" },
    body: JSON.stringify({ code: "email_not_confirmed", message: "Email not confirmed" }),
  }));
  await page.goto("/login");
  await fillAuth(page, "traveler@example.com", "password123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Confirm your email first: check your inbox for the link we sent." })).toBeVisible();
});

test("recover network failures show an actionable error", async ({ page }) => {
  await page.route("**/auth/v1/recover*", (route) => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await page.goto("/forgot-password");
  await fillAuth(page, "traveler@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "We can't reach sign-in right now." })).toBeVisible();
});

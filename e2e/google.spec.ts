import { expect, test } from "@playwright/test";

// No real Google login: the navigation to Supabase's authorize endpoint is answered locally.
for (const [path, name] of [["/login", "Log in"], ["/signup", "Sign up"]]) {
  test(`${name} offers Continue with Google, which starts Supabase OAuth (AUTH-4)`, async ({ page }) => {
    let authorize: URL | undefined;
    await page.route("**/auth/v1/authorize*", (route) => {
      authorize = new URL(route.request().url());
      return route.fulfill({ contentType: "text/html", body: "<title>Google</title>" });
    });
    await page.goto(path);
    const button = page.getByRole("button", { name: "Continue with Google" });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled(); // after hydration
    await button.click();
    await expect.poll(() => authorize?.pathname).toBe("/auth/v1/authorize");

    expect(authorize!.origin).toBe(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin);
    expect(authorize!.searchParams.get("provider")).toBe("google");
    const redirectTo = new URL(authorize!.searchParams.get("redirect_to")!);
    expect(redirectTo.origin).toBe("http://localhost:3000");
    expect(redirectTo.pathname).toBe("/auth/callback");
    expect(redirectTo.searchParams.get("next")).toBe("/trips");
    expect(authorize!.searchParams.get("code_challenge")).toBeTruthy(); // PKCE
  });
}

test("a Google sign-in that fails lands on log in with a friendly message", async ({ page }) => {
  await page.goto("/auth/callback?error=access_denied&error_description=User+denied+access");
  await expect(page).toHaveURL(/\/login\?error=google$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Google" })).toContainText("We couldn't sign you in with Google");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

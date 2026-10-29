import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const { verifyOtp } = vi.hoisted(() => ({ verifyOtp: vi.fn() }));
vi.mock("@/lib/supabase/env", () => ({ supabaseEnv: { url: "https://example.test", key: "test" } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { verifyOtp } }) }));
beforeEach(() => verifyOtp.mockReset().mockResolvedValue({ error: null }));

const request = (params: Record<string, string>) =>
  GET(new NextRequest(`https://tripboard.test/auth/confirm?${new URLSearchParams(params)}`));

it.each(["email", "recovery", "signup", "invite", "magiclink", "email_change"])("verifies %s token hashes", async (type) => {
  const response = await request({ token_hash: "hash", type, next: "/reset-password" });
  expect(verifyOtp).toHaveBeenCalledWith({ type, token_hash: "hash" });
  expect(response.headers.get("location")).toBe("https://tripboard.test/reset-password");
});

it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/\t/evil.test", "trips", ""])("rejects unsafe next %j", async (next) => {
  const response = await request({ token_hash: "hash", type: "email", next });
  expect(response.headers.get("location")).toBe("https://tripboard.test/trips");
});

it("preserves relative paths and query strings", async () => {
  const response = await request({ token_hash: "hash", type: "email", next: "/trips?sort=name" });
  expect(response.headers.get("location")).toBe("https://tripboard.test/trips?sort=name");
});

it.each([{ type: "sms", token_hash: "hash" }, { type: "email", token_hash: "" }])("rejects invalid token parameters", async (params) => {
  expect((await request(params)).headers.get("location")).toBe("https://tripboard.test/login?error=link");
  expect(verifyOtp).not.toHaveBeenCalled();
});

it("sends failed verification to the friendly login message", async () => {
  verifyOtp.mockResolvedValue({ error: { message: "Expired" } });
  expect((await request({ type: "email", token_hash: "bad" })).headers.get("location")).toBe("https://tripboard.test/login?error=link");
});

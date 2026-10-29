import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const { exchangeCodeForSession } = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn() }));
vi.mock("@/lib/supabase/env", () => ({ supabaseEnv: { url: "https://example.test", key: "test" } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { exchangeCodeForSession } }) }));
beforeEach(() => exchangeCodeForSession.mockReset().mockResolvedValue({ error: null }));

const request = (params: Record<string, string>) =>
  GET(new NextRequest(`https://tripboard.test/auth/callback?${new URLSearchParams(params)}`));

it("exchanges the code and goes to next", async () => {
  const response = await request({ code: "abc", next: "/trips?sort=name" });
  expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
  expect(response.headers.get("location")).toBe("https://tripboard.test/trips?sort=name");
});

it("defaults to the trip list without next", async () => {
  expect((await request({ code: "abc" })).headers.get("location")).toBe("https://tripboard.test/trips");
});

it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/\t/evil.test", "trips", ""])("rejects unsafe next %j", async (next) => {
  const response = await request({ code: "abc", next });
  expect(response.headers.get("location")).toBe("https://tripboard.test/trips");
});

it("sends a missing code to the friendly login message", async () => {
  expect((await request({ next: "/trips" })).headers.get("location")).toBe("https://tripboard.test/login?error=google");
  expect(exchangeCodeForSession).not.toHaveBeenCalled();
});

it("sends a provider error to the friendly login message without exchanging", async () => {
  const response = await request({ error: "access_denied", error_description: "denied", code: "abc" });
  expect(response.headers.get("location")).toBe("https://tripboard.test/login?error=google");
  expect(exchangeCodeForSession).not.toHaveBeenCalled();
});

it("sends a failed exchange to the friendly login message, never to next", async () => {
  exchangeCodeForSession.mockResolvedValue({ error: { message: "bad verifier" } });
  const response = await request({ code: "abc", next: "/trips/x" });
  expect(response.headers.get("location")).toBe("https://tripboard.test/login?error=google");
});

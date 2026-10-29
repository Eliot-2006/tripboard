import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_UPLOAD_BYTES } from "@/lib/import/file";
import { JPEG, PDF, PNG } from "@/test/files";

const create = vi.hoisted(() => vi.fn());
const signedIn = vi.hoisted(() => ({ value: { id: "u1" as string | null, unavailable: false } }));

vi.mock("@/lib/supabase/server", () => ({ currentUser: async () => signedIn.value }));
vi.mock("@anthropic-ai/sdk", () => {
  class APIConnectionTimeoutError extends Error {}
  class RateLimitError extends Error {}
  class Anthropic {
    static APIConnectionTimeoutError = APIConnectionTimeoutError;
    static RateLimitError = RateLimitError;
    messages = { create };
  }
  return { default: Anthropic };
});

import Anthropic from "@anthropic-ai/sdk";
import { POST } from "./route";

// The mock above stands in for the SDK's error classes; these are plain Errors.
const Errors = Anthropic as unknown as Record<"APIConnectionTimeoutError" | "RateLimitError", new (message: string) => Error>;

const item = {
  type: "flight",
  title: "LAX to Tokyo",
  start_date: "2027-04-10",
  start_time: "11:30",
  start_timezone: "America/Los_Angeles",
  end_date: "2027-04-11",
  end_time: "15:45",
  end_timezone: "Asia/Tokyo",
  start_place: "LAX",
  end_place: "HND",
  address: null,
  cost: null,
  currency: null,
  confirmation_number: "ABC123",
  airline: "ANA",
  flight_number: "NH105",
  notes: null,
};
const reply = (text: string, stop_reason = "end_turn") => ({ stop_reason, content: [{ type: "text", text }] });

async function post(parts: [string, BlobPart, string?][] | null, headers: Record<string, string> = {}) {
  const form = new FormData();
  for (const [name, data, filename] of parts ?? []) form.append(name, new Blob([data]), filename ?? "booking");
  const probe = new Request("http://test/api/import", { method: "POST", body: form });
  const length = (await probe.clone().arrayBuffer()).byteLength;
  return POST(new Request("http://test/api/import", { method: "POST", body: form, headers: { "content-length": String(length), ...headers } }));
}

beforeEach(() => {
  create.mockReset();
  signedIn.value = { id: "u1", unavailable: false };
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
});

describe("POST /api/import", () => {
  it("returns 401 when signed out, without calling the model", async () => {
    signedIn.value = { id: null, unavailable: false };
    expect((await post([["file", PDF]])).status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 503 when accounts are unavailable", async () => {
    signedIn.value = { id: null, unavailable: true };
    expect((await post([["file", PDF]])).status).toBe(503);
  });

  it("returns 503 when there is no API key", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await post([["file", PDF]]);
    expect(res.status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 413 for a file over 5 MB, by header and by bytes", async () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set(PDF);
    expect((await post([["file", big]])).status).toBe(413);
    const slightlyBig = new Uint8Array(MAX_UPLOAD_BYTES + 10);
    slightlyBig.set(PDF);
    expect((await post([["file", slightlyBig]])).status).toBe(413);
    expect((await post([["file", PDF]], { "content-length": String(MAX_UPLOAD_BYTES * 3) })).status).toBe(413);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 415 for a file that is not a PDF or image, whatever it claims to be", async () => {
    const form = new FormData();
    form.append("file", new File(["<html>"], "booking.pdf", { type: "application/pdf" }));
    const length = (await new Request("http://t", { method: "POST", body: form }).arrayBuffer()).byteLength;
    const res = await POST(new Request("http://test/api/import", { method: "POST", body: form, headers: { "content-length": String(length) } }));
    expect(res.status).toBe(415);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 400 unless there is exactly one file in the 'file' field", async () => {
    expect((await post([])).status).toBe(400);
    expect((await post([["file", PDF], ["file", PNG]])).status).toBe(400);
    expect((await post([["other", PDF]])).status).toBe(400);
    expect((await post([["file", PDF], ["note", "hi"]])).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 411 without a content length", async () => {
    const form = new FormData();
    form.append("file", new Blob([PDF]));
    expect((await POST(new Request("http://test/api/import", { method: "POST", body: form }))).status).toBe(411);
  });

  it("extracts drafts from a PDF, sending the PDF as a document", async () => {
    create.mockResolvedValue(reply(JSON.stringify({ items: [item] })));
    const res = await post([["file", PDF]]);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [item] });
    const call = create.mock.calls[0][0];
    expect(call.model).toBe("claude-sonnet-5-5");
    expect(call.max_tokens).toBeLessThanOrEqual(16000);
    expect(call.output_config.format.type).toBe("json_schema");
    expect(call.system).toMatch(/untrusted data/);
    expect(call.messages[0].content[0]).toMatchObject({ type: "document", source: { media_type: "application/pdf" } });
  });

  it("sends images as images, using the sniffed type", async () => {
    create.mockResolvedValue(reply(JSON.stringify({ items: [] })));
    const res = await post([["file", JPEG, "screenshot.png"]]);
    expect(await res.json()).toEqual({ items: [] });
    expect(create.mock.calls[0][0].messages[0].content[0]).toMatchObject({ type: "image", source: { media_type: "image/jpeg" } });
  });

  it("explains unparseable output without showing it", async () => {
    create.mockResolvedValue(reply("sk-secret not json {"));
    const res = await post([["file", PDF]]);
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("sk-secret");
  });

  it("explains output that does not match the schema", async () => {
    create.mockResolvedValue(reply(JSON.stringify({ items: [{ ...item, type: "car" }] })));
    expect((await post([["file", PDF]])).status).toBe(502);
  });

  it("maps a refusal, a cut-off answer, a timeout and a rate limit to friendly errors", async () => {
    create.mockResolvedValueOnce(reply("", "refusal"));
    expect((await post([["file", PDF]])).status).toBe(422);
    create.mockResolvedValueOnce(reply("{", "max_tokens"));
    expect((await post([["file", PDF]])).status).toBe(502);
    create.mockRejectedValueOnce(new Errors.APIConnectionTimeoutError("took 90s"));
    expect((await post([["file", PDF]])).status).toBe(504);
    create.mockRejectedValueOnce(new Errors.RateLimitError("slow down"));
    expect((await post([["file", PDF]])).status).toBe(429);
  });

  it("never returns the SDK's error message or stack", async () => {
    create.mockRejectedValue(new Error("401 invalid x-api-key sk-test at /srv/app.js:1"));
    const res = await post([["file", PDF]]);
    const text = await res.text();
    expect(res.status).toBe(502);
    expect(text).not.toMatch(/sk-test|x-api-key|app\.js/);
  });

  it("keeps at most 10 drafts", async () => {
    create.mockResolvedValue(reply(JSON.stringify({ items: Array.from({ length: 14 }, () => item) })));
    expect((await (await post([["file", PDF]])).json()).items).toHaveLength(10);
  });
});

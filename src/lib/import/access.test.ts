import { describe, expect, it } from "vitest";
import { importAllowed } from "./access";

describe("importAllowed", () => {
  it("allows only listed emails, ignoring case and spaces", () => {
    expect(importAllowed("Me@Example.com", "a@b.com, me@example.com")).toBe(true);
    expect(importAllowed("other@example.com", "a@b.com, me@example.com")).toBe(false);
  });

  it("allows nobody without a list or an email", () => {
    expect(importAllowed("me@example.com", undefined)).toBe(false);
    expect(importAllowed("me@example.com", "")).toBe(false);
    expect(importAllowed(null, "me@example.com")).toBe(false);
  });
});

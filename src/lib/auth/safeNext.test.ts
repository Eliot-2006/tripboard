import { expect, it } from "vitest";
import { safeNext } from "./safeNext";

it.each(["/trips", "/trips/abc", "/trips?sort=name", "/a/b#c", "/"])("keeps the same-site path %j", (next) => {
  expect(safeNext(next)).toBe(next);
});

it.each([
  "https://evil.test",
  "http://evil.test/trips",
  "//evil.test",
  "///evil.test",
  "/\\evil.test",
  "/\t/evil.test",
  "/\n/evil.test",
  "/\r/evil.test",
  "\\\\evil.test",
  "javascript:alert(1)",
  "trips",
  " /trips",
  "",
  null,
  undefined,
])("falls back to /trips for %j", (next) => {
  expect(safeNext(next)).toBe("/trips");
});

import { describe, expect, it } from "vitest";
import { JPEG, PDF, PNG, WEBP, bytes } from "@/test/files";
import { checkUpload, MAX_UPLOAD_BYTES, sniffUpload } from "./file";

describe("sniffUpload", () => {
  it("recognises PDF, PNG, JPEG and WebP by their first bytes", () => {
    expect(sniffUpload(PDF)).toBe("application/pdf");
    expect(sniffUpload(PNG)).toBe("image/png");
    expect(sniffUpload(JPEG)).toBe("image/jpeg");
    expect(sniffUpload(WEBP)).toBe("image/webp");
  });

  it("rejects other content, whatever the file is called", () => {
    expect(sniffUpload(new TextEncoder().encode("<html><script>alert(1)</script>"))).toBeNull();
    expect(sniffUpload(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(sniffUpload(bytes([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45]))).toBeNull(); // RIFF WAVE
    expect(sniffUpload(new Uint8Array())).toBeNull();
  });

  it("needs the PDF signature at the very start", () => {
    expect(sniffUpload(new TextEncoder().encode(" %PDF-1.7"))).toBeNull();
  });
});

describe("checkUpload", () => {
  it("accepts a valid file and says its type", () => {
    expect(checkUpload(PNG)).toEqual({ ok: true, kind: "image/png" });
  });

  it("rejects an empty file with 400", () => {
    expect(checkUpload(new Uint8Array())).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects a file of the wrong type with 415", () => {
    expect(checkUpload(new TextEncoder().encode("hello"))).toMatchObject({ ok: false, status: 415 });
  });

  it("allows exactly 5 MB and rejects one byte more with 413", () => {
    expect(checkUpload(bytes([...PDF], MAX_UPLOAD_BYTES))).toMatchObject({ ok: true });
    expect(checkUpload(bytes([...PDF], MAX_UPLOAD_BYTES + 1))).toMatchObject({ ok: false, status: 413 });
  });

  it("checks size before type", () => {
    expect(checkUpload(new Uint8Array(MAX_UPLOAD_BYTES + 1))).toMatchObject({ status: 413 });
  });
});

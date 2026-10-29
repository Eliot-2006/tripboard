export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type UploadKind = "application/pdf" | "image/png" | "image/jpeg" | "image/webp";

const startsWith = (b: Uint8Array, sig: number[], at = 0) => sig.every((byte, i) => b[at + i] === byte);

/** The type the bytes say they are. The declared type and file name are never consulted: they are the sender's word. */
export function sniffUpload(b: Uint8Array): UploadKind | null {
  if (startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // %PDF-
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(b, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp"; // RIFF....WEBP
  return null;
}

export type UploadCheck = { ok: true; kind: UploadKind } | { ok: false; status: 400 | 413 | 415; message: string };

export function checkUpload(b: Uint8Array): UploadCheck {
  if (b.length === 0) return { ok: false, status: 400, message: "That file is empty." };
  if (b.length > MAX_UPLOAD_BYTES) return { ok: false, status: 413, message: "That file is over 5 MB. Try a smaller PDF or a cropped screenshot." };
  const kind = sniffUpload(b);
  if (!kind) return { ok: false, status: 415, message: "Use a PDF, PNG, JPEG or WebP file." };
  return { ok: true, kind };
}

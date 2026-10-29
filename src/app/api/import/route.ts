import { MAX_DRAFTS } from "@/lib/import/map";
import { checkUpload, MAX_UPLOAD_BYTES } from "@/lib/import/file";
import { extractBookings, ImportError } from "@/lib/import/extract";
import { currentUser } from "@/lib/supabase/server";

/**
 * Reads one booking document (PDF, PNG, JPEG or WebP, up to 5 MB) with Claude and returns the draft items it found. The browser
 * turns them into item form values (`draftToForm`). Nothing is saved here: the browser shows a review screen and
 * creates the confirmed items through the normal repository.
 * ponytail: the upload is not stored. To keep the document with the item, add a private Supabase Storage bucket and a
 * `documents` table (item_id, path, name, size) and write to them here before extracting.
 * ponytail: no per-user rate limit yet; the Anthropic key's monthly spend limit is the backstop. Add a per-user daily
 * counter table (or Upstash) before opening sign-ups wide.
 */
export async function POST(request: Request) {
  // The user id comes from the verified session cookie, never from the request.
  const user = await currentUser();
  if (user.unavailable) return fail(503, "Accounts are unavailable right now. Please try again later.");
  if (!user.id) return fail(401, "Log in to import a booking.");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fail(503, "Import isn't set up on this server.");

  // Cheap check before buffering the body. A browser always sends the length of a form upload; the multipart envelope
  // adds a little to the file. Real size is checked again on the bytes below.
  const declared = Number(request.headers.get("content-length"));
  if (!Number.isFinite(declared) || declared <= 0) return fail(411, "Send the file as a form upload.");
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) return fail(413, "That file is over 5 MB. Try a smaller PDF or a cropped screenshot.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Send the file as a form upload.");
  }
  const entries = [...form.entries()];
  const file = entries[0]?.[1];
  if (entries.length !== 1 || entries[0][0] !== "file" || typeof file === "string") return fail(400, "Send exactly one file.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = checkUpload(bytes);
  if (!checked.ok) return fail(checked.status, checked.message);

  try {
    const { items } = await extractBookings(apiKey, bytes, checked.kind);
    return Response.json({ items: items.slice(0, MAX_DRAFTS) });
  } catch (error) {
    if (error instanceof ImportError) return fail(error.status, error.message);
    return fail(502, "We couldn't read that file right now. Please try again.");
  }
}

const fail = (status: number, error: string) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

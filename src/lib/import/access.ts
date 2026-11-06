// ponytail: an allowlist, not a quota. Each import costs money, so only listed accounts get it; add per-user limits if it opens up.
/** Whether this account may use Import booking: its email is in the comma-separated IMPORT_ALLOWED_EMAILS. */
export function importAllowed(email: string | null, allowlist = process.env.IMPORT_ALLOWED_EMAILS): boolean {
  if (!email || !allowlist) return false;
  return allowlist.split(",").some((e) => e.trim().toLowerCase() === email.toLowerCase());
}

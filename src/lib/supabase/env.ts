const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * The project URL and publishable key, or null when they aren't set (a fresh clone, or a deploy without them).
 * Without them accounts are unavailable, and the demo still works.
 */
export const supabaseEnv = url && key ? { url, key } : null;

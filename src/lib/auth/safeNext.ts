const DEFAULT_NEXT = "/trips";

/**
 * Where to go after signing in, from a `next` query parameter anyone can craft. Only a path on this site is allowed: it
 * must start with a single "/" ("//evil.test" and "/\evil.test" mean another site), with no control characters (browsers
 * strip tabs and newlines, so "/\t/evil.test" becomes "//evil.test"). Anything else goes to the trip list.
 */
export function safeNext(next: string | null | undefined): string {
  return next && /^\/(?![/\\])/.test(next) && !/[\u0000-\u001f\u007f]/.test(next) ? next : DEFAULT_NEXT;
}

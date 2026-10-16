# Tripboard task tracker

Orchestrator-owned. States: BACKLOG → READY → IN PROGRESS → REVIEW → TESTING → DONE (or BLOCKED).

## Baseline (2026-10-15)

- `tsc --noEmit`, `npm run lint`: clean. `npm test`: 165/165 (with `TEST_USER_*` set, the Supabase contract runs too).
- `npm run e2e`: 32/33. `move.spec.ts` "drags an item to another day" is flaky on a cold dev server (passes on rerun).
- Every P0 except deployment (M6) is built. Open: P1s, account-flow browser coverage, dark mode, README screenshots, deploy.
- Supabase project `tripboard` (zvyrcdmmuashpeprnykb) had no users or trips. Signups are auto-confirmed. A dedicated e2e account lives in `.env.local` only.

## Status (2026-10-15, end of session)

All P0 except deployment, and all P1 except Google sign-in, are built and verified. Open: T7 deploy and T8 Google sign-in (both need the user), Firefox run in CI, cleanup of disposable `tripboard-e2e-*` auth users in Supabase (destructive, needs the user).

## Integration model

The user commits and pushes themselves (global CLAUDE.md). Workers do not commit: each leaves its change uncommitted in its own Superset worktree, the orchestrator reviews it, applies the diff to the integration worktree (`tripboard-autonomous-e8a8dec5`) and reruns checks. Later workers start from a patch of what is already integrated.

## Tasks

| ID | Task | PRD | Pri | Deps | Status | Worker / branch | Notes |
|---|---|---|---|---|---|---|---|
| T0 | De-flake the drag-to-another-day e2e | ITIN-6 | P0 | – | DONE | orchestrator | Cause: drop target in dnd-kit auto-scroll zone, page scrolled mid-drag. Helper now centers source and target. move.spec 72/72 (×12, 6 workers) |
| T1 | Over-budget warning, spending by type, upcoming/past trips | BUD-5, BUD-6, TRIP-5 | P1 | – | DONE | ws 1a24404f / feat/budget-trips-p1 | Integrated. Orchestrator fix: over-budget note moved into a `dd` (was `p` in `dl`). Checks: tsc, lint, 170 unit, 34/34 e2e, visual desktop+phone |
| T2 | Duplicate an item, collapse and expand days | ITEM-12, ITIN-11 | P1 | – | DONE | ws 27fbb124 / feat/itinerary-p1 | Integrated. Copy is planned/unpaid, no confirmation or actual cost. Orchestrator fix: delete returns focus to the day toggle explicitly. Checks: tsc, lint, 172 unit, 38/38 e2e, visual |
| T3 | Browser tests for signed-in flows on Supabase, plus friendly error when the database is down | AUTH-1..3, TRIP-2..4, ITEM-6, ITIN-5/6, NFR-6, UX-3 | P0 | – | DONE | ws a9258adf / test/account-e2e | Integrated e2e/account.spec.ts (6 tests). Orchestrator merged its NFR-6 fix into T5's error state (Try again + Try the demo). Checks: 45/45 e2e, account spec 12/12 on repeat, no leftover trips. Sign-up test leaves one disposable auth user per run (75 so far) |
| T4 | Dark mode following system preference (incl. map tiles, pins, signage band) | UX-5 | P1 | T1 | DONE | ws 00d627e2 / feat/dark-mode | Integrated. CSS-only `prefers-color-scheme` tokens, tile-pane filter, theme-aware routes. DESIGN.md has the dark section. Checks: tsc, lint, 173 unit, 39/39 e2e, visual dark desktop+phone |
| T5 | Responsive and state polish pass (Impeccable audit): phone header height, loading/empty/error states, tablet | UX-2, UX-3, UX-6 | P0 | T1, T2 | DONE | ws c09b54a7 / feat/responsive-polish | Integrated (merged cleanly over T4). Compact phone header, faded day strip, designed loading/error/not-found states (WorkspaceState), long-text wrapping, "Tokyo time" zone labels. Checks: tsc, lint, 173 unit, 39/39 e2e, phone visual |
| T6 | README: screenshots, stack, future work | V1 DoD | P0 | T4, T5 | DONE | Codex → Claude (Codex hit its limit) · ws 992ff879 / docs/readme-v1 | Integrated README (status, screenshots, stack, future work) + 5 screenshots in docs/screenshots |
| T9 | Cross-browser and viewport regression (Firefox, WebKit, phones, tablet) | NFR-5, UX-1, UX-2 | P0 | T1, T2 | DONE | Codex → Claude · ws a96e3063 / test/cross-browser | Projects: chromium, firefox, webkit, iphone-13, pixel-7, tablet (`npm run e2e:all`; `npm run e2e` stays chromium). 205 pass, 20 intentional skips (desktop-only checks on phones). Firefox doesn't launch on this Mac: run it in CI. Orchestrator fixes: dev badge off (it covered the phone sheet's Edit button), auth-form fill retry (WebKit hydration) |
| T10 | Independent review of integrated T0–T5 diff (correctness, a11y, security, simplicity) | all | P0 | T5 | DONE | Codex → Claude · ws 437c5893 / review/integration-1 | No high/med findings. Kept: duplicate in-flight guard, focus on the copy, collapsing a day deselects its item. Fixed a test Codex broke. Integrated; 173 unit, 45/45 e2e |
| T7 | Deploy to Vercel, production map tiles | M6 | P0 | all | BLOCKED | | Needs user approval (production deploy, tile provider terms) |
| T8 | Sign in with Google | AUTH-4 | P1 | – | BLOCKED | | Needs Google OAuth client configured in Supabase by the user |
| – | Place search | GEO-1 | P2 | – | BACKLOG | | Deferred per PRD |

## Decisions

- 2026-10-15: Claude usage is low, so new workers (T9, T6, reviews) run on Codex. Running Claude workers finish their tasks.

- Zustand is listed in the technical doc but was removed as unused; selection and range live in React state. Not re-adding it.

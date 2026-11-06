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
| T7 | Deploy to Vercel, production map tiles | M6 | P0 | all | DONE | user | Live at https://tripboard-coral.vercel.app, MapTiler Dataviz tiles, key restricted to localhost + the Vercel domain |
| P1 | Link preview, app icon, MapTiler logo (free-plan requirement) | V1 DoD | P0 | T7 | DONE | Codex · feat/link-preview-map-logo | Static opengraph-image.png, icon.svg, apple-icon.png; logo only when tiles are MapTiler |
| P2 | Portfolio README and fresh screenshots | V1 DoD | P0 | T7 | DONE | Sonnet subagent | Screenshots predate the map logo |
| P3 | Ponytail cleanup: shared e2e helpers | – | – | – | DONE | orchestrator | e2e/helpers.ts; account spec now gets the drag-centering fix |
| A1 | Password reset, email-link landing, unconfirmed-email message | AUTH-1..3 | P1 | email sender | BACKLOG | Codex · built in a496912, then removed | Removed until the user sets up a dedicated sender email (Brevo or a domain). Restore from a496912 and 7893769 (e2e/password.spec.ts); then SMTP, Confirm email on, two email templates |
| A2 | Keep the free Supabase project awake | NFR | P0 | T7 | DONE | orchestrator | Daily Vercel cron → /api/keepalive |
| A3 | Remove disposable test users; sign-up test no longer creates users | – | – | – | DONE | orchestrator | Deleted 94 tripboard-e2e users (approved). Sign-up e2e mocks Supabase |
| T8 | Sign in with Google | AUTH-4 | P1 | – | BLOCKED | | Needs Google OAuth client configured in Supabase by the user |
| C1 | GitHub Actions CI (lint, tsc, unit, e2e Chromium + Firefox) and installable web app manifest | NFR-5, V3 | P1 | – | REVIEW | Sonnet · ci-and-pwa (344bafc) | Reviewed by orchestrator. No service worker (offline out of scope). Workflow not yet run on GitHub; Firefox unverified until it does |
| V3-1 | Schedule warnings: overlaps, tight connections, free time | V3 | P2 | – | REVIEW | Sonnet · feat/schedule-warnings (ec595ec) | Reviewed; rerun: 177 unit, tsc, lint clean. 30 km/h straight-line heuristic over-warns on intercity gaps. Nit: `DaySectionProps ={` spacing in Itinerary.tsx |
| V3-2 | Read-only share page with private fields hidden | V3 | P2 | – | REVIEW | Sonnet · feat/share-page (05688c3) | Security-definer RPC, DB-chosen tokens, no anon table access. Codex review: no high/med; 2 low (SQL test could pass vacuously on null compares; cross-user counts printed, not asserted). Orchestrator fixed both (uncommitted in the agent worktree); PGlite: passes, and fails on 3 mutants the old test missed. Migration NOT applied: user applies, then reruns rls_isolation.sql in the SQL Editor |
| G1 | Place search in the item form (MapTiler geocoding, existing key) | GEO-1 | P2 | – | REVIEW | Sonnet cloud · feat/place-search (c94c0c5) | Hidden when no key. API shape checked against MapTiler docs by orchestrator (cloud couldn't reach them). README conflicts with ai-import (env table, keep both rows) |
| T8b | Google sign-in code (callback route, open-redirect guard) | AUTH-4 | P1 | – | REVIEW | Sonnet cloud · feat/google-sign-in (e04e20d) | Merge only after the user enables Google in Supabase (README has steps). Codex: no high/med; 20 redirect probes held. Low: an unexpected thrown error in the callback gives a 500 |
| V2-1 | AI booking import, minimal (PDF/image → drafts → review → create) | V2 | P2 | – | REVIEW | Sonnet cloud · feat/ai-import (1bb4da8) | No Storage/table; hidden without ANTHROPIC_API_KEY. Cloud npm dropped 10 lockfile libc markers: fixed lockfile in ai-import-lockfix worktree (uncommitted). Codex: 1 med (any signed-up account could run paid imports) → fixed with server-only IMPORT_ALLOWED_EMAILS allowlist (403 + hidden action), uncommitted in ai-import-lockfix. Low: body fully buffered before byte check (no remote bypass found). Review dialog never run in a browser |
| – | Place search | GEO-1 | P2 | – | BACKLOG | | Deferred per PRD |

## Decisions

- 2026-10-28: Agent(isolation: remote) fell back to local worktrees, so cloud work runs as one-time claude.ai routines (RemoteTrigger) with all MCP connectors cleared. Cloud commits are authored `Claude <noreply@anthropic.com>`: squash-merge or re-author before merging.
- 2026-10-28: V1 done. Next wave runs on cloud Sonnet agents that push branches (no PRs); the user re-commits under their own name before merging.
- 2026-10-28: Codex workers run gpt-6.1-sol (no gpt-6.1-terra exists). Known flake: move.spec "drops onto a collapsed day" on WebKit, about 1 in 30 under load; body unchanged from main.

- 2026-10-15: Claude usage is low, so new workers (T9, T6, reviews) run on Codex. Running Claude workers finish their tasks.

- Zustand is listed in the technical doc but was removed as unused; selection and range live in React state. Not re-adding it.

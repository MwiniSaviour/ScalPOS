# Onboarding/auth — agent report

## Files created
- `lib/api/bootstrap.ts` — extracted `SyncConnection` type, `readConnection()`, `writeConnection()` (storage key `nova-pos-sync-v1`, logic copied verbatim from connect-screen), and `bootstrapConnection()` (POST `/functions/v1/bootstrap-org` with Bearer token → `{org_id}` or throw; org-name lookup via `getSupabase().from("orgs").select("name")…maybeSingle()`; writes + returns the connection).
- `app/auth-screen.tsx` — passwordless entry screen ("use client"). Mount effect dynamically imports `@/lib/api/supabase`, calls `getSupabase().auth.getSession()` (cancelled-flag guarded, same pattern as connect-screen); if a user session exists it renders a small "Signed in as {email}" card with a Continue button → `router.replace("/")`. Otherwise: brand row (inline `public/icon.svg` markup at `size-12`), "Welcome to Nova POS" hero, card with `Segmented` (Sign in / Create account), email `Input`, "Email me a code" `Button` (testid `auth-send`, disabled `!online || busy`), offline note when `!online`, error paragraph; "Continue offline" secondary button (testid `auth-offline`) calls `markOnboarded()` + `router.replace("/")`. Send handler validates non-empty email containing `@`, calls `signInWithOtp({ shouldCreateUser: mode === "signup" })`, pushes `/auth/code?email=<enc>`.
- `app/auth/page.tsx` — Suspense-wrapped page importing `../auth-screen` (exact pay/page pattern).
- `app/auth-code-screen.tsx` — 6-digit OTP screen ("use client", `useSearchParams` for `?email=`; redirects to `/auth` when missing). Digit boxes (`data-testid` on row `code-row`) with digit-stripping onChange, auto-advance focus, Backspace handling, paste-into-first-box fill; "Verify & continue" (testid `code-verify`, disabled until full code, online, email); ghost `Resend code (Ns)` with 30s cooldown interval and `Change email` row; `verifyOtp({ type: "email" })` → session read → `bootstrapConnection({ access_token, user_id, email })` → `markOnboarded()` + toast "Signed in — shop synced" + `router.replace("/")`; bootstrap failure → toast "Signed in, but setup wasn't complete" (warn) + `router.replace("/connect")`.
- `app/auth/code/page.tsx` — Suspense-wrapped page importing `../../auth-code-screen`.

## Files edited
- `app/connect-screen.tsx` — removed local `STORAGE_KEY`, `Connection` interface, `readConnection`, `writeConnection` and the inline bootstrap fetch/org-name block in `connect()`; now imports `{ readConnection, writeConnection, bootstrapConnection, type SyncConnection }` from `@/lib/api/bootstrap`. `conn` state is `SyncConnection | null`; `connect()` calls `bootstrapConnection({ access_token, user_id, email: sessionEmail ?? email.trim() ?? undefined })` then `setConn(c)`, `setMessage("Connected.")`, toast — behavior identical. `supabaseUrl()` kept (still used by `invite()`), `writeConnection` still used by `disconnect()`. No unrelated reformatting.

## Verification
```
./node_modules/.bin/tsc --noEmit        → clean (no output)
./node_modules/.bin/eslint app components lib → clean (no output)
```
`lib/first-run.ts` existed by verification time (created in parallel), so `markOnboarded` resolved on first run — no retry needed. No commit made.

## Deviations / notes
- `lib/api/supabase` is statically imported for the click handlers per spec (`const sb = getSupabase()`); the mount effect still follows the spec's dynamic-import pattern (resolves to the same module — redundant but harmless).
- The brand SVG (incl. its `id="g"` gradient defs) is duplicated in both auth screens since no shared component file was permitted; ids don't collide because only one screen is mounted at a time.
- Digit backspace "clear self" is done manually with `preventDefault` for deterministic behavior in a controlled input.
- Error paragraphs render conditionally (`{error && …}`), matching connect-screen's style.

# Team / roles feature — worker report

## Files changed

- `backend/supabase/migrations/0005_member_email.sql` (new) — adds `email text` to `public.memberships`.
- `backend/supabase/functions/bootstrap-org/index.ts` — owner membership insert now includes `email: user.email` when the verified user has one (conditional spread; idempotent-guard untouched).
- `backend/supabase/functions/accept-invite/index.ts` — blind `insert` replaced with `upsert({ org_id, user_id, role, email, deleted_at: null }, { onConflict: "org_id,user_id" })`; revive + rewrite of soft-deleted rows, sets/stores invitee email.
- `lib/api/team.ts` (new) — typed `TeamRole`/`TeamMember`, `listMembers`, `setRole`, `layoffMember` (deleted_at = ISO now), `reinstateMember` (deleted_at = null); all throw on error, use `getSupabase()` like bootstrap.ts.
- `app/connect-screen.tsx` — new `PeopleSection` subcomponent rendered in the connected branch after the Team invite card (Sync card stays above, still visible); invite() bumps `rosterVersion` so the roster refreshes after an invite. No other screen behavior changed.

## Edge-function behavior changes

- `bootstrap-org` (POST /bootstrap-org): identical responses; only the fresh-owner `memberships` insert gains `email` (owner's auth email, when present). Idempotent early-return unchanged.
- `accept-invite` (POST /accept-invite): signature/expiry/email-mismatch checks, token decode, and the `joined:false` early-return for an existing non-deleted membership are unchanged. The final insert is now an upsert on `(org_id, user_id)` that sets `role` to the token role, `email` to the auth user's email (`null` if none), and `deleted_at` to `null`. Re-inviting a laid-off person revives the tombstone row and gives back access (their row's org checks pass again once deleted_at is null); the unique-key duplicate error is gone. Success response stays `{ org_id, role, joined: true }`.

## Migration contents

`alter table public.memberships add column if not exists email text;`

Orchestrator must also backfill `email` for existing rows (owner rows) from `auth.users`, then deploy both edge functions.

## UI behavior per role

- Everyone connected sees the "People" card (`data-testid=team-list`): `Card inset` rows (`team-row`), avatar + member display name (`email` column, fallback to connection email for your own row, else "Member"), a `StatusPill` role pill (OWNER/SUPERVISOR/CASHIER), laid-off rows sorted last, muted, with a "Removed" pill.
- Owner (their user_id matches an active owner row): rows for other active members are tappable → Sheet titled with the member's email: role as Chips (`team-role-owner/supervisor/cashier`, current highlighted), plus a danger "Remove access" button (`team-remove`) guarded by a danger Confirm ("Remove access?" / "They immediately lose access to the shop until reinstated or re-invited."). Acting on your own row is impossible (not tappable, no controls). Last-owner guard: demoting or removing an owner while active owner count == 1 toasts an error and leaves the sheet open.
  - Laid-off rows show a soft "Reinstate" button (`team-reinstate`) for the owner.
- Non-owners get the same read-only list plus a muted "Only owners can change roles." caption; rows are not tappable, no Reinstate.
- Flow is request-based (busy state, no optimistic writes); success toasts "Role updated" / "Access removed" / "Access reinstated"; errors toast `e.message` then re-list.

## Orchestrator to-do

1. Apply `0005_member_email.sql`.
2. Backfill `email` for existing memberships from `auth.users` (at least owner rows).
3. Deploy `bootstrap-org` and `accept-invite` edge functions.
4. Gates: `tsc --noEmit`, `eslint app components lib`, `next build --webpack` (not run here).

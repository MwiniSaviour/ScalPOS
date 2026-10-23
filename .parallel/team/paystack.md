# Paystack subscription backend + billing UI — report

## Files created

- `backend/supabase/migrations/0006_subscriptions.sql` — `public.subscriptions` table, `extensions.moddatetime` trigger on `updated_at` (same pattern as 0001), index on `org_id, created_at`, RLS enabled with `subscriptions_select` policy via `public.current_org_ids()`. No write policies (service-role writes only).
- `backend/supabase/functions/subscribe-init/index.ts` — owner-only, creates pending row, calls Paystack Initialize Transaction.
- `backend/supabase/functions/paystack-webhook/index.ts` — HMAC-SHA512 verification over raw body, activates on `charge.success`.
- `backend/supabase/functions/check-subscription/index.ts` — latest row per org, auto-expires, auto-verifies fresh pending rows (< 1h) via Paystack verify.
- `lib/api/billing.ts` — `getSubscription`, `startSubscription` (Capacitor `App.openUrl` with `window.open` fallback), `SubPlan`, `SubscriptionState`.
- `app/billing-screen.tsx` — status card + Standard/Enterprise plan cards + refresh + Paystack footnote linking `/legal`.
- `app/billing/page.tsx` — Suspense wrapper page.

Not touched: more-screen, legal, receipt, bluetooth.

## Edge function env vars

| Function | Required env |
| --- | --- |
| subscribe-init | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, `SITE_URL` (optional, defaults `https://novapos.app`) |
| paystack-webhook | `PAYSTACK_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| check-subscription | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY` (only needed for pending-row auto-verify) |

Setup steps the USER must do:

1. Set `PAYSTACK_SECRET_KEY` (Paystack → Settings → API Keys & Webhooks → Secret key, sk_live_…/sk_test_…) for all three functions (subscribe-init, paystack-webhook, check-subscription) in Supabase dashboard → Edge Functions.
2. Set `SITE_URL` (optional) to the app's public origin (the Capacitor web origin / deployed URL) so `callback_url` is fully qualified; defaults to `https://novapos.app` placeholder otherwise.
3. In Paystack dashboard, set Webhook URL to:
   `https://yfdytegvozhgoczcnfiz.supabase.co/functions/v1/paystack-webhook`
   (Paystack computes the signature over the raw body with your secret key; no auth header needed — the function requires no extra headers since verify_jwt is disabled for webhooks or the webhook posts without Authorization.)
4. Amounts are integer pesewas in GHS: Standard = 12000 (GHS 120), Enterprise = 36000 (GHS 360).

Note: the checkout callback URL is `{SITE_URL}/paystack/callback` — no `/paystack/callback` page exists yet; return to the app manually and use "Refresh status" on `/billing` (check-subscription re-verifies fresh pending payments, so confirmation works without the callback page).

## Behavior

- subscribe-init: POST `{ plan }`, requires the caller to hold the sole `owner` membership (403 otherwise, "no org membership" 403). Creates a fresh `pending` row each call (`NOVA-<org6>-<std|ent>-<random10>`, regenerated once on unique violation), returns `{ authorization_url, reference }` or the upstream Paystack error (502) while keeping the pending row.
- paystack-webhook: 401 on signature mismatch; activates on `charge.success` with metadata.sub_id, matching amount check (mismatch → 200 ignored), sets `channel`, `started_at` (paid_at), `expires_at` = +365 days; 200 `{received:true}` for any other event.
- check-subscription: returns `{ org_id, plan, status, expires_at }` or `{ plan: null, status: "none" }`; never crashes on missing env (500 with clear strings).

## Deployment state

All three edge functions are written to repo paths, ready to be deployed by the orchestrator via the MCP deploy tool:

- `subscribe-init/index.ts`
- `paystack-webhook/index.ts` (must deploy with `verify_jwt: false` OR Paystack signature check is the only auth — webhook never sends a Supabase JWT)
- `check-subscription/index.ts`

Migration `0006_subscriptions.sql` must be applied (orchestrator via migration tool / CLI).

# Phase 2 — Online/Offline + dead-route audit

## Net API notes (lib/net.ts, components/ui/netstatus.tsx)
`useNet()` → `{online}`; SSR-safe default `true`, corrected on mount (same pattern as `useNow`).
Native: `@capacitor/network` `getStatus()` + `addListener("networkStatusChange")` (v8 returns `Promise<PluginListenerHandle>`); web: `navigator.onLine` + window online/offline. Dynamic imports, race-guarded, cleanup removes listeners.
Pill: fixed top-right under safe area (`safe-t`), `z-[45]` (above tabbar z-40, below sheets z-50 / toaster z-[70]), `pointer-events-none`, `bg-warn/10 text-warn` + WifiOff, renders `null` when online. Mounted in `ChromeGate` after hydration (appshell.tsx:60) → zero SSR mismatch risk. Known trade-off: on Home it floats over the account avatar corner (avatar stays tappable, /more is also a tab).

## Route audit (source `app/` vs last build `out/` 2026-10-21 08:25 — fresh, no rebuild run)
| Route | Reachable? | Fix applied | Follow-up needed |
|---|---|---|---|
| `/` | TabBar Home | — | no |
| `/orders` | TabBar, home "View all" + pending card | — | no |
| `/orders/detail?id=` | orders rows, home recent, customer detail | — | no |
| `/inventory` | TabBar | — | no |
| `/inventory/detail?id=` | inventory rows, reports low-stock | — | no |
| `/inventory/edit?id=` | inventory add, sell empty-state, product detail edit, stock "Add product" | — | no |
| `/customers` | TabBar, more | — | no |
| `/customers/detail?id=` | customer rows | — | no |
| `/more` | TabBar, home avatar | — | no |
| `/sell` | TabBar CTA, orders empty, customer detail, pay back | — | no |
| `/pay` | sell Charge (2 paths) | — | no |
| `/reports` | home Today's-sales card, more | — | no |
| `/settings` | more | — | no |
| `/settings/shop` | more, settings (row + receipt "Edit") | — | no |
| `/stock` | more | — | no |
| `/categories` | more | — | no |

Zero dead routes, zero `#` links, all `router.push` targets exist. `out/products/` is static image assets, not a route.

## Features that no-op (report only — owners are protected files)
1. **Barcode scanner unreachable** — `SearchBar.onOpenScanner` (components/ui/input.tsx:106) is never passed by any screen; scan button never renders, though `@zxing/browser` + `@capacitor-mlkit/barcode-scanning` are installed. sell-screen only string-matches barcodes (app/sell-screen.tsx:61). → wire scanner on sell/inventory search (protected files).
2. **Reports lacks export/share** — reports-screen has only back nav; data export lives only in more (JSON dump, photos excluded by design). Minor gap.
3. more-screen: all 6 RowLinks + both actions verified wired (demo wipe key `nova-pos-v1` matches lib/store.ts:135) — **not broken, no edit applied**.

## pb math (tabbar vs appshell)
Reserve needed = CTA 52 + `pb-2` 8 + border 1 + strip `h-14` 56 + `max(safe,8)` = **117 + max(safe,8)** → 125px @safe 0, 141px @safe 24, 151px @safe 34. Appshell `pb-[164px]` leaves 39/23/13px headroom; clips only if safe > 47px (no known device). **No change made.**

## Blocked / not done
No build re-run (fresh `out/` reused, per parallel-agent rule); no browser/server started (headless chromium owned by another agent); ESLint on full `app/` skipped beyond owned files to avoid reading in-flight parallel edits — `tsc --noEmit` (exit 0) and lint on lib/net.ts, netstatus.tsx, appshell.tsx all clean.

# Nova POS — AGENTS

Ghana POS app. Next 16 + Tailwind 4 + Capacitor, static export (`--webpack` build). All screens are `"use client"`.

## Environment facts (Termux/Android host)

- Node on PATH. **Bun installs break ESLint resolution via cache symlinks — use `npm install` only.**
- Build uses `next build --webpack` (already in scripts). Turbopack unavailable (wasm platform).
- Brand-new installs need the shebang fix once:
  `for n in node_modules/.bin/*; do tgt=$(readlink -f "$n"); [ -f "$tgt" ] && head -1 "$tgt" | grep -q '^#!/usr/bin/env' && sed -i '1s|.*|#!/data/data/com.termux/files/usr/bin/env '"$(head -1 "$tgt" | cut -d' ' -f3)"'|' "$tgt"; done`
  (simpler: `find node_modules/.bin -type f | xargs sed -i '1s|^#!/usr/bin/env |#!/data/data/com.termux/files/usr/bin/env |'` + symlinked targets)
- Verification commands: `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/eslint app components lib`, `./node_modules/.bin/next build --webpack`
- Runtime check (headless chromium CDP): `chromium-browser --headless=new --remote-debugging-port=9333 ...`

## Routing & pages

- Static SPA export → **no dynamic route segments**. Detail/edit pages take `?id=`:
  - `/orders` list, `/orders/detail?id=` order detail
  - `/inventory` list, `/inventory/detail?id=`, `/inventory/edit?id=` (empty id = new)
  - `/customers`, `/customers/detail?id=`
  - `/sell` register, `/pay` payment flow (reads cart, shows version picker via `?v=` nothing — default)
- Page file pattern (route `app/orders/page.tsx`):
  ```tsx
  import { Suspense } from "react";
  import OrdersScreen from "./orders-screen";
  export default function Page() {
    return <Suspense fallback={null}><OrdersScreen /></Suspense>;
  }
  ```
  And the real screen lives in `app/<name>-screen.tsx` (or `components/screens/*`) as `"use client"`—using `useSearchParams()` is allowed inside because of the Suspense wrapper.

## Product images
- Uploaded photos live in IndexedDB (`lib/image-store.ts`, db `nova-pos-images`); `Product.imageUrl` holds `idb:<uuid>` refs, other values are plain paths/links.
- `components/ui/productart.tsx` resolves refs (via `lib/use-image-src.ts`); the monogram fallback is an SVG so it scales with the tile.
- Demo-store wipe clears both the store and the image DB. Never store base64 in localStorage.

## Store (lib/store.ts) — public API

Selectors via `usePos((s) => s.x)` — products, categories, orders, customers, stockMoves, settings, cart, cartCustomerId, cartDiscount, draftPayments, hydration flag `hydrated`.
`useSettings()`, `useCartTotals()` (lines/count/subtotal/discount/total), `paidOf(o)/dueOf(o)/payStatusOf(o)` are exported helpers.

Actions (via usePos.getState() or selector):
- cart: `addToCart(pid, qty?)`, `setCartQty(pid, qty)`, `clearCart()`, `setCartCustomer(cid)`, `setCartDiscount(amt)`, `addDraftPayment({method,amount})`, `clearDraftPayments()`
- orders: `placeOrder(payments: Payment[])` → returns Order, auto stock decrement + MOVES; `addPaymentsToOrder(oid, [Payment])` (auto completes status); `refundOrder(oid)` (restocks); `setPendingToCompleted(oid)`
- inventory: `upsertProduct({...})` (id omitted → create; `stock` counts as showroom delta writes `adjust` move), `deleteProduct`, `adjustStock(pid, deltaQty, reason, ref)` (reason: purchase|adjust|damage|return|count|sale|opening), `upsertCategory`, categories custom colors allowed `#hex`
- customers: `upsertCustomer({id?, ...})`, `deleteCustomer`
- settings: `updateSettings({shopName, address, phone, momoNumber, momoNetwork, taxRate, taxInclusive, receiptFooter, theme})`
- toast: `toast("msg", "ok"|"warn"|"error")`

**Derived business facts** (compute in components/memo):
- customer due: orders.filter(o => o.customerId===id && o.status!=="refunded").reduce((s,o)=>s+dueOf(o),0)
- todays sales: orders.filter(o => o.createdAt >= startOfDay(now) && o.status!=="refunded")
- use `useNow()` from lib/now.ts for "now" reads (purity-safe).
- Date helpers in lib/format: timeAgo/dateShort/dateTime/timeOf/isSameDay/startOfDay/addDays/orderId nextNo, balanceFrom

## Components (components/ui)

- Button {variant: primary|secondary|ghost|danger|soft, size: sm|md|lg, block, loading, icon} — IconButton extra
- Card {inset: divides rows}, CardTitle{right}
- Chip{active, color?} — filter chips row
- StatusPill{status} — PASSED STATUS STRING; map in components/ui/statuspill (statusTone)
- Input{label,hint,error,leading,trailing,money}, TextArea
- SearchBar{value,onChange,placeholder,onOpenScanner}
- Sheet{open,onClose,title,footer,height:"auto|tall|full"} — bottom sheet, uses anim
- NumberPad{onDigit(d), onDelete} — big readouts above handled by screens
- StatCard{label,value,icon,tone,delta}
- EmptyState{icon,title,hint,action}
- SegmentList / Segmented — filter strips
- Avatar{name,size} — auto initials+color
- Confirm{open,onClose,...,tone:"danger"}
- Toaster — global, never instantiate manually

Icons: lucide-react v1 tree, `size-[18px]` typical.

## Design language

See DESIGN.md (tokens, radii, list-row anatomy, CTA rules, do-not list). THE canonical QA:
`./node_modules/.bin/tsc --noEmit` && `./node_modules/.bin/eslint app components lib` — MUST PASS before claiming done.

## Capacitor

Android project copied & rebranded (appId gg.novapos.app, resources Nova POS). After editing web code:
`npm run build` then `./node_modules/.bin/cap sync android`.

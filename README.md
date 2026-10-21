# Nova POS

Offline-first point of sale for Ghanaian retail. Next.js 16 (static export) + Tailwind v4 + Capacitor 8 for Android. No server, no account — every sale, customer and product photo lives on the device.

## What it does

- **Register** — search, category filters, live stock, tap-to-add cart, per-line quantity, discounts, customer attach
- **Checkout** — cash / MoMo / card, split payments, change due, credit (part-paid) sales
- **Stock** — automatic decrement on sale, purchase/damage/return/count adjustments, full movement log
- **Customers** — saved customers with running balance and payment collection against credit sales
- **Reports** — sales per period, payment mix, top sellers, low stock
- **Product photos** — upload from the gallery or the camera; photos are resized, re-encoded as WebP and stored in IndexedDB, so the app works fully offline
- **Receipts** — a customer-facing receipt on screen, printable, and shareable/copyable
- **Tax** — optional rate, either added at checkout or already inside the price
- **Dark and light** themes

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 19, Next.js 16 static export, Tailwind v4 |
| State | Zustand + `persist` (localStorage key `nova-pos-v1`) |
| Photos | IndexedDB (`nova-pos-images`) + `idb:<uuid>` references |
| Platform | Capacitor 8 (Android, `gg.novapos.app`) |

## Develop

```bash
npm install
npm run dev            # http://localhost:3000
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # static export to out/
```

## Verify a build

```bash
npm run build
node serve-out.cjs                 # serves out/ on :4173
chromium-browser --headless=new --remote-debugging-port=9333 \
  --user-data-dir=/tmp/nova-chrome --no-sandbox --disable-dev-shm-usage about:blank &
node cdp-qa.cjs                    # walks every route, screenshots to design/qa/
```

`cdp-qa.cjs` fails the run on any console error, so a green QA pass means every route renders clean.

## Android build

Requires the Android SDK (platform 36 + build-tools 35) and a JDK 21.

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```

`android/local.properties` points at the SDK and is not committed.

## Data safety rules (do not break these)

- The persisted store is the shop's real ledger. **Never bump the persist `version` without a `migrate` function** — Zustand discards the stored state and the demo seed would overwrite a real register.
- The demo store is seeded **only when the localStorage key is absent**, never when the catalogue is merely empty.
- Never store image bytes (base64) in the persisted state: it blows the localStorage quota and would duplicate per sale. Photos live in IndexedDB and are referenced by id.
- Uploaded photos are pruned by reachability: a blob referenced by a past order line must survive the deletion of its product.

## Layout

```
app/          screens (*-screen.tsx) + route pages (app/<name>/page.tsx)
components/   ui/ primitives, shell/ (app chrome), receipt/
lib/          store, types, seed, money, format, now, image-store
design/       DESIGN.md (visual language) + QA screenshots
```

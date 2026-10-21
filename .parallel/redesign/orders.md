# Orders re-skin

- Changed: `app/orders-screen.tsx`, `app/order-detail-screen.tsx` only. Most logic untouched (filters, search, refund/payment/receipt flows, URL-driven filter).
- Applied home pattern: px-5 pt-4 wrapper, 26px title + 15px ink3 subtitle on orders, Card inset rows (px-4 py-3.5, 17px semibold / 14px ink3 / tabnum bold trailing), sections mt-3–mt-6, no uppercase labels ("Balance due", "Amount received" now sentence case), avatar-free walk-in rows, dot+Unpaid/Partial in text-warn, Paid/Refunded neutral ink3, dropped row Avatar + StatusPill in orders rows to match home; kept StatusPill + ScreenHeader in detail (shared chrome, back nav) — detail title stays 17px via ScreenHeader (blocked: out-of-scope component).
- Kept warn banner for balance due (warn/10 tint); RefundTrash icon, Confirm, Sheet, Segmented, NumberPad all intact.
- Verified: `tsc --noEmit` clean; `eslint app components lib` shows one pre-existing error in `app/reports-screen.tsx` (unused Button, parallel agent's file — ignored per instructions).

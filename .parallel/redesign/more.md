# More cluster re-skin report

- Files changed: app/more-screen.tsx, app/settings-screen.tsx, app/shopsettings-screen.tsx, app/reports-screen.tsx — all converted to home-screen skeleton (px-5 pt-4, 26px titles, sentence-case text-[15px] text-ink2 section labels, Card/Card-inset rows px-4 py-3.5, 17px/14px row type, ink3 chevrons); ScreenHeader/QuickTile/CardTitle dropped for inline headers + IconButton back rows.
- Accent: reports = green #047857 via text-accent/bg-accentsoft (hero delta-up, today's bar, top-product bars, cash mix segment; tokens already theme-aware, chart bars use var(--chart-bar/--chart-track)); more = neutral with green accent on Reports nav row only; settings/shopsettings neutral.
- Kept all features: JSON export + demo-store wipe Confirm, theme toggle, MoMo/tax/receipt/shop-details forms + save footers, all report charts/ranges/figures, low-stock links; removed more-screen FAB clearance.
- Blocked/notes: components/shell ScreenHeader untouched (sticky back bar replaced by inline large-title headers per canonical home pattern — flag if sticky back headers are wanted); lib/*, components/ui/* not edited; tsc + eslint pass clean.

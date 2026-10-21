# Inventory cluster re-skin
- Changed: app/inventory-screen.tsx (accent green, rows 17/14px, warn amber Low/Out badges, py-3.5 rows, px-5 pt-4), app/product-detail-screen.tsx (sentence-case labels, 17/14px move rows, accentsoft/danger tints), app/product-edit-screen.tsx (uppercase card labels → 15px medium ink2, Gen de-uppercased, px-5 pt-4), app/stock-screen.tsx (amber #9a3412: in-badge bg-warn/10 text-warn, danger kept for out, rows 17/14px).
- All features kept: stock adjust reasons, photo upload flow, search/filters, reason labels in history rows, edit/new.
- Blocked/shared: ScreenHeader, Button, Chip, EmptyState keep component accent (green); can't tint per-screen without editing components/ui — flagged, not edited.
- tsc --noEmit + eslint app components lib: both pass clean.

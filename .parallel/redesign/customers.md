# Customers & Categories re-skin — report

**Files changed:** app/customers-screen.tsx, app/customer-detail-screen.tsx, app/categories-screen.tsx (home-screen canonical pattern copied: px-5 pt-4 skeleton, 26px title/15px ink3 subtitle, 15px ink2 sentence-case section labels, Card inset rows at px-4 py-3.5, 17px/ink row titles, tabnum trailing values). No lib/components edits.

**Accents:** customers + customer-detail → violet (`bg-violet text-accentink` FAB, `bg-violet/10 text-violet` receipt icon wells); categories → info (`ring-2 ring-info` active color-picker swatch). Dues: text-warn when >0, ink3 when 0; removed bg-danger due pills, uppercase micro-labels, and StatCell danger→warn.

**Kept intact:** add/edit/delete customer sheets, due totals, collect-payment sheet + NumberPad, category CRUD + custom-hex support (hueColor fallback), delete guard toast, React purity (useNow only).

**Notes:** `*-soft` vars exist in globals.css but aren't Tailwind color tokens, so soft tints use `/10`/`/14` alpha modifiers (existing precedent: pay-screen, quicktile); FAB ink reuses `text-accentink` (theme-aware, AA on violet in both themes) since a violet-specific solid-ink token doesn't exist. ScreenHeader kept on detail/categories pages for back-nav; no shared-component blockers.

**Verify:** tsc --noEmit ✅, eslint app components lib ✅ (zero errors).

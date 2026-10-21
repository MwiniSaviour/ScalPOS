# Orders date filter (phase 2) — done
- app/orders-screen.tsx only: preset chips (Today/Yesterday/7 days/30 days/All time/Custom…) + custom sheet with native From/To date inputs, Apply/Reset, inline `from > to` error blocking Apply; the list filters only after Apply.
- Period is URL state (`?period=7d&from=YYYY-MM-DD&to=YYYY-MM-DD`; push for period, replace for the status filter) → shareable links, back/forward restores the previous view, survives leaving the page and coming back.
- Count line `N orders · ₵X total · <period label>` (refunded counts in N, not in ₵X); empty states name the real culprit by relaxing each knob in turn (search vs period vs filter).
- Fixed two bugs testing caught: `Today` fell through to the 30-day window, and first paint flashed the whole year before `useNow()` ticked (list now waits for the clock). Verified: tsc + eslint clean, 32/32 headless-Chromium checks on the static export, no console errors.

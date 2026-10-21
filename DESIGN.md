# Nova POS — Visual & Component Language

Deep-charcoal fintech aesthetic, Ghana cedi (₵). Copy tone: plain, warm, exact. No lorem, no half-states.

## Tokens (app/globals.css `@theme inline`)
- Surfaces: `bg-bg` screen, `bg-surface` cards, `bg-surface2` inputs/secondary, `bg-surface3` pressed
- Lines: `border-line` (hairline), `border-line2` (inputs)
- Ink: `text-ink` primary, `text-ink2` secondary, `text-ink3` tertiary, `text-ink4` disabled
- Accent: `bg-accent text-accentink` (emerald CTA, dark text on light accent), `text-accent` links
- Semantic: info/warn/danger/violet/gold with `/10` soft bg variants
- Radii: inputs `rounded-xl`, cards `rounded-2xl`, sheets `rounded-t-[28px]`, chips `rounded-full`

## Rules
1. Money ALWAYS `tabnum` + `fmtMoney()` from lib/money. Never hardcode ₵.
2. Touch targets ≥ 44px; primary actions in bottom third; lists are tappable rows with chevrons only for drill-in.
3. One primary button per view. `Button variant="primary" block` for the bottom CTA.
4. Empty states always actionable (EmptyState + one Button).
5. Currency deltas use lucide icons (`ArrowUpRight`/`ArrowDownRight` at `size-3.5/4`). **No emoji anywhere in UI.** Product art = `ProductArt` (photo or monogram tile, components/ui/productart.tsx). Category identity = color dot (`Category.color`), never an icon.
6. Money delta tone: up=accent, down=danger, flat=ink3.
7. Status vocabulary (StatusPill): pending/completed/refunded/unpaid/paid/partial/low/out.
8. Screen = `anim-fade` on root section; sheets have `Sheet` component; popovers via `Sheet height="auto"` too (bottom sheets, not dialogs).
9. Every list screen needs: search (SearchBar), optional filter chips (Chip row), empty state, and content in `Card inset` rows.
10. Page padding: content `px-4 pt-2 pb-28` (TabBar clearance lives in AppShell, TabBar only on `/`, `/orders`, `/inventory`, `/more`). Screens WITH their own bottom bar (sell/pay/detail flows — no TabBar there) own it: `fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-line px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]`, and give the content roughly `pb-32`–`pb-40`.
11. Horizontal chip/filter strips: wrap in `.edge-fade no-scrollbar -mx-4 overflow-x-auto px-4`.
12. Product/category imagery: real photos in `public/products/*.jpg` referenced via `Product.imageUrl`; never emoji glyphs; monogram fallback is automatic on load error.
13. Product photos are **uploaded, not linked**: the Photo card in product-edit offers `Choose photo` (gallery) and `Take photo` (camera) as primary actions; an image link is the optional fallback behind "Use an image link instead". Uploads are downscaled to ≤512px and re-encoded as WebP, then stored as Blobs in IndexedDB (`lib/image-store.ts`); `Product.imageUrl` holds an `idb:<uuid>` reference. `ProductArt` resolves it to an object URL. Never put base64 in the persisted store — it would blow the localStorage quota and duplicate per sale.
14. Quick-action icons (Home, More): a tinted rounded-square tile with a lucide icon and a single centred label underneath, each tile in its own hue (green/blue/violet/amber). Labels must never truncate — shorten the word instead ("Stock", not "Stock log").
13. FABs (inventory/customers): `fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] size-14 rounded-2xl bg-accent text-accentink shadow-float`. Only one FAB per screen; it must not duplicate a tile destination..

## Screen header pattern
`ScreenHeader` (components/shell): onBack, title, right actions (IconButtons). Non-tab screens always onBack. Subnav-like pages get big title variant.

## Money display scale
- Primary CTA figures: text-[22px]–[30px] font-bold/extrabold tabnum
- List row amount: text-[15px] font-bold
- Micro labels: text-[12px] uppercase tracking-[.06em] text-ink3

## Form patterns
- Field = Input/TextArea with label above, hint below, error text-danger
- Sticky footer: Cancel (secondary) + Save (primary, block) side by side in 2-col grid
- Never block Save silently — show field errors on blur & submit
- Numeric keypad screens (NumberPad) show a large tabnum readout above

## Do NOT
- No ad-hoc hex colors in screens, no inline lambdas for classes, no global margin/padding hacks
- No fixed pixel dvh heights w/o sticky positioning
- Don't import store internals (products arrays direct) — always via usePos selectors
- Use perm: components/ui/* are the ONLY primitive source (don't make local button/card/pill duplicates)

# Onboarding — report

## Files created
- `components/brand/onboard-art.tsx` — `ArtSell` / `ArtTrack` / `ArtGrow` inline SVGs (viewBox 0 0 340 250). Black-ink spot-illustration style: token classes only (`fill-ink`, `stroke-ink`, `fill-surface stroke-ink` panels, `stroke-ink3` dashed dot-chain swooshes, `fill-accent` accents). Shared character recipe per art (ink hair cap, surface face, ink torso rx13, ink leg strokes + shoe ellipses, 10px round-cap arms) with varied poses. ₵ coin is `<text>` fill-ink. No gradients, no external images, all geometry inside 340×250.
- `lib/first-run.ts` — `hasOnboarded()` / `markOnboarded()` on localStorage key `nova-pos-onboarded`, SSR/parse-safe.
- `app/onboarding-screen.tsx` — `"use client"` 3-slide pager: h-dvh bg screen, snap-x mandatory scroll container (`no-scrollbar overscroll-x-contain scroll-smooth`), per-slide `safe-t` + art flex-1 + dots row + white card. Dots are buttons (`aria-label="Go to slide N"`, active `bg-accent` pill / inactive `bg-ink4/40` dot) scrolling the container. Index from onScroll (clientWidth guarded). Next → scrollBy clientWidth; "Get started"/"Skip" → `markOnboarded()` + `router.replace("/auth")`. Copy as specified.
- `app/onboarding/page.tsx` — Suspense wrapper page, same pattern as `app/orders/page.tsx`, imports `../onboarding-screen`.

## Files edited
- `app/home-screen.tsx` — imports only: added `useEffect` to the react import, added `useRouter` (next/navigation) and `hasOnboarded`; hooks block gained `const router = useRouter()` + the specified redirect useEffect. No other changes.
- `app/more-screen.tsx` — one `RowLink` appended to the Browse card (href `/onboarding`, `RotateCcw` icon, "Replay intro" / "The welcome screens") matching existing row markup; added `RotateCcw` to the lucide import.

## Verification
`(tsc --noEmit && eslint app components lib)` — both passed with zero output (clean).

## Deviations / notes
- Spec said root `<div className="... bg-app">`; that token doesn't exist in this codebase — the screen token is `bg-bg` (as used by every other screen). Used `bg-bg`.
- `router.replace("/auth")` per spec; `/auth` route not present yet (parallel agent owns it), so the redirect will resolve once that lands.
- Card classes combined the two required specs (`mx-0 mb-2 … p-5 text-center` per-slide inside the section, no extra wrapper).
- No git commands run; `.parallel/onboard/` created only for this report.

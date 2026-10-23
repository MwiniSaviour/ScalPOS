# Insets / avatar / overflow fix — report

## Files changed

- `capacitor.config.ts` — added `plugins.SystemBars.insetsHandling: "native"`. Deterministic mode: plugin pads the webview itself with real insets and injects `--safe-area-inset-*` = 0px, so `--nova-sat` collapses to a single displacement (env() consumed by the native padding). No change to the globals.css `--nova-sat` chain (stays correct for desktop browsers).
- `app/home-screen.tsx` — home header account Link now renders `<StaffAvatar staff={me} size={40} />` (imported from `./account-screen`, same reuse as staff-screen.tsx) when `useCurrentStaff()` returns a member; the old CircleUserRound placeholder span remains as the no-staff fallback. Uploaded profile photos now appear on the home header.
- `app/globals.css` — `.safe-t { padding-top: min(var(--nova-sat), 64px); }` safety clamp.

## CDP findings (412×915 @ dsf 2.125, headless chromium vs http://127.0.0.1:4173)

- True overflow probe: `/`, `/inventory/`, `/more/` all report `scrollWidth == clientWidth == 412` (overflow 0, innerWidth 412). **No DOM element extends past the client edge — NO true horizontal overflow source exists at ~412dp.** No min-w-0 / overflow-hidden / max-w-full fixes were needed.
- Case that held: the clipped look on the device is the huge injected inset var displacing content (WebContents padding + CSS var both applied in "css" mode; portrait/left-right edge cases can push the centered `px-5` container into the clipped zone). Fix = the deterministic `insetsHandling: "native"` config + the `.safe-t` clamp.
- Injected-var sanity check: set `--safe-area-inset-top: 120px` / `--safe-area-inset-bottom: 60px` on documentElement → `--nova-sat` resolves to `max(0px, 120px)` = 120px, `.safe-t` computed padding-top exactly 120px (applied once, not doubled), no pathological scroll growth (scrollWidth stayed 412). `/more` header top landed at expected 136px (120 inset + 16 pt-4). Clamp now bounds worst case at 64px.

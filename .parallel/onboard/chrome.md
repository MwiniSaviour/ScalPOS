# Nova POS — dark-mode system-chrome fix report (chrome agent)

## Files changed

### 1. `android/app/src/main/res/values/colors.xml` — NEW
Added `<color name="nova_window_bg">#0A0E17</color>` plus a short factual
comment explaining why the background is fixed at resource level (SystemBars
setStyle() repaints from the theme attr; DayNight resolves white in device-light).

### 2. `android/app/src/main/res/values/styles.xml` — append inside `AppTheme.NoActionBar`
Added (existing items untouched):
```xml
<item name="android:windowBackground">@color/nova_window_bg</item>
```
This kills the white repaint behind the status bar: both Capacitor's startup
`initSystemBars` (style DEFAULT) and any JS `SystemBars.setStyle()` now repaint
from a fixed dark `windowBackground` instead of `Theme.AppCompat.DayNight`
resolving white when the device night mode is light.

### 3. `android/app/src/main/java/gg/novapos/app/AppChromePlugin.java` — hardened
`setBarBackgroundColor` now takes three independently try/catch(RuntimeException)
guarded steps inside the same `runOnUiThread`, with `call.resolve()` exactly once at
the end:
1. `decorView.setBackgroundColor(...)` (existing paint)
2. `window.setStatusBarColor(...)` (pre-API-35 path; ignored on 35+, fine) +
   `window.setStatusBarContrastEnforced(false)` when `SDK_INT >= Q`
3. `window.setNavigationBarContrastEnforced(false)` when `SDK_INT >= Q` (existing)

### 4. `components/shell/appshell.tsx` — ChromeGate re-merge + pad
- Merged the two `[theme]` effects into ONE deterministic effect:
  (a) sync `dataset.theme` / `colorScheme` / both `meta[name=theme-color]`,
  (b) `await import("@capacitor/core")` → `SystemBars.setStyle(...)` in try/catch,
      only when `Capacitor.isNativePlatform()` — icons now follow the app theme,
  (c) THEN `applyBarColor(barColor).catch(()=>{})` — last, so our paint ends the
      window instead of Capacitor's `windowBackground` repaint from (b).
  Early-returns kept for SSR/non-native; `cancelled` guard re-checked before
  both (b)→(c) handoff and paint; web/public build still cannot throw.
- Comment block updated to state paint-after-setStyle ordering rationale.
  AppShell page pad: `pb-[calc(var(--nova-sab)+164px)]` →
  `pb-[calc(var(--nova-sab)+136px)]` (matches the now-shorter strip).

### 5. `components/shell/tabbar.tsx` — strip tightened
Strip height `max(var(--nova-sab), 8px)` → `max(calc(var(--nova-sab) - 28px), 8px)`
inside the fixed nav; labels now sit close above the system buttons instead of a
tall empty dark band. Comment updated. BarcodeScanner footer untouched.

## Verification

### tsc + eslint
- `eslint components/shell/appshell.tsx components/shell/tabbar.tsx` → PASS.
- Full `tsc --noEmit` currently reports 2 errors **in `app/connect-screen.tsx`**
  (TS2304 `Connection`, lines 26/112) — a file owned by the parallel onboarding
  agent and not touched here. No errors from any chrome-agent file.

### Java/XML syntax
Both XML files parse clean (ElementTree). Java braces balanced,
`call.resolve()` appears exactly once, both `*ContrastEnforced` guards present.
Gradle not run (per instructions — parent will build).

### CDP check (headless chromium :9333 → :4173)
- `out/` build is STALE (predates these edits). Measured against sab=48px:
  - strip height: **48px** (old `max(sab,8)`) — not 20px
  - page pad bottom: **212px** (old `sab+164`) — not 184px
  - `.safe-t` pad top: **36px** ✓ (unchanged class, so passes in both builds)
  The two mismatches are exactly the old-build values; code will produce 20px /
  184px after the parent rebuilds. No code "fixed" to hit test numbers.
- Cleanup verified: after removing the injected `--safe-area-inset-*` props the
  page returns to its persisted state (profile has `nova-pos-theme=light`,
  html bg `#eef1f6` = light `--bg` token). Forcing `dataset.theme="dark"` and
  reading back yields `rgb(10, 14, 23)` = `#0a0e17` dark `--bg` token ✓, then
  dataset restored to light — helpers left no residue beyond their own toggles.

## Not touched (parallel agents' scope)
onboarding/auth/home/more/sell screens, `app/globals.css` (needed no tweak),
`lib/appchrome.ts`, barcode scanner, all other app screens.

# Bluetooth thermal receipt printing — team report

## Files changed

- `android/app/src/main/java/gg/novapos/app/BluetoothPrintPlugin.java` — new native plugin (Java, no comments), methods `listPaired` / `print` + `@PermissionCallback` flow.
- `android/app/src/main/java/gg/novapos/app/MainActivity.java` — added `registerPlugin(BluetoothPrintPlugin.class);` right after the AppChromePlugin registration (same precedent pattern, before `super.onCreate`).
- `android/app/src/main/AndroidManifest.xml` — added 4 uses-permission entries below INTERNET; nothing removed.
- `lib/bluetooth.ts` — new TS bridge: `registerPlugin("BluetoothPrint")` with web fallback throwing "Bluetooth printing is available in the Android app"; `bluetoothAvailable`, `listPaired`, `printRaw` (chunked btoa base64), `getSavedPrinter/savePrinter/clearSavedPrinter` on localStorage key `nova-pos-printer`. No store settings schema touched.
- `lib/escpos-print.ts` — new pure ESC/POS builder `receiptToEscposBytes(ReceiptPrintData)`: 32-col layout, ESC @ init, ESC a 1 centering, ESC ! 0x30 doubled title/total, ESC E emphasis REFUNDED badge, LF x3 feed, `GS V 66 0` cut, ₵→"GHS ", non-ASCII map/drop.
- `components/receipt/receipt.tsx` — native Bluetooth flow; web `window.print()` path byte-identical to before; existing PRINT_CSS/print-only container untouched; added exported `receiptToPrintData(order, settings)` that maps the exact rendered fields.

## Permission annotation choice

Mirrored how @capacitor core plugins declare permissions — verified against the concrete sources in this checkout: `node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/annotation/{CapacitorPlugin,Permission,PermissionCallback}.java` and `Bridge.java:1167 validatePermissions` / `Plugin.java:112-145` (launcher registration + `requestAllPermissions(call, alias)` → saved call re-invoked via the callback method). Declaration used:

```java
@CapacitorPlugin(name = "BluetoothPrint",
    permissions = { @Permission(strings = { Manifest.permission.BLUETOOTH_CONNECT }, alias = "bluetoothPrint") })
```

Flow: `listPaired`/`print` check `ACTIVITYCompat checkSelfPermission(BLUETOOTH_CONNECT)` (skipped below API 31 — legacy BLUETOOTH/BLUETOOTH_ADMIN in the manifest covers ≤30); not granted → store pending action (list, or print's address+data) → `requestAllPermissions(call, callbackName)` → callback re-checks; granted → re-run pending, denied → `call.reject("permission", …)` so the TS layer toasts the raw message. Runtime permission prompt happens in-app; no `@PermissionCallback` alias-arg needed (Capacitor 8's annotation takes no attributes).

## Re-print flow

1. Receipt sheet open → Print tapped (`data-testid="print-bt"`, Button `loading` while busy).
2. Native: `getSavedPrinter()` from `nova-pos-printer` localStorage. Saved → build bytes via `receiptToEscposBytes(receiptToPrintData(order, settings))` → `printRaw(address)` → toast "Receipt sent to printer". Connect failure → toast "Couldn't reach <name> — make sure the printer is on/paired" (error tone).
3. Not saved → "Choose printer" Sheet with `listPaired()` rows (`data-testid="printer-row"`, name + address); picking one saves it and immediately prints. Bluetooth off ⇒ plugin resolves `{enabled:false, devices:[]}` → "No paired Bluetooth printers found" warn. Permission prompt rejection → raw plugin error toast.
4. While a printer is saved, the Receipt sheet footer shows a small danger-ghost row "Disconnect printer (<name>)" → `clearSavedPrinter()`; next Print reopens the picker. This is the only way to re-select a printer (no long-press).
5. Web (non-native): untouched `window.print()` path, exactly as before. Share/clipboard behavior untouched.

## Orchestrator must verify on device

- Pair the thermal printer in Android Settings → Bluetooth BEFORE first print (pairing in-app is not implemented; only bonded devices are listed).
- First print triggers the BLUETOOTH_CONNECT runtime prompt (API 31+); dismissal is recoverable by retrying Print.
- Confirm prints: 58mm paper, shop name double-size centered, left/right columns hit exactly 32 chars (verified in a byte-level offline render), cut at end.
- Some cheap SPP printers need the printer ON with paper before connect; failure surfaces the "Couldn't reach" toast.
- `npm run build` + `cap sync android` + gradle assembleDebug still required centrally (not run here per instructions).

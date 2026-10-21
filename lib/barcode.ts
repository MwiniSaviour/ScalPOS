import { Capacitor } from "@capacitor/core";
import type { BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";
import { createElement } from "react";
import { usePos } from "@/lib/store";

/**
 * Scan a barcode with the platform's best available path.
 *
 * Native (Android/iOS): the MLKit ready-to-use scan screen (Google Barcode
 * Scanner module — needs no camera permission on Android). If the module is
 * missing, falls back to the in-WebView camera overlay.
 *
 * Web: ZXing camera overlay with a live preview and a cancel button.
 *
 * Resolves with the barcode value, or null when the scan was cancelled,
 * denied, or unavailable (a toast explains what happened).
 */
export async function scanBarcode(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return scanWithWeb();
  return scanWithMlkit();
}

const toast = (msg: string, kind?: "ok" | "warn" | "error") =>
  usePos.getState().toast(msg, kind);

async function scanWithMlkit(): Promise<string | null> {
  try {
    const { BarcodeScanner, BarcodeFormat: F } = await import(
      "@capacitor-mlkit/barcode-scanning"
    );
    const { supported } = await BarcodeScanner.isSupported();
    if (!supported) {
      toast("No camera available on this device", "error");
      return null;
    }
    // Android's scan() runs through the Google Barcode Scanner module
    // (no camera permission); iOS needs explicit camera permission.
    if (Capacitor.getPlatform() === "android") {
      const { available } =
        await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!available) return scanWithWeb();
    } else {
      const { camera } =
        (await BarcodeScanner.checkPermissions()) as { camera: string };
      if (camera !== "granted") {
        const again = (await BarcodeScanner.requestPermissions()) as {
          camera: string;
        };
        if (again.camera !== "granted") {
          toast("Camera permission is needed to scan", "warn");
          return null;
        }
      }
    }
    const { barcodes } = await BarcodeScanner.scan({
      formats: [
        F.Code128,
        F.Code39,
        F.Ean13,
        F.Ean8,
        F.UpcA,
        F.UpcE,
        F.QrCode,
      ] as BarcodeFormat[],
    });
    const first = barcodes[0];
    const value = (first?.rawValue ?? first?.displayValue ?? "").trim();
    return value.length > 0 ? value : null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/cancel|dismiss|abort/i.test(msg)) return null;
    toast("Scanner could not start", "error");
    return null;
  }
}

async function scanWithWeb(): Promise<string | null> {
  try {
    const [{ createRoot }, { default: BarcodeScannerOverlay }] =
      await Promise.all([
        import("react-dom/client"),
        import("@/components/ui/barcode-scanner"),
      ]);
    const host = document.createElement("div");
    document.body.appendChild(host);
    return await new Promise<string | null>((resolve) => {
      const root = createRoot(host);
      let done = false;
      const finish = (value: string | null) => {
        if (done) return;
        done = true;
        window.clearTimeout(guard);
        window.setTimeout(() => {
          root.unmount();
          host.remove();
        }, 0);
        resolve(value);
      };
      // fail-safe: never leave a stuck overlay open
      const guard = window.setTimeout(
        () => finish(null),
        2 * 60 * 1000,
      );
      root.render(createElement(BarcodeScannerOverlay, { onResult: finish }));
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    toast(/permission|denied|notallowed/i.test(msg)
      ? "Camera permission is needed to scan"
      : "Scanner could not start", "error");
    return null;
  }
}

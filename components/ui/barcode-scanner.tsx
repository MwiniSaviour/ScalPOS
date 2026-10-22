"use client";

import { cn } from "@/lib/ui";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Full-screen in-WebView camera overlay used by the web scan path
 * (and as a fallback when the native Google scanning module is missing).
 * Rendered imperatively by lib/barcode.ts — resolves onResult exactly once:
 * the decoded value, or null on cancel / camera failure.
 */
export default function BarcodeScannerOverlay({
  onResult,
}: {
  onResult: (value: string | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<"loading" | "active" | "failed">("loading");
  const [failedMsg, setFailedMsg] = useState("");

  useEffect(() => {
    return () => {
      stopRef.current?.();
      stopRef.current = null;
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        const zxing = await import("@zxing/browser");
        const lib = await import("@zxing/library");
        const hints = new Map<number, unknown>();
        hints.set(lib.DecodeHintType.POSSIBLE_FORMATS, [
          lib.BarcodeFormat.CODE_128,
          lib.BarcodeFormat.CODE_39,
          lib.BarcodeFormat.EAN_13,
          lib.BarcodeFormat.EAN_8,
          lib.BarcodeFormat.UPC_A,
          lib.BarcodeFormat.UPC_E,
          lib.BarcodeFormat.QR_CODE,
        ]);
        const reader = new zxing.BrowserMultiFormatReader(
          hints as never,
          { delayBetweenScanAttempts: 120 },
        );
        if (disposed || !videoRef.current) return;
        const controls = await reader.decodeFromVideoDevice(
          undefined, // default (usually rear) camera
          videoRef.current,
          (result, _error, ctrl) => {
            stopRef.current = () => ctrl.stop();
            if (!result) return; // per-frame NotFoundException — ignore
            const text = result.getText().trim();
            if (text.length > 0) {
              ctrl.stop();
              onResult(text);
            }
          },
        );
        if (disposed) {
          controls.stop();
          return;
        }
        stopRef.current = () => controls.stop();
        setStatus("active");
      } catch (err) {
        if (disposed) return;
        stopRef.current?.();
        stopRef.current = null;
        const msg = err instanceof Error ? err.message : String(err);
        setStatus("failed");
        setFailedMsg(/permission|denied|notallowed/i.test(msg)
          ? "Camera access was denied. Allow it, then try again."
          : "No camera is available on this device.");
      }
    })();
    return () => {
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg"
      role="dialog"
      aria-modal="true"
      aria-label="Scan barcode"
    >
      <div className="safe-t" />
      <div className="flex h-14 shrink-0 items-center justify-between px-2">
        <span className="pl-3 text-[17px] font-bold tracking-[-0.02em] text-ink">
          Scan barcode
        </span>
        <button
          aria-label="Close scanner"
          onClick={() => onResult(null)}
          className="press mr-2 flex size-10 items-center justify-center rounded-full text-ink2 hover:bg-surface2 hover:text-ink"
        >
          <X className="size-[20px]" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/90">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={cn("h-full w-full object-cover", status !== "active" && "hidden")}
        />
        {status === "active" && (
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-accent/70" />
        )}
        {status === "loading" && (
          <p className="px-8 text-[14px] font-medium text-white/70">
            Starting camera…
          </p>
        )}
        {status === "failed" && (
          <div className="max-w-[280px] px-6 text-center">
            <p className="text-[15px] font-semibold text-white">{failedMsg}</p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line2 bg-bg px-5 pb-[max(var(--nova-sab),12px)] pt-3">
        <button
          onClick={() => onResult(null)}
          className="press h-12 w-full rounded-xl border border-line2 bg-surface2 text-[15px] font-semibold text-ink hover:bg-surface3"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

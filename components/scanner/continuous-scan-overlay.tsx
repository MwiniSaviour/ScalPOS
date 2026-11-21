"use client";

import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/ui";
import { Check, CircleAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ScanEntry = {
  code: string;
  label: string;
  status: "added" | "missing" | "stock" | "sent";
  at: number;
};

export default function ContinuousScanOverlay({
  entries,
  onCode,
  onClose,
}: {
  entries: ScanEntry[];
  onCode: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [status, setStatus] = useState<"loading" | "active" | "failed">("loading");
  const [failedMsg, setFailedMsg] = useState("");

  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const { BarcodeScanner } = await import("@capacitor-mlkit/barcode-scanning");
          const perm = await BarcodeScanner.checkPermissions();
          if (perm.camera !== "granted") {
            const again = await BarcodeScanner.requestPermissions();
            if (again.camera !== "granted") {
              setStatus("failed");
              setFailedMsg("Camera access was denied. Allow it, then try again.");
              return;
            }
          }
        }
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
        const reader = new zxing.BrowserMultiFormatReader(hints as never, {
          delayBetweenScanAttempts: 120,
        });
        if (disposed || !videoRef.current) return;
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (!result) return;
            const text = result.getText().trim();
            if (!text) return;
            const now = Date.now();
            if (text === lastRef.current.code && now - lastRef.current.at < 1500) return;
            if (now - lastRef.current.at < 250) return;
            lastRef.current = { code: text, at: now };
            onCode(text);
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
        const msg = err instanceof Error ? err.message : String(err);
        setStatus("failed");
        setFailedMsg(
          /permission|denied|notallowed/i.test(msg)
            ? "Camera access was denied. Allow it, then try again."
            : "No camera is available on this device.",
        );
      }
    })();
    return () => {
      disposed = true;
      stopRef.current?.();
      stopRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg"
      role="dialog"
      aria-modal="true"
      aria-label="Scan products"
    >
      <div className="safe-t" />
      <div className="flex h-14 shrink-0 items-center justify-between px-2">
        <span className="pl-3 text-[17px] font-bold tracking-[-0.02em] text-ink">
          Scan products
        </span>
        <button
          aria-label="Close scanner"
          onClick={onClose}
          className="press mr-2 flex size-10 items-center justify-center rounded-full text-ink2 hover:bg-surface2 hover:text-ink"
        >
          <X className="size-[20px]" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-black/90">
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
          <p className="absolute inset-0 flex items-center justify-center px-8 text-[14px] font-medium text-white/70">
            Starting camera…
          </p>
        )}
        {status === "failed" && (
          <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-[15px] font-semibold text-white">
            {failedMsg}
          </p>
        )}
      </div>

      <div className="max-h-[34vh] shrink-0 overflow-y-auto border-t border-line2 bg-bg px-5 pb-[max(var(--nova-sab),12px)] pt-3">
        <p className="mb-2 text-[13px] font-medium text-ink2">
          {entries.length === 0
            ? "Scanned items appear here"
            : `${entries.length} scanned — camera stays on`}
        </p>
        {entries.length === 0 ? (
          <p className="text-[13px] text-ink3">
            Point the camera at a barcode. Keep scanning to add more items.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((entry, i) => (
              <li
                key={`${entry.at}-${i}`}
                className="flex items-center gap-2 rounded-xl bg-surface2 px-3 py-2"
              >
                {entry.status === "added" || entry.status === "sent" ? (
                  <Check className="size-[16px] shrink-0 text-accent" />
                ) : (
                  <CircleAlert className="size-[16px] shrink-0 text-warn" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ink">
                    {entry.label}
                  </span>
                  <span className="block truncate text-[12px] text-ink3">{entry.code}</span>
                </span>
                <span className="shrink-0 text-[12px] font-semibold text-ink3">
                  {entry.status === "added"
                    ? "Added"
                    : entry.status === "sent"
                      ? "Sent"
                      : entry.status === "stock"
                        ? "No stock"
                        : "Not found"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={onClose}
          className="press mt-3 h-12 w-full rounded-xl bg-accent text-[15px] font-semibold text-accentink"
        >
          Done
        </button>
      </div>
    </div>
  );
}

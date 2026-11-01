"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Camera, CameraOff, Scan, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onError?: (error: string) => void
  autoStart?: boolean
  fps?: number
  className?: string
}

type ScanError = {
  name?: string
  message?: string
}

export function BarcodeScanner({
  onScan,
  onError,
  autoStart = true,
  fps = 10,
  className,
}: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasCamera, setHasCamera] = useState(true)
  const [permissionError, setPermissionError] = useState(false)
  const [manualInput, setManualInput] = useState("")
  const containerId = "barcode-scanner-container"
  const lastScanRef = useRef(0)
  const mountedRef = useRef(true)

  const stopScanner = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop()
      } catch {}
      if (mountedRef.current) {
        setIsScanning(false)
      }
    }
  }, [])

  const startScanner = useCallback(async () => {
    if (!scannerRef.current) return

    try {
      const cameras = await Html5Qrcode.getCameras()
      if (!mountedRef.current) return
      if (cameras.length === 0) {
        setHasCamera(false)
        return
      }

      const backCamera = cameras.find(
        (c) => c.label.toLowerCase().includes("back") || c.label.toLowerCase().includes("environment")
      ) || cameras[0]

      await scannerRef.current.start(
        { deviceId: { exact: backCamera.id } },
        { fps, qrbox: { width: 280, height: 120 } },
        (decodedText) => {
          const now = Date.now()
          if (now - lastScanRef.current > 2000) {
            lastScanRef.current = now
            onScan(decodedText)
          }
        },
        () => {}
      )
      if (mountedRef.current) {
        setIsScanning(true)
        setPermissionError(false)
      }
    } catch (err) {
      if (!mountedRef.current) return
      const scanErr = err as ScanError
      if (scanErr?.name === "NotAllowedError" || scanErr?.message?.includes("permission")) {
        setPermissionError(true)
        onError?.("Camera permission denied")
      } else {
        setHasCamera(false)
        onError?.("Camera not available")
      }
    }
  }, [fps, onScan, onError])

  useEffect(() => {
    mountedRef.current = true
    scannerRef.current = new Html5Qrcode(containerId)

    return () => {
      mountedRef.current = false
      stopScanner()
      scannerRef.current = null
    }
  }, [stopScanner])

  useEffect(() => {
    if (autoStart) {
      const timer = setTimeout(() => startScanner(), 100)
      return () => clearTimeout(timer)
    }
  }, [autoStart, startScanner])

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (manualInput.trim()) {
      onScan(manualInput.trim())
      setManualInput("")
    }
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-black">
        {hasCamera ? (
          <>
            <div id={containerId} className="w-full" />
            {!isScanning && !permissionError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <button
                  onClick={startScanner}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  <Camera size={18} />
                  Start Camera
                </button>
              </div>
            )}
            {permissionError && (
              <div className="flex h-64 flex-col items-center justify-center gap-3 bg-black/60 p-6 text-center">
                <AlertCircle size={32} className="text-danger" />
                <p className="text-sm text-muted">Camera access denied</p>
                <p className="text-xs text-muted">
                  Please allow camera access in your browser settings
                </p>
              </div>
            )}
            {isScanning && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-30 w-64 rounded-lg border-2 border-primary/60" />
                </div>
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-48 -translate-x-1/2 animate-pulse rounded-full bg-primary/40" />
              </>
            )}
          </>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-3 bg-black/60 p-6 text-center">
            <CameraOff size={32} className="text-muted" />
            <p className="text-sm text-muted">No camera detected</p>
            <p className="text-xs text-muted">Enter barcode manually below</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex w-full max-w-md items-center gap-2">
        <Scan size={16} className="shrink-0 text-muted" />
        <form onSubmit={handleManualSubmit} className="flex flex-1 gap-2">
          <input
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Or enter barcode manually..."
            className="input-field flex-1 text-sm"
          />
          <button
            type="submit"
            disabled={!manualInput.trim()}
            className="btn-primary shrink-0 text-xs"
          >
            Lookup
          </button>
        </form>
      </div>

      {isScanning && (
        <button
          onClick={stopScanner}
          className="mt-3 flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          <CameraOff size={16} />
          Stop Scanner
        </button>
      )}
    </div>
  )
}

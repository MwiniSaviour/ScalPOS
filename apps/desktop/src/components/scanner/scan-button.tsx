"use client"

import { Scan } from "lucide-react"

interface ScanButtonProps {
  onClick: () => void
  scanning?: boolean
}

export function ScanButton({ onClick, scanning }: ScanButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl active:scale-95"
      title={scanning ? "Scanner active" : "Open scanner"}
    >
      <Scan size={24} className={scanning ? "animate-pulse" : ""} />
    </button>
  )
}

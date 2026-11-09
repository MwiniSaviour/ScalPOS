"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const FAB_POS_KEY = "nova-pos-fab-pos-v1"

function loadPos(clamp: (x: number, y: number) => { x: number; y: number }): { x: number; y: number } {
  try {
    const raw = JSON.parse(window.localStorage.getItem(FAB_POS_KEY) ?? "null") as { x: number; y: number } | null
    if (raw && typeof raw.x === "number" && typeof raw.y === "number") {
      const next = clamp(raw.x, raw.y)
      if (next.x !== raw.x || next.y !== raw.y) window.localStorage.setItem(FAB_POS_KEY, JSON.stringify(next))
      return next
    }
  } catch {}
  return { x: 16, y: 16 }
}

export function NewSaleFab() {
  const router = useRouter()
  const pathname = usePathname()
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null)
  const fabRef = useRef<HTMLDivElement | null>(null)

  const clamp = useCallback((x: number, y: number) => {
    const w = fabRef.current?.offsetWidth ?? 56
    const h = fabRef.current?.offsetHeight ?? 56
    const maxX = Math.max(0, window.innerWidth - w)
    const maxY = Math.max(0, window.innerHeight - h)
    return {
      x: Math.min(Math.max(x, 0), maxX),
      y: Math.min(Math.max(y, 0), maxY),
    }
  }, [])

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setPos(loadPos(clamp)))
    const onResize = () => setPos((p) => (p ? clamp(p.x, p.y) : p))
    window.addEventListener("resize", onResize)
    return () => {
      window.cancelAnimationFrame(id)
      window.removeEventListener("resize", onResize)
    }
  }, [clamp])

  const savePos = (x: number, y: number) => {
    window.localStorage.setItem(FAB_POS_KEY, JSON.stringify({ x, y }))
  }

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: e.clientX - pos.x,
      baseY: e.clientY - pos.y,
      moved: false,
    }
    setDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current
    if (!d) return
    if (Math.abs(e.clientX - d.startX) > 4 || Math.abs(e.clientY - d.startY) > 4) d.moved = true
    if (d.moved) setPos(clamp(e.clientX - d.baseX, e.clientY - d.baseY))
  }

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current
    dragRef.current = null
    setDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    if (!d) return
    if (!d.moved) {
      router.push("/dashboard/pos")
      return
    }
    const next = { x: e.clientX - d.baseX, y: e.clientY - d.baseY }
    const clamped = clamp(next.x, next.y)
    setPos(clamped)
    savePos(clamped.x, clamped.y)
  }

  if (!pos || pathname === "/dashboard/pos") return null

  return (
    <div
      ref={fabRef}
      className="fixed z-50"
      style={{ right: "auto", bottom: "auto", left: pos.x, top: pos.y }}
    >
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={cn(
          "flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-lg transition-transform select-none touch-none",
          dragging ? "scale-105 cursor-grabbing shadow-xl" : "hover:bg-primary-hover cursor-grab"
        )}
        title="New sale (drag to move)"
      >
        <Plus size={20} />
        New sale
      </button>
    </div>
  )
}

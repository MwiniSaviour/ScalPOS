import { cn } from "@/lib/utils"
import type { OrderPayStatus, Sale } from "@/lib/types"

export type Period = "today" | "yesterday" | "7d" | "30d" | "all" | "custom"

export const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom…" },
]

export function startOfToday(now: number): number {
  const d = new Date(now)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function parseDay(s: string): number {
  if (!s) return NaN
  const [y, m, d] = s.split("-").map(Number)
  if (!y || !m || !d) return NaN
  return new Date(y, m - 1, d).getTime()
}

export type Bounds = { from: number | null; to: number | null }

export function ordersWindow(period: Period, from: string, to: string, now: number): Bounds {
  if (period === "all" || !(now > 0)) return { from: null, to: null }
  const todayStart = startOfToday(now)
  if (period === "today") return { from: todayStart, to: null }
  if (period === "yesterday") return { from: todayStart - 86_400_000, to: todayStart }
  if (period === "7d") return { from: todayStart - 6 * 86_400_000, to: null }
  if (period === "30d") return { from: todayStart - 29 * 86_400_000, to: null }
  const fromMs = from ? parseDay(from) : NaN
  const toMs = to ? parseDay(to) : NaN
  return {
    from: Number.isFinite(fromMs) ? fromMs : null,
    to: Number.isFinite(toMs) ? toMs + 86_400_000 : null,
  }
}

/** Real money received — "credit" rows are markers, never cash received. */
export function paidOf(sale: Sale): number {
  return sale.payments.reduce((s, p) => s + (p.method === "credit" ? 0 : p.amount), 0)
}

export function dueOf(sale: Sale): number {
  return Math.max(sale.total - paidOf(sale), 0)
}

export const isOnCredit = (sale: Sale): boolean =>
  sale.status !== "refunded" && dueOf(sale) > 0.005

export const PAY_STATUS_BADGES: Record<OrderPayStatus, string> = {
  paid: "bg-success-bg text-success",
  partial: "bg-warning-bg text-warning",
  unpaid: "bg-danger-bg text-danger",
  refunded: "bg-muted-bg text-muted",
}

export const ORDER_STATUS_LABELS: Record<OrderPayStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
  refunded: "Refunded",
}

export function OrderPayBadge({ status, sale }: { status?: OrderPayStatus; sale?: Sale }) {
  const s = (status ?? sale?.pay_status ?? "unpaid") as OrderPayStatus
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        PAY_STATUS_BADGES[s] ?? "bg-muted-bg text-muted",
      )}
    >
      {ORDER_STATUS_LABELS[s] ?? s}
    </span>
  )
}

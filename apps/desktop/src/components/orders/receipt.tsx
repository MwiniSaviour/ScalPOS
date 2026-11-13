"use client"

import { useEffect } from "react"
import { cn, formatCurrency } from "@/lib/utils"
import { paidOf, dueOf } from "@/lib/orders-ui"
import { ticketNumber, orderTypeLabel, itemChoices } from "@/lib/restaurant"
import type { Sale, PaymentMethod, ShopSettings } from "@/lib/types"

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  momo: "Mobile Money",
  card: "Card",
  credit: "Credit",
}

export function OrderReceipt({
  sale,
  settings,
  tableName,
  className,
}: {
  sale: Sale
  settings: ShopSettings | null
  /** Name of the order's dining table, resolved by the parent (restaurant). */
  tableName?: string | null
  className?: string
}) {
  const due = dueOf(sale)
  const paid = paidOf(sale)
  const name = settings?.shop_name?.trim() || "ScalPOS"
  const when = new Date(sale.sale_date)
  const restaurant = settings?.business_type === "restaurant"

  useEffect(() => {
    const onBefore = () => document.body.classList.add("nova-print-receipt")
    const onAfter = () => document.body.classList.remove("nova-print-receipt")
    window.addEventListener("beforeprint", onBefore)
    window.addEventListener("afterprint", onAfter)
    return () => {
      window.removeEventListener("beforeprint", onBefore)
      window.removeEventListener("afterprint", onAfter)
    }
  }, [])

  return (
    <div className={cn("receipt-print-root mx-auto w-full max-w-[360px] bg-white text-[13px] leading-5 text-black", className)}>
      <div className="px-1 py-2">
        <div className="text-center">
          <p className="text-[17px] font-bold leading-6">{name}</p>
          {settings?.address?.trim() ? (
            <p className="mt-0.5 text-[12px] text-gray-700">{settings.address.trim()}</p>
          ) : null}
          {settings?.phone?.trim() ? (
            <p className="text-[12px] text-gray-700">{settings.phone.trim()}</p>
          ) : null}
          {settings?.momo_number?.trim() ? (
            <p className="text-[12px] text-gray-600">
              MoMo {settings.momo_number.trim()}
              {settings.momo_network ? ` · ${settings.momo_network}` : ""}
            </p>
          ) : null}
          {sale.status === "refunded" ? (
            <p className="mt-1 text-[12px] font-bold uppercase tracking-wide text-gray-600">Refunded</p>
          ) : null}
        </div>

        <div className="my-3 border-t border-dashed border-gray-400" />

        <div className="flex items-start justify-between gap-3 text-[12px] text-gray-600">
          <span className="font-semibold">{sale.invoice_no}</span>
          <span className="text-right">
            {when.toLocaleDateString()} · {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        {restaurant && (sale.order_type || sale.table_id) ? (
          <p className="mt-0.5 text-center text-[12px] font-semibold text-gray-700">
            {[
              `Ticket ${ticketNumber(sale.invoice_no)}`,
              sale.order_type ? orderTypeLabel(sale.order_type) : null,
              sale.table_id && tableName ? `Table ${tableName}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        {sale.customer?.name ? (
          <p className="mt-0.5 text-[12px] text-gray-700">Customer: {sale.customer.name}</p>
        ) : null}

        <div className="my-3 border-t border-dashed border-gray-400" />

        <div className="space-y-1.5">
          {(sale.items ?? []).map((i) => {
            const choices = restaurant ? itemChoices(i) : ""
            return (
              <div key={i.id} className="flex items-start justify-between gap-3">
                <span className="min-w-0 flex-1">
                  {i.product_name} <span className="text-gray-500">× {i.quantity}</span>
                  {choices ? <span className="block pl-3 text-[11px] text-gray-500">{choices}</span> : null}
                </span>
                <span className="shrink-0 font-semibold">{formatCurrency(i.subtotal)}</span>
              </div>
            )
          })}
        </div>

        <div className="my-3 border-t border-dashed border-gray-400" />

        <div className="space-y-1">
          <Row label="Subtotal" value={formatCurrency(sale.subtotal)} />
          {sale.discount > 0 ? (
            <Row label="Discount" value={`-${formatCurrency(sale.discount)}`} />
          ) : null}
          {sale.tax > 0 ? <Row label="Tax" value={formatCurrency(sale.tax)} /> : null}
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-3">
          <span className="text-[14px] font-bold">Total</span>
          <span className="text-[18px] font-extrabold">{formatCurrency(sale.total)}</span>
        </div>

        <div className="my-3 border-t border-dashed border-gray-400" />

        <div className="space-y-1">
          {sale.payments.length > 0 ? (
            sale.payments.map((p, idx) => (
              <Row
                key={`${p.method}-${idx}`}
                label={METHOD_LABEL[p.method] ?? p.method}
                value={formatCurrency(p.amount)}
              />
            ))
          ) : (
            <Row label="Paid" value={formatCurrency(paid)} />
          )}
          {due > 0 ? (
            <Row label="Balance due" value={formatCurrency(due)} bold warn />
          ) : (
            <Row label="Status" value="Fully paid" bold />
          )}
        </div>

        {settings?.receipt_footer?.trim() ? (
          <>
            <div className="my-3 border-t border-dashed border-gray-400" />
            <p className="text-center text-[12px] text-gray-600">{settings.receipt_footer.trim()}</p>
          </>
        ) : null}

        <p className="mt-3 text-center text-[13px] font-bold">Thank you for your purchase.</p>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  warn,
}: {
  label: string
  value: string
  bold?: boolean
  warn?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={cn("text-[12px]", warn ? "font-bold text-black" : "text-gray-600", bold && "font-semibold")}>
        {label}
      </span>
      <span className={cn("tabular-nums text-[12px]", bold ? "font-bold" : "font-semibold", warn && "text-black")}>
        {value}
      </span>
    </div>
  )
}

import { formatCurrency, formatDateTime } from "@/lib/utils"
import type { Sale } from "@/lib/types"

const METHOD_LABELS: Record<Sale["payment_method"], string> = {
  cash: "Cash",
  momo: "Momo",
  card: "Card",
  credit: "Credit",
}

export function RecentSales({ sales }: { sales: Sale[] }) {
  return (
    <div className="glass-panel p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Recent Sales</h3>
        <p className="text-xs text-muted">Latest payment records</p>
      </div>
      {sales.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted">
          No sales yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {sales.slice(0, 5).map((sale) => (
                <tr key={sale.id} className="hover:bg-sidebar-hover">
                  <td className="table-cell font-medium text-foreground">
                    {sale.invoice_no}
                  </td>
                  <td className="table-cell">{sale.customer?.name ?? "Walk-in"}</td>
                  <td className="table-cell font-medium text-foreground">
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="table-cell">
                    <span className="badge-info">{METHOD_LABELS[sale.payment_method]}</span>
                  </td>
                  <td className="table-cell">{formatDateTime(sale.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

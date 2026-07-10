import { formatCurrency, formatDateTime } from "@/lib/utils"

const sales = [
  {
    id: "1",
    invoice_no: "INV-250709-XK4M",
    customer: "John Doe",
    total: 156.00,
    payment_method: "Cash",
    created_at: "2025-07-09T10:30:00",
  },
  {
    id: "2",
    invoice_no: "INV-250709-A2B8",
    customer: "Jane Smith",
    total: 89.50,
    payment_method: "Card",
    created_at: "2025-07-09T09:15:00",
  },
  {
    id: "3",
    invoice_no: "INV-250709-M7N3",
    customer: "Bob Wilson",
    total: 234.00,
    payment_method: "Transfer",
    created_at: "2025-07-09T08:45:00",
  },
  {
    id: "4",
    invoice_no: "INV-250708-P9Q2",
    customer: "Alice Brown",
    total: 67.00,
    payment_method: "Cash",
    created_at: "2025-07-08T16:20:00",
  },
  {
    id: "5",
    invoice_no: "INV-250708-R5T1",
    customer: "Charlie Davis",
    total: 192.00,
    payment_method: "Card",
    created_at: "2025-07-08T14:00:00",
  },
]

export function RecentSales() {
  return (
    <div className="glass-panel p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Recent Sales</h3>
        <p className="text-xs text-muted">Latest payment records</p>
      </div>
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
            {sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-sidebar-hover">
                <td className="table-cell font-medium text-foreground">
                  {sale.invoice_no}
                </td>
                <td className="table-cell">{sale.customer}</td>
                <td className="table-cell font-medium text-foreground">
                  {formatCurrency(sale.total)}
                </td>
                <td className="table-cell">
                  <span className="badge-info">{sale.payment_method}</span>
                </td>
                <td className="table-cell">{formatDateTime(sale.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

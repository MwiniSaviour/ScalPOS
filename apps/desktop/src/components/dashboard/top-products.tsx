"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatCurrency } from "@/lib/utils"
import type { TopProduct } from "@/lib/types"

export function TopProducts({ data }: { data: TopProduct[] }) {
  const rows = data.map((p) => ({ name: p.name, revenue: p.total_revenue }))

  return (
    <div className="glass-panel p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Top Products</h3>
        <p className="text-xs text-muted">Best selling products this month</p>
      </div>
      {rows.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted">
          No sales this month yet
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={(v) => `GH₵${v}`}
              />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#475569" }}
                width={90}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />
              <Bar dataKey="revenue" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

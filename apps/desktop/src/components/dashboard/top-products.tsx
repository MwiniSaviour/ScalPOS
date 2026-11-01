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

const data = [
  { name: "Product A", revenue: 4800 },
  { name: "Product B", revenue: 3600 },
  { name: "Product C", revenue: 2800 },
  { name: "Product D", revenue: 2100 },
  { name: "Product E", revenue: 1500 },
]

export function TopProducts() {
  return (
    <div className="glass-panel p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Top Products</h3>
        <p className="text-xs text-muted">Best selling products this month</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              tickFormatter={(v) => `$${v}`}
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
    </div>
  )
}

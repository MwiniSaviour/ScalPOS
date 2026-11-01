"use client"

import { useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const data = [
  { date: "Jul 1", amount: 1200 },
  { date: "Jul 2", amount: 1800 },
  { date: "Jul 3", amount: 1400 },
  { date: "Jul 4", amount: 2200 },
  { date: "Jul 5", amount: 1600 },
  { date: "Jul 6", amount: 2400 },
  { date: "Jul 7", amount: 2100 },
  { date: "Jul 8", amount: 2800 },
  { date: "Jul 9", amount: 1900 },
  { date: "Jul 10", amount: 2600 },
]

export function RevenueChart() {
  const [range, setRange] = useState<"7" | "30">("7")

  return (
    <div className="glass-panel p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Revenue Overview</h3>
          <p className="text-xs text-muted">Daily revenue trend</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          <button
            onClick={() => setRange("7")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              range === "7"
                ? "bg-primary text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setRange("30")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              range === "30"
                ? "bg-primary text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            30 Days
          </button>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#4f46e5"
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

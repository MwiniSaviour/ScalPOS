import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string
  change?: string
  changeType?: "up" | "down"
  icon: LucideIcon
  iconBg?: string
}

export function StatCard({
  title,
  value,
  change,
  changeType = "up",
  icon: Icon,
  iconBg = "bg-primary-light",
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {change && (
            <p
              className={cn(
                "text-xs font-medium",
                changeType === "up" ? "text-success" : "text-danger"
              )}
            >
              {changeType === "up" ? "↑" : "↓"} {change}
            </p>
          )}
        </div>
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", iconBg)}>
          <Icon className="text-primary" size={24} />
        </div>
      </div>
    </div>
  )
}

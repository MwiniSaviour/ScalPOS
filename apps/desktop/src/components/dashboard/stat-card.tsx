import type { LucideIcon } from "lucide-react"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string
  change?: string
  changeType?: "up" | "down"
  changeDetail?: string
  icon?: LucideIcon
  iconBg?: string
}

export function StatCard({
  title,
  value,
  change,
  changeType = "up",
  changeDetail,
  icon: Icon,
  iconBg = "bg-primary-light",
}: StatCardProps) {
  return (
    <div className="stat-card min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="text-xl leading-snug font-bold text-foreground tabular-nums sm:text-2xl xl:text-3xl">
            {value}
          </p>
          {change && (
            <p className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs font-medium text-foreground">
              {changeType === "up" ? (
                <ArrowUpRight size={14} className="shrink-0 text-success" />
              ) : (
                <ArrowDownRight size={14} className="shrink-0 text-danger" />
              )}
              <span className={cn("shrink-0", changeType === "up" ? "text-success" : "text-danger")}>
                {change}
              </span>
              {changeDetail && <span className="text-muted">{changeDetail}</span>}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", iconBg)}>
            <Icon className="text-primary" size={24} />
          </div>
        )}
      </div>
    </div>
  )
}

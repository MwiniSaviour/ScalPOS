import { DollarSign, Package, Users, AlertTriangle } from "lucide-react"
import { StatCard } from "./stat-card"
import { RevenueChart } from "./revenue-chart"
import { TopProducts } from "./top-products"
import { RecentSales } from "./recent-sales"

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Revenue"
          value="$1,892"
          change="12.5% from yesterday"
          changeType="up"
          icon={DollarSign}
          iconBg="bg-success-bg"
        />
        <StatCard
          title="Total Products"
          value="248"
          change="12 new this month"
          changeType="up"
          icon={Package}
          iconBg="bg-info-bg"
        />
        <StatCard
          title="Total Customers"
          value="1,432"
          change="8.2% from last month"
          changeType="up"
          icon={Users}
          iconBg="bg-primary-light"
        />
        <StatCard
          title="Low Stock Alerts"
          value="18"
          change="5 more than last week"
          changeType="down"
          icon={AlertTriangle}
          iconBg="bg-danger-bg"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <RevenueChart />
        </div>
        <div className="lg:col-span-3">
          <TopProducts />
        </div>
      </div>

      <RecentSales />
    </div>
  )
}

import type { ReactNode } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { OrgGate } from "@/components/auth/org-gate"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <OrgGate>
      <DashboardLayout>{children}</DashboardLayout>
    </OrgGate>
  )
}

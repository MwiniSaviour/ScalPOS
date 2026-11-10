import type { ReactNode } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { OrgGate } from "@/components/auth/org-gate"
import { EnterpriseGate } from "@/components/auth/enterprise-gate"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <OrgGate>
      <EnterpriseGate>
        <DashboardLayout>{children}</DashboardLayout>
      </EnterpriseGate>
    </OrgGate>
  )
}

import type { ReactNode } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { OrgGate as WebOrgGate } from "@/components/auth/org-gate"
import { EnterpriseGate as WebEnterpriseGate } from "@/components/auth/enterprise-gate"
import { OrgGate as OfflineOrgGate } from "@/components/auth/org-gate-offline"
import { EnterpriseGate as OfflineEnterpriseGate } from "@/components/auth/enterprise-gate-offline"
const offline = process.env.NEXT_PUBLIC_OFFLINE_DESKTOP === "1"

const OrgGate = offline ? OfflineOrgGate : WebOrgGate
const EnterpriseGate = offline ? OfflineEnterpriseGate : WebEnterpriseGate

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <OrgGate>
      <EnterpriseGate>
        <DashboardLayout>{children}</DashboardLayout>
      </EnterpriseGate>
    </OrgGate>
  )
}

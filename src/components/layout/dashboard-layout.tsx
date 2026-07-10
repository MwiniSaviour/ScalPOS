import type { ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-64 flex flex-1 flex-col">
        <Header />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}

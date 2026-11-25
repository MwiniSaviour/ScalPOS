import LandingScreen from "@/components/landing/landing-screen"
import { redirect } from "next/navigation"
export default function RootPage() {
  if (process.env.NEXT_PUBLIC_OFFLINE_DESKTOP === "1") redirect("/dashboard")
  return <LandingScreen />
}

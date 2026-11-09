import { Suspense } from "react"
import CallbackScreen from "./callback-screen"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CallbackScreen />
    </Suspense>
  )
}

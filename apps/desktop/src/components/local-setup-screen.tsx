"use client"

import { useState } from "react"
import { LockKeyhole } from "lucide-react"
import { createLocalShop } from "@/lib/offline/local-data"

/** Day-one setup: a shop on this PC, no account or internet required. */
export default function LocalSetupScreen({ onReady, onSignIn }: { onReady: () => void; onSignIn: () => void }) {
  const [name, setName] = useState("My Shop")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function start() {
    if (!name.trim()) { setError("Give your shop a name."); return }
    setBusy(true)
    setError("")
    try {
      await createLocalShop({ shop_name: name.trim() })
      onReady()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the local shop.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="glass-panel w-full max-w-sm space-y-5 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
          <LockKeyhole size={26} />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Start on this computer</h1>
        <p className="text-sm text-muted">
          Your shop works offline from the first launch. Add a PIN next, then use it
          every time you open the app — no sign-in needed.
        </p>
        <input
          className="input-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Shop name"
          aria-label="Shop name"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={busy} onClick={() => void start()}>
          {busy ? "Creating…" : "Start offline shop"}
        </button>
        <button className="btn-ghost w-full text-xs" onClick={onSignIn}>
          Sign in to a cloud shop instead
        </button>
      </div>
    </div>
  )
}

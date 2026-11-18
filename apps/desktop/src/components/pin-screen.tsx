"use client"

import { useState } from "react"
import { LockKeyhole, ShieldCheck } from "lucide-react"
import {
  hasRecovery, hasPin, readRecovery, saveRecovery,
  usePinLock, verifyRecoveryAnswer,
} from "@/lib/pin"

/** Inline desktop lock. PIN is local-only and works without Clerk or network. */
export default function PinScreen() {
  const { unlocked, attemptPin, setPin } = usePinLock()
  const [stage, setStage] = useState<"unlock" | "set" | "recover">(hasPin() ? "unlock" : "set")
  const [pin, setPinValue] = useState("")
  const [confirm, setConfirmValue] = useState("")
  const [answer, setAnswer] = useState("")
  const [question, setQuestion] = useState("")
  const [error, setError] = useState("")

  if (unlocked) return null

  async function unlock() {
    setError("")
    if (!(await attemptPin(pin))) {
      setError("That PIN wasn't recognised.")
      setPinValue("")
      return
    }
  }

  async function create() {
    setError("")
    if (pin.length < 4) { setError("PIN must be at least 4 digits."); return }
    if (pin !== confirm) { setError("PINs do not match."); return }
    try {
      if (hasRecovery()) {
        await setPin(pin)
        setPinValue("")
      } else {
        setStage("recover")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the PIN.")
    }
  }

  async function recover() {
    setError("")
    if (recovery) {
      if (!(await verifyRecoveryAnswer(answer))) {
        setError("That answer wasn't recognised.")
        return
      }
    } else if (!(await saveRecovery(question, answer))) {
      setError("Enter a question and answer.")
      return
    }
    await setPin(pin)
    setStage("unlock")
    setPinValue("")
    setAnswer("")
    setQuestion("")
  }

  const recovery = readRecovery()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="glass-panel w-full max-w-sm space-y-5 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
          {stage === "recover" ? <ShieldCheck size={26} /> : <LockKeyhole size={26} />}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {stage === "set" ? "Create your desktop PIN" : stage === "recover" ? "Add a recovery question" : "Unlock ScalPOS"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {stage === "set"
              ? "This keeps the register private — no internet or sign-in needed to unlock it."
              : stage === "recover"
                ? "Answer a question only you know so you can reset the PIN without email."
                : "Enter your device PIN to continue."}
          </p>
        </div>

        {stage === "recover" ? (
          <div className="space-y-3 text-left">
            <label className="label">Question</label>
            <input
              className="input-field"
              value={recovery?.question ?? question}
              readOnly={!!recovery}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Your question"
            />
            <label className="label">Answer</label>
            <input className="input-field" value={answer} onChange={(e) => setAnswer(e.target.value)} />
            <label className="label">New PIN</label>
            <input className="input-field" type="password" inputMode="numeric" value={pin} onChange={(e) => setPinValue(e.target.value)} />
            <button className="btn-primary w-full" onClick={() => void recover()}>
              Save and unlock
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-left">
            <input
              className="input-field text-center text-lg tracking-[0.4em]"
              type="password"
              inputMode="numeric"
              autoFocus
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPinValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (stage === "unlock" ? void unlock() : void create())}
            />
            {stage === "set" && (
              <input
                className="input-field text-center text-lg tracking-[0.4em]"
                type="password"
                inputMode="numeric"
                placeholder="Confirm PIN"
                value={confirm}
                onChange={(e) => setConfirmValue(e.target.value)}
              />
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              className="btn-primary w-full"
              onClick={() => (stage === "unlock" ? void unlock() : void create())}
            >
              {stage === "unlock" ? "Unlock" : "Set PIN"}
            </button>
            {stage === "unlock" && (
              <button className="btn-ghost w-full text-xs" onClick={() => setStage("recover")}>
                Forgot PIN? Use recovery question
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

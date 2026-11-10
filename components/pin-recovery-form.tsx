"use client";

import { useState } from "react";
import { Check, PenLine } from "lucide-react";
import { saveRecovery, type StoredRecovery } from "@/lib/pin";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const PIN_RECOVERY_QUESTIONS = [
  "What is your mother's first name?",
  "What street did you grow up on?",
  "What was your first phone's brand?",
  "What was your first pet's name?",
] as const;

const CUSTOM = "__custom__";

export default function PinRecoveryForm({
  onSaved,
}: {
  onSaved: (r: StoredRecovery) => void | Promise<void>;
}) {
  const [qIdx, setQIdx] = useState<string>(PIN_RECOVERY_QUESTIONS[0]);
  const [custom, setCustom] = useState("");
  const [answer, setAnswer] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCustom = qIdx === CUSTOM;

  async function submit() {
    const q = isCustom
      ? custom.trim()
      : PIN_RECOVERY_QUESTIONS.find((x) => x === qIdx)?.trim() ?? "";
    if (!q) {
      setError("Write your own question above.");
      return;
    }
    if (answer.trim().length < 2) {
      setError("The answer needs at least 2 characters.");
      return;
    }
    if (answer !== confirm) {
      setError("The two answers don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await saveRecovery(q, answer);
      if (!saved) {
        setError("Storage is full — the question couldn't be saved.");
        return;
      }
      await onSaved(saved);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <Card inset className="w-full">
        {PIN_RECOVERY_QUESTIONS.map((question, i) => (
          <button
            key={question}
            type="button"
            data-testid={`pin-recovery-question-${i}`}
            onClick={() => setQIdx(question)}
            className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${
              qIdx === question ? "bg-accentsoft text-ink" : "text-ink3"
            }`}
          >
            <span className="text-[14px] font-medium">{question}</span>
            <span className="ml-auto shrink-0 text-accent">
              {qIdx === question ? <Check size={18} strokeWidth={2.4} /> : null}
            </span>
          </button>
        ))}
        <button
          type="button"
          data-testid="pin-recovery-question-custom"
          onClick={() => setQIdx(CUSTOM)}
          className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${
            isCustom ? "bg-accentsoft text-ink" : "text-ink3"
          }`}
        >
          <span className="text-[14px] font-medium">Write my own question</span>
          <PenLine size={16} strokeWidth={2.2} className="shrink-0" />
          <span className="ml-auto shrink-0 text-accent">
            {isCustom ? <Check size={18} strokeWidth={2.4} /> : null}
          </span>
        </button>
      </Card>

      {isCustom ? (
        <Input
          type="text"
          data-testid="pin-recovery-question"
          className="mt-3"
          value={custom}
          maxLength={120}
          placeholder="e.g. My favourite nephew's pet"
          onChange={(e) => setCustom(e.target.value)}
        />
      ) : null}

      <Input
        type="text"
        data-testid="pin-recovery-answer"
        className="mt-3"
        value={answer}
        maxLength={80}
        placeholder="Your answer"
        onChange={(e) => setAnswer(e.target.value)}
      />
      <Input
        type="text"
        data-testid="pin-recovery-answer-confirm"
        className="mt-3"
        value={confirm}
        maxLength={80}
        placeholder="Enter the answer again"
        onChange={(e) => setConfirm(e.target.value)}
      />

      {error ? <p className="mt-2 px-1 text-[12px] text-danger">{error}</p> : null}

      <Button
        type="button"
        block
        data-testid="pin-recovery-save"
        loading={busy}
        disabled={busy}
        onClick={submit}
        className="mt-4"
      >
        {busy ? "Saving..." : "Save recovery question"}
      </Button>
    </div>
  );
}

"use client";

import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth, useUser } from "@clerk/clerk-react";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { acceptInviteToken, bootstrapConnection, writeConnection } from "@/lib/api/bootstrap";
import { usePos } from "@/lib/store";
import { useNet } from "@/lib/net";

export default function AcceptInviteScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = usePos((s) => s.toast);
  const { online } = useNet();
  const { isSignedIn, getToken, userId } = useAuth();
  const { user } = useUser();
  const token = params.get("token") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isSignedIn || !userId || !token) return;
    let cancelled = false;
    void (async () => {
      setBusy(true);
      setError(null);
      try {
        const access_token = await getToken({ template: "supabase" });
        if (!access_token) throw new Error("session token unavailable — retry");
        const r = await acceptInviteToken(token, access_token);
        const conn = await bootstrapConnection({ access_token, user_id: userId });
        writeConnection(conn);
        if (cancelled) return;
        setJoined(true);
        toast(`Joined this shop as ${r.role}`, "ok");
        setTimeout(() => router.replace("/"), 900);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId, token, attempt, getToken, router, toast]);

  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  return (
    <div className="anim-fade px-5 pt-4">
      <header className="flex items-center gap-1">
        <IconButton label="Back" onClick={() => router.back()} className="-ml-2 shrink-0 text-ink">
          <ChevronLeft className="size-[24px]" strokeWidth={2.2} />
        </IconButton>
        <h1 className="min-w-0 flex-1 truncate text-[26px]/7 font-bold tracking-[-0.02em] text-ink">
          Join shop
        </h1>
      </header>

      <Card className="mt-6 px-4 py-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface2 text-ok">
            <ShieldCheck className="size-[20px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink">Team invite</p>
            <p className="mt-0.5 truncate text-[14px] text-ink3">
              {token ? "Sign in with the invited email to accept." : "This link is missing its invite code."}
            </p>
          </div>
        </div>

        {!token ? (
          <p className="mt-3 text-[14px] text-danger">Invalid invite link — ask your owner to resend it.</p>
        ) : !isSignedIn ? (
          <>
            <Button
              className="mt-4"
              block
              disabled={!online || busy}
              onClick={() => router.push("/connect")}
            >
              Sign in first
            </Button>
            <p className="mt-2 text-[14px]/5 text-ink3">
              Use the email your owner invited, then reopen this link.
            </p>
          </>
        ) : busy ? (
          <p className="mt-4 text-[14px] text-ink3">Joining shop…</p>
        ) : joined ? (
          <p className="mt-4 text-[14px] text-ok">Joined — opening your register…</p>
        ) : (
          <Button className="mt-4" block disabled={!online} loading={busy} onClick={() => setAttempt((n) => n + 1)}>
            Retry join
          </Button>
        )}
        {email && <p className="mt-2.5 text-[14px] text-ink3">Signed in as {email}</p>}
        {error && <p className="mt-2.5 text-[14px] text-danger">{error}</p>}
      </Card>
    </div>
  );
}

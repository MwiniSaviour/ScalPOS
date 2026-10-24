"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { StatusPill } from "@/components/ui/statuspill";
import {
  bootstrapConnection,
  readConnection,
  writeConnection,
  type SyncConnection,
} from "@/lib/api/bootstrap";
import {
  layoffMember,
  listMembers,
  reinstateMember,
  setRole,
  type TeamMember,
  type TeamRole,
} from "@/lib/api/team";
import { cn } from "@/lib/ui";
import { useNet } from "@/lib/net";
import { usePos } from "@/lib/store";
import { ChevronLeft, Cloud, CloudOff, LogOut, Mail, RefreshCw, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

const ROLE_OPTIONS = ["owner", "supervisor", "cashier"] as const;

function roleLabel(r: TeamRole): string {
  return r[0].toUpperCase() + r.slice(1);
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function PeopleSection({ conn, refreshKey }: { conn: SyncConnection; refreshKey: number }) {
  const toast = usePos((s) => s.toast);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    let ok = true;
    listMembers(conn)
      .then((list) => {
        if (!ok) return;
        setMembers(list);
        setLoading(false);
      })
      .catch(() => {
        if (!ok) return;
        setMembers([]);
        setLoading(false);
      });
    return () => {
      ok = false;
    };
  }, [conn, refreshKey]);

  async function reload() {
    try {
      setMembers(await listMembers(conn));
    } catch {
      setMembers([]);
    }
  }

  const selfRow = members.find((m) => m.user_id === conn.user_id && !m.deleted_at) ?? null;
  const isOwner = selfRow?.role === "owner";
  const activeOwners = members.filter((m) => m.role === "owner" && !m.deleted_at).length;
  const sorted = members
    .slice()
    .sort((a, b) => Number(!!a.deleted_at) - Number(!!b.deleted_at) || a.created_at.localeCompare(b.created_at));

  function displayName(m: TeamMember): string {
    return m.email ?? (m.user_id === conn.user_id ? conn.email : undefined) ?? "Member";
  }

  function canTap(m: TeamMember): boolean {
    return isOwner && !m.deleted_at && m.user_id !== conn.user_id;
  }

  async function changeRole(r: TeamRole) {
    const m = selected;
    if (!m || acting) return;
    if (m.user_id === conn.user_id || r === m.role) return;
    if (m.role === "owner" && activeOwners === 1) {
      toast("Cannot demote the last owner", "error");
      return;
    }
    setActing(true);
    try {
      await setRole(conn, m.id, r);
      toast("Role updated", "ok");
      setSelected(null);
      await reload();
    } catch (e) {
      toast(errMessage(e), "error");
      await reload();
    } finally {
      setActing(false);
    }
  }

  async function layoffSelected() {
    const m = selected;
    if (!m || acting) return;
    if (m.role === "owner" && activeOwners === 1) {
      toast("Cannot remove the last owner", "error");
      return;
    }
    setActing(true);
    try {
      await layoffMember(conn, m.id);
      toast("Access removed", "ok");
    } catch (e) {
      toast(errMessage(e), "error");
    } finally {
      setSelected(null);
      setConfirmRemove(false);
      await reload();
      setActing(false);
    }
  }

  async function reinstateRow(m: TeamMember) {
    if (acting) return;
    setActing(true);
    try {
      await reinstateMember(conn, m.id);
      toast("Access reinstated", "ok");
      await reload();
    } catch (e) {
      toast(errMessage(e), "error");
      await reload();
    } finally {
      setActing(false);
    }
  }

  return (
    <section className="mt-6">
      <h2 className="text-[15px] font-medium text-ink2">People</h2>
      {loading ? (
        <p className="mt-2.5 text-[14px] text-ink3">Loading team…</p>
      ) : (
        <div data-testid="team-list" className="mt-2.5">
          <Card inset>
            {sorted.map((m) => (
              <div
                key={m.id}
                data-testid="team-row"
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  canTap(m) && "press cursor-pointer active:bg-surface3",
                )}
                role={canTap(m) ? "button" : undefined}
                tabIndex={canTap(m) ? 0 : undefined}
                onClick={canTap(m) ? () => setSelected(m) : undefined}
              >
                <Avatar name={displayName(m)} size={40} className={m.deleted_at ? "opacity-40" : undefined} />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-[15px] font-semibold",
                      m.deleted_at ? "text-ink3" : "text-ink",
                    )}
                  >
                    {displayName(m)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <StatusPill status={m.role} />
                    {m.deleted_at && (
                      <span className="inline-flex h-6 items-center rounded-full bg-ink2/10 px-2.5 text-[11px] font-semibold uppercase tracking-[.06em] text-ink2">
                        Removed
                      </span>
                    )}
                  </div>
                </div>
                {isOwner && m.deleted_at && (
                  <Button
                    variant="soft"
                    size="sm"
                    loading={acting}
                    onClick={() => void reinstateRow(m)}
                    data-testid="team-reinstate"
                  >
                    Reinstate
                  </Button>
                )}
              </div>
            ))}
          </Card>
          {!isOwner && <p className="mt-2 text-[14px] text-ink3">Only owners can change roles.</p>}
        </div>
      )}

      <Sheet
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setConfirmRemove(false);
        }}
        title={selected ? displayName(selected) : "Member"}
      >
        <div className="pb-6">
          <p className="text-[12px] uppercase tracking-[.06em] text-ink3">Role</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((r) => (
              <Chip
                key={r}
                active={selected?.role === r}
                disabled={acting}
                onClick={() => void changeRole(r)}
                data-testid={`team-role-${r}`}
              >
                {roleLabel(r)}
              </Chip>
            ))}
          </div>
          <Button
            variant="danger"
            block
            className="mt-5"
            loading={acting}
            onClick={() => setConfirmRemove(true)}
            data-testid="team-remove"
          >
            Remove access
          </Button>
        </div>
      </Sheet>

      <Confirm
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        tone="danger"
        title="Remove access?"
        body="They immediately lose access to the shop until reinstated or re-invited."
        confirmLabel="Remove"
        onConfirm={() => void layoffSelected()}
      />
    </section>
  );
}

export default function ConnectScreen() {
  const router = useRouter();
  const { online } = useNet();
  const toast = usePos((s) => s.toast);
  const [conn, setConn] = useState<SyncConnection | null>(() => readConnection());
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rosterVersion, setRosterVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const mod = await import("@/lib/api/supabase");
      const sb = mod.getSupabase();
      if (!sb) return;
      const { data } = await sb.auth.getSession();
      if (cancelled) return;
      const sess = data?.session ?? null;
      if (sess?.user) {
        setSessionEmail(sess.user.email ?? null);
        setSessionToken(sess.access_token);
        setSessionUserId(sess.user.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signedIn = !!sessionToken && !!sessionUserId;

  async function signIn() {
    if (!online) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const mod = await import("@/lib/api/supabase");
      const sb = mod.getSupabase();
      if (!sb) throw new Error("Supabase not configured");
      const { data, error: e } = await sb.auth.signInWithOtp({ email: trimmed });
      if (e) throw new Error(e.message);
      const userCreated = !data.user;
      router.push(`/auth/code?email=${encodeURIComponent(trimmed)}${userCreated ? "" : "&new=1"}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    if (!online || !signedIn || !sessionToken || !sessionUserId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const c = await bootstrapConnection({
        access_token: sessionToken,
        user_id: sessionUserId,
        email: sessionEmail ?? email.trim() ?? undefined,
      });
      setConn(c);
      setMessage("Connected.");
      toast("Connected to backend", "ok");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      writeConnection(null);
      setConn(null);
      const mod = await import("@/lib/api/supabase");
      const sb = mod.getSupabase();
      if (sb && online) await sb.auth.signOut();
      setSessionEmail(null);
      setSessionToken(null);
      setSessionUserId(null);
      toast("Disconnected", "ok");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    if (!online) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const mod = await import("@/lib/sync/outbox");
      const res = await mod.drain();
      setMessage(`Synced ${res.applied} · ${res.failed.length} failed`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function invite() {
    if (!online || !conn) return;
    const trimmed = inviteEmail.trim();
    if (!trimmed) {
      setError("Enter an email to invite");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const url = supabaseUrl();
      const res = await fetch(`${url}/functions/v1/invite-member`, {
        method: "POST",
        headers: { Authorization: `Bearer ${conn.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: conn.org_id, email: trimmed, role: "cashier" }),
      });
      const json = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "invite failed");
      setInviteEmail("");
      setRosterVersion((v) => v + 1);
      setMessage(`Invited ${trimmed}.`);
      toast(`Invite sent to ${trimmed}`, "ok");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const connected = !!conn;
  const statusLabel = !online && !connected ? "Offline" : connected ? (online ? "Connected" : "Offline") : "Not connected";
  const statusColor = statusLabel === "Connected" ? "text-ok" : statusLabel === "Offline" ? "text-warn" : "text-ink3";

  return (
    <div className="anim-fade px-5 pt-4">
      <header className="flex items-center gap-1">
        <IconButton label="Back" onClick={() => router.back()} className="-ml-2 shrink-0 text-ink">
          <ChevronLeft className="size-[24px]" strokeWidth={2.2} />
        </IconButton>
        <h1 className="min-w-0 flex-1 truncate text-[26px]/7 font-bold tracking-[-0.02em] text-ink">
          Connect to backend
        </h1>
      </header>
      <p className="mt-0.5 text-[15px] text-ink3">Sync this register with your team.</p>

      {!online && (
        <p className="mt-3 rounded-card bg-surface2 px-3 py-2 text-[14px] text-ink3">
          You&apos;re offline — local data still saves.
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-[15px] font-medium text-ink2">Status</h2>
        <Card className="mt-2.5 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-surface2 ${statusColor}`}>
              {statusLabel === "Connected" ? <Cloud className="size-[18px]" /> : <CloudOff className="size-[18px]" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[17px] font-semibold ${statusColor}`}>{statusLabel}</span>
              {connected && (
                <>
                  <span className="block truncate text-[14px] text-ink3">{conn?.org_name ?? conn?.org_id}</span>
                  <span className="block truncate text-[14px] text-ink3">{conn?.email}</span>
                </>
              )}
            </span>
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <h2 className="text-[15px] font-medium text-ink2">Account</h2>
        <Card className="mt-2.5 p-4">
          {!signedIn && (
            <>
              <Input
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@shop.com"
                inputMode="email"
              />
              <Button className="mt-3" block loading={busy} disabled={!online} onClick={signIn} icon={<Mail className="size-[18px]" />}>
                Sign in with email
              </Button>
            </>
          )}
          {signedIn && !connected && (
            <>
              <p className="text-[14px] text-ink3">Signed in as {sessionEmail}</p>
              <Button className="mt-3" block loading={busy} disabled={!online} onClick={connect} icon={<Cloud className="size-[18px]" />}>
                Connect
              </Button>
            </>
          )}
          {connected && (
            <p className="text-[14px] text-ink3">Signed in as {conn?.email ?? sessionEmail}</p>
          )}
          {message && <p className="mt-2.5 text-[14px] text-ok">{message}</p>}
          {error && <p className="mt-2.5 text-[14px] text-danger">{error}</p>}
        </Card>
      </section>

      {connected && (
        <>
          <section className="mt-6">
            <h2 className="text-[15px] font-medium text-ink2">Sync</h2>
            <Card className="mt-2.5 p-4">
              <Button block loading={busy} disabled={!online} onClick={syncNow} icon={<RefreshCw className="size-[18px]" />}>
                Sync now
              </Button>
            </Card>
          </section>

          <section className="mt-6">
            <h2 className="text-[15px] font-medium text-ink2">Team</h2>
            <Card className="mt-2.5 p-4">
              <Input
                label="Teammate email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@shop.com"
                inputMode="email"
              />
              <Button className="mt-3" block loading={busy} disabled={!online} onClick={invite} icon={<UserPlus className="size-[18px]" />}>
                Invite a teammate
              </Button>
            </Card>
          </section>

          <PeopleSection conn={conn} refreshKey={rosterVersion} />
        </>
      )}

      <section className="mt-6 pb-10">
        <Card className="mt-2.5 p-4">
          <Button variant="secondary" block loading={busy} onClick={disconnect} icon={<LogOut className="size-[18px]" />}>
            Disconnect
          </Button>
        </Card>
      </section>
    </div>
  );
}


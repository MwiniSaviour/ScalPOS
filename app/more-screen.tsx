"use client";

import { Card } from "@/components/ui/card";
import { Confirm } from "@/components/ui/confirm";
import {
  readConnection,
  writeConnection,
  type SyncConnection,
} from "@/lib/api/bootstrap";
import { useSettings, usePos } from "@/lib/store";
import { listConflicts } from "@/lib/sync/outbox";
import { cn } from "@/lib/ui";
import {
  AlertTriangle,
  AppWindow,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  Download,
  Gift,
  LogOut,
  PieChart,
  ScrollText,
  Settings,
  Store,
  Users,
  UsersRound,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export default function MoreScreen() {
  const settings = useSettings();
  const toast = usePos((s) => s.toast);
  const [signoutOpen, setSignoutOpen] = useState(false);
  const [conflictCount, setConflictCount] = useState(0);
  const [conn, setConn] = useState<SyncConnection | null>(() => readConnection());

  useEffect(() => {
    let cancelled = false;
    void listConflicts().then((list) => {
      if (!cancelled) setConflictCount(Array.isArray(list) ? list.length : 0);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function exportData() {
    const s = usePos.getState();
    const dump = {
      exportedAt: new Date().toISOString(),
      app: "Nova POS",
      note: "Uploaded product photos are stored on this device and are not included in this file.",
      categories: s.categories,
      products: s.products,
      orders: s.orders,
      customers: s.customers,
      settings: s.settings,
      stockMoves: s.stockMoves,
    };
    const slug = settings.shopName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "nova";
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-pos-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup saved to your downloads");
  }

  async function signOut() {
    writeConnection(null);
    setConn(null);
    const mod = await import("@/lib/api/supabase");
    const sb = mod.getSupabase();
    if (sb) await sb.auth.signOut();
    toast("Signed out", "ok");
    window.location.reload();
  }

  async function shareReferral() {
    const text = "Nova POS — offline-first point of sale for Ghanaian shops";
    const url = "https://pos.scalmint.com";
    try {
      const mod = await import("@capacitor/share");
      await mod.Share.share({ title: "Nova POS", text, url });
      toast("Invite shared", "ok");
    } catch {
      toast("Sharing is not available here", "warn");
    }
  }

  return (
    <div className="anim-fade px-5 pt-4">
      <div className="safe-t" />
      <header>
        <h1 className="text-[26px]/7 font-bold tracking-[-0.02em] text-ink">More</h1>
        <p className="mt-0.5 text-[15px] text-ink3">{settings.shopName}</p>
      </header>

      {/* browse — nav-adjacent shortcuts */}
      <section className="mt-6">
        <h2 className="text-[15px] font-medium text-ink2">Browse</h2>
        <Card inset className="mt-2.5">
          <RowLink
            href="/reports"
            tone="accent"
            icon={<PieChart className="size-[18px]" />}
            label="Reports"
            sub="Sales, payments and top products"
          />
          <RowLink
            href="/stock"
            icon={<Warehouse className="size-[18px]" />}
            label="Stock"
            sub="Stock levels and movements"
          />
          <RowLink
            href="/customers"
            icon={<Users className="size-[18px]" />}
            label="Customers"
            sub="Credit and contact details"
          />
          <RowLink
            href="/categories"
            icon={<Store className="size-[18px]" />}
            label="Categories"
            sub="Group your products"
          />
        </Card>
      </section>

      {/* business */}
      <section className="mt-6">
        <h2 className="text-[15px] font-medium text-ink2">Business</h2>
        <Card inset className="mt-2.5">
          <RowLink
            href="/account"
            icon={<CircleUserRound className="size-[18px]" />}
            label="My account"
            sub="Profile, avatar, role"
          />
          <RowLink
            href="/settings/shop"
            icon={<Store className="size-[18px]" />}
            label="Shop details"
            sub="Name, address, phone"
          />
          {conflictCount > 0 && (
            <RowLink
              href="/conflicts"
              icon={<AlertTriangle className="size-[18px]" />}
              label={`Sync conflicts (${conflictCount})`}
              sub="Resolve records changed on multiple devices"
            />
          )}
          <RowLink
            href="/settings"
            icon={<Settings className="size-[18px]" />}
            label="Settings"
            sub="Theme, receipts, MoMo"
          />
          <RowLink
            href="/billing"
            icon={<CreditCard className="size-[18px]" />}
            label="Plans &amp; billing"
            sub="Choose and manage your plan"
          />
          <RowLink
            href="/legal"
            icon={<ScrollText className="size-[18px]" />}
            label="Legal"
            sub="Terms, privacy &amp; refund policy"
          />
        </Card>
      </section>

      {/* team */}
      <section className="mt-6">
        <h2 className="text-[15px] font-medium text-ink2">Team</h2>
        <Card inset className="mt-2.5">
          <RowLink
            href="/staff"
            icon={<UsersRound className="size-[18px]" />}
            label="Staff &amp; roles"
            sub="Members and permissions"
          />
        </Card>
      </section>

      {/* data */}
      <section className="mt-6">
        <h2 className="text-[15px] font-medium text-ink2">Data</h2>
        <Card inset className="mt-2.5">
          <RowAction
            icon={<Download className="size-[18px]" />}
            label="Export data"
            sub="Save a JSON backup to your device"
            onClick={exportData}
          />
        </Card>
      </section>

      {conn && (
        <section className="mt-6">
          <Card inset>
            <button
              data-testid="more-signout"
              onClick={() => setSignoutOpen(true)}
              className="press flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface2/50"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                <LogOut className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-semibold text-ink">
                  Sign out
                </span>
                {conn.email && (
                  <span className="block truncate text-[14px] text-ink3">{conn.email}</span>
                )}
              </span>
            </button>
          </Card>
        </section>
      )}

      {/* grow */}
      <section className="mt-6">
        <Card inset>
          <RowAction
            tone="accent"
            icon={<Gift className="size-[18px]" />}
            label="Refer and earn"
            sub="GHS 20.00 for each successful conversion"
            onClick={() => void shareReferral()}
          />
          <a
            href="https://github.com/MwiniSaviour"
            target="_blank"
            rel="noopener noreferrer"
            className="press flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-ink2">
              <AppWindow className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-semibold text-ink">
                More apps
              </span>
              <span className="block truncate text-[14px] text-ink3">
                Tools from the Nova POS team
              </span>
            </span>
          </a>
        </Card>
        <p className="mt-3 pb-6 text-center text-[12px] text-ink3">Version 1.1.0</p>
      </section>

      <Confirm
        open={signoutOpen}
        onClose={() => setSignoutOpen(false)}
        onConfirm={signOut}
        tone="danger"
        title="Sign out?"
        body="This signs you out and disconnects cloud sync. All of your data stays saved on this device."
        confirmLabel="Sign out"
      />
    </div>
  );
}

function RowLink({
  href,
  icon,
  label,
  sub,
  tone = "neutral",
}: {
  href: string;
  icon: ReactNode;
  label: string;
  sub?: string;
  tone?: "neutral" | "accent";
}) {
  return (
    <Link href={href} className="press flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          tone === "accent" ? "bg-accentsoft text-accent" : "bg-surface2 text-ink2",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-semibold text-ink">{label}</span>
        {sub && <span className="block truncate text-[14px] text-ink3">{sub}</span>}
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink3" />
    </Link>
  );
}

function RowAction({
  icon,
  label,
  sub,
  onClick,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
  tone?: "neutral" | "accent";
}) {
  return (
    <button
      onClick={onClick}
      className="press flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface2/50"
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          tone === "accent" ? "bg-accentsoft text-accent" : "bg-surface2 text-ink2",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-semibold text-ink">{label}</span>
        {sub && <span className="block truncate text-[14px] text-ink3">{sub}</span>}
      </span>
    </button>
  );
}

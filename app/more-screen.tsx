"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import {
  readConnection,
  writeConnection,
  type SyncConnection,
} from "@/lib/api/bootstrap";
import { useSettings, usePos } from "@/lib/store";
import { useTerms } from "@/lib/terms";
import { hasFeature } from "@/lib/features";
import { useEntitlement, planAllowsEnterprise } from "@/lib/entitlement";
import { isDemoMode, enableDemo, exitDemo } from "@/lib/demo";
import { listConflicts } from "@/lib/sync/outbox";
import {
  affiliateShareUrl,
  clearAffiliateRef,
  normalizeAffiliateRef,
  openAffiliateProgram,
  readAffiliateRef,
  saveAffiliateRef,
  subscribeAffiliateRef,
} from "@/lib/affiliate";
import { cn } from "@/lib/ui";
import { useAuth } from "@clerk/clerk-react";
import {
  AlertTriangle,
  AppWindow,
  ChefHat,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  Download,
  Gift,
  LogOut,
  PieChart,
  RefreshCcw,
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
  const { signOut } = useAuth();
  const status = useEntitlement((s) => s.status);
  const plan = useEntitlement((s) => s.plan);
  const enterprise = planAllowsEnterprise(status, plan);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demo] = useState(() => isDemoMode());
  const [signoutOpen, setSignoutOpen] = useState(false);
  const [conflictCount, setConflictCount] = useState(0);
  const [conn, setConn] = useState<SyncConnection | null>(() => readConnection());
  const [referralOpen, setReferralOpen] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState("");
  const [codeDraft, setCodeDraft] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const terms = useTerms();

  useEffect(() => {
    let cancelled = false;
    void listConflicts().then((list) => {
      if (!cancelled) setConflictCount(Array.isArray(list) ? list.length : 0);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const stored = readAffiliateRef();
    if (stored) queueMicrotask(() => setAffiliateCode(stored));
    return subscribeAffiliateRef((code) => setAffiliateCode(code ?? ""));
  }, []);

  async function handleSignOut() {
    writeConnection(null);
    setConn(null);
    await signOut();
    toast("Signed out", "ok");
    window.location.reload();
  }

  function openReferral() {
    setCodeDraft(affiliateCode);
    setCodeError(null);
    setReferralOpen(true);
  }

  function saveCode() {
    const code = normalizeAffiliateRef(codeDraft);
    if (!code) {
      setCodeError("Enter a valid code like SCAL-AB12CD34.");
      return;
    }
    const saved = saveAffiliateRef(code);
    if (!saved) {
      setCodeError("Could not save this code on this device.");
      return;
    }
    setAffiliateCode(saved);
    setCodeDraft(saved);
    setCodeError(null);
    toast("Referral code saved", "ok");
  }

  function removeCode() {
    clearAffiliateRef();
    setAffiliateCode("");
    setCodeDraft("");
    setCodeError(null);
    toast("Referral code removed", "warn");
  }

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(affiliateShareUrl(affiliateCode));
      toast("Referral link copied", "ok");
    } catch {
      toast("Could not copy link", "warn");
    }
  }

  async function shareReferral() {
    if (!affiliateCode) {
      openReferral();
      return;
    }
    const url = affiliateShareUrl(affiliateCode);
    const text = `Run your shop with ScalPOS. Use my referral code ${affiliateCode} when you subscribe.`;
    try {
      const mod = await import("@capacitor/share");
      await mod.Share.share({ title: "ScalPOS", text, url });
      toast("Invite shared", "ok");
    } catch {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast("Referral link copied", "ok");
      } catch {
        toast("Sharing is not available here", "warn");
      }
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
          {hasFeature(settings.businessType, "kitchen") && (
            <RowLink
              href="/kitchen"
              icon={<ChefHat className="size-[18px]" />}
              label="Kitchen"
              sub="Tickets through the kitchen"
            />
          )}
          <RowLink
            href="/customers"
            icon={<Users className="size-[18px]" />}
            label={terms.customers}
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
          <RowAction
            icon={<ScrollText className="size-[18px]" />}
            label="Legal"
            sub="Terms, privacy &amp; refund policy"
            onClick={() => {
              void import("@/lib/legal-open").then(async ({ openLegal }) => {
                const internal = await openLegal();
                if (internal) window.location.assign("/legal");
              });
            }}
          />
        </Card>
      </section>

      {enterprise && (
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
      )}

      {/* data */}
      <section className="mt-6">
        <h2 className="text-[15px] font-medium text-ink2">Data</h2>
        <Card inset className="mt-2.5">
          <RowLink
            icon={<Download className="size-[18px]" />}
            label="Backup &amp; recovery"
            sub="Full backup, restore and export"
            href="/backup"
          />
          <RowAction
            icon={<RefreshCcw className="size-[18px]" />}
            tone={demo ? "accent" : "neutral"}
            label={demo ? "Exit demo mode" : "Load demo data"}
            sub={demo ? "Restore your real shop data" : "Try the app with sample products & sales"}
            onClick={() => setDemoOpen(true)}
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
            sub={affiliateCode ? `Your code: ${affiliateCode}` : "20% one-time per Nova POS subscription"}
            onClick={openReferral}
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
                Tools from the ScalPOS team
              </span>
            </span>
          </a>
        </Card>
        <p className="mt-3 pb-6 text-center text-[12px] text-ink3">Version 1.1.0</p>
      </section>

      <Sheet
        open={referralOpen}
        onClose={() => setReferralOpen(false)}
        title="Refer and earn"
        footer={
          affiliateCode ? (
            <Button
              block
              icon={<Gift className="size-[18px]" />}
              onClick={() => void shareReferral()}
            >
              Share referral link
            </Button>
          ) : (
            <Button block variant="secondary" onClick={() => void openAffiliateProgram()}>
              Apply as an affiliate
            </Button>
          )
        }
      >
        <div className="space-y-4 pb-2">
          <p className="text-[14px] leading-5 text-ink2">
            Earn <span className="font-semibold text-ink">20% one-time</span> when a shop
            you refer subscribes to Nova POS.
          </p>
          <Input
            label="Your affiliate code"
            value={codeDraft}
            onChange={(e) => {
              setCodeDraft(e.target.value.toUpperCase());
              setCodeError(null);
            }}
            placeholder="SCAL-XXXXXXXX"
            hint={codeError ? undefined : "Paste the code from your ScalMint affiliate dashboard."}
            error={codeError ?? undefined}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={saveCode} disabled={!codeDraft.trim()}>
              Save code
            </Button>
            {affiliateCode && (
              <Button size="sm" variant="ghost" onClick={removeCode}>
                Remove
              </Button>
            )}
          </div>
          {affiliateCode && (
            <div className="rounded-xl border border-line2 bg-surface2 p-3">
              <p className="text-[12px] font-medium text-ink3">Your referral link</p>
              <p className="mt-1 break-all text-[13px] leading-5 text-ink2">
                {affiliateShareUrl(affiliateCode)}
              </p>
              <Button
                className="mt-2"
                size="sm"
                variant="secondary"
                onClick={() => void copyReferralLink()}
              >
                Copy link
              </Button>
            </div>
          )}
          {!affiliateCode && (
            <button
              type="button"
              onClick={() => void openAffiliateProgram()}
              className="press text-left text-[13px] font-medium text-accent underline underline-offset-2"
            >
              Don&apos;t have a code? Apply at affiliate.scalmint.com
            </button>
          )}
        </div>
      </Sheet>

      <Confirm
        open={signoutOpen}
        onClose={() => setSignoutOpen(false)}
        onConfirm={handleSignOut}
        tone="danger"
        title="Sign out?"
        body="This signs you out and disconnects cloud sync. All of your data stays saved on this device."
        confirmLabel="Sign out"
      />

      <Confirm
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        onConfirm={() => (demo ? exitDemo() : enableDemo())}
        tone={demo ? "danger" : "neutral"}
        title={demo ? "Exit demo mode?" : "Load demo data?"}
        body={
          demo
            ? "Changes made in demo mode will be discarded and your real shop data — saved on this device before the demo — will be restored."
            : "Your current shop data is saved on this device first. Demo products, customers and sales are for trying the app and never sync to your cloud account. You can restore your real data anytime from More → Data."
        }
        confirmLabel={demo ? "Restore my data" : "Load demo data"}
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

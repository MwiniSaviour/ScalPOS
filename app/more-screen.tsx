"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { QuickTile } from "@/components/ui/quicktile";
import { clearAllImages } from "@/lib/image-store";
import { Confirm } from "@/components/ui/confirm";
import { ScreenHeader } from "@/components/shell/screenheader";
import { useSettings, usePos } from "@/lib/store";
import {
  ChevronRight,
  Download,
  PieChart,
  RefreshCcw,
  Settings,
  Store,
  Users,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";

export default function MoreScreen() {
  const router = useRouter();
  const settings = useSettings();
  const toast = usePos((s) => s.toast);
  const [demoOpen, setDemoOpen] = useState(false);

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

  return (
    <div className="anim-fade">
      <ScreenHeader title="More" subtitle={settings.shopName} />

      {/* quick tiles */}
      <section className="px-4 pb-5">
        <div className="flex gap-2">
          <QuickTile icon={<PieChart className="size-[22px]" />} label="Reports" onClick={() => router.push("/reports")} tone="accent" />
          <QuickTile icon={<Warehouse className="size-[22px]" />} label="Stock" onClick={() => router.push("/stock")} tone="warn" />
          <QuickTile icon={<Users className="size-[22px]" />} label="Customers" onClick={() => router.push("/customers")} tone="violet" />
          <QuickTile icon={<Store className="size-[22px]" />} label="Categories" onClick={() => router.push("/categories")} tone="info" />
        </div>
      </section>

      {/* business */}
      <section className="px-4 pb-4">
        <Card inset>
          <CardTitle>Business</CardTitle>
          <RowLink href="/settings/shop" icon={<Store className="size-[18px]" />} label="Shop details" sub="Name, address, phone" />
          <RowLink href="/settings" icon={<Settings className="size-[18px]" />} label="Settings" sub="Theme, receipts, MoMo" />
        </Card>
      </section>

      {/* data */}
      <section className="px-4 pb-4">
        <Card inset>
          <CardTitle>Data</CardTitle>
          <RowAction
            icon={<Download className="size-[18px]" />}
            label="Export data"
            sub="Save a JSON backup to your device"
            onClick={exportData}
          />
          <RowAction
            icon={<RefreshCcw className="size-[18px]" />}
            label="Load demo store"
            sub="Wipe this register and reload sample data"
            onClick={() => setDemoOpen(true)}
          />
        </Card>
      </section>

      {/* about */}
      <section className="px-4 pb-36">
        <p className="text-[12px] font-medium text-ink2">Nova POS 1.0.0</p>
        <p className="mt-1 text-[12px] leading-5 text-ink3">
          Built for Ghanaian retail — cedi money, MoMo payments and credit tracking, all stored on this device.
        </p>
      </section>

      <Confirm
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        onConfirm={async () => {
          await clearAllImages();
          localStorage.removeItem("nova-pos-v1");
          location.reload();
        }}
        tone="danger"
        title="Load demo store?"
        body="This clears everything saved on this device — products, orders, customers and uploaded photos — and reloads the sample store."
        confirmLabel="Load demo"
      />
    </div>
  );
}



function RowLink({
  href,
  icon,
  label,
  sub,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <Link href={href} className="press flex min-h-[52px] items-center gap-3 px-4 py-3 hover:bg-surface2/50">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface2 text-ink2">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-ink">{label}</span>
        {sub && <span className="block text-[12px] leading-4 text-ink3 line-clamp-2">{sub}</span>}
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink4" />
    </Link>
  );
}

function RowAction({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="press flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface2/50">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface2 text-ink2">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-ink">{label}</span>
        {sub && <span className="block text-[12px] leading-4 text-ink3 line-clamp-2">{sub}</span>}
      </span>
    </button>
  );
}

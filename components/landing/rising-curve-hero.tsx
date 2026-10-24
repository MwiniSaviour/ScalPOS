"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  ChevronRight,
  CircleUserRound,
  Clock,
  Plus,
  Search,
} from "lucide-react";
import { fmtMoney } from "@/lib/money";
import { cn } from "@/lib/ui";
import {
  DEMO_PRODUCTS,
  HERO_PREVIEW_TABS,
  RISING_MILESTONES,
  type CurveMilestoneId,
  type HeroPreviewTabId,
} from "./landing-data";

export function RisingCurveInfographic({
  onLaunchRegister,
}: {
  onLaunchRegister: (route?: string) => void;
}) {
  const [activeStage, setActiveStage] = useState<CurveMilestoneId | null>(null);
  const [activeTab, setActiveTab] = useState<HeroPreviewTabId>("home");
  const [previewCartCount, setPreviewCartCount] = useState<number>(3);
  const [previewCartTotal, setPreviewCartTotal] = useState<number>(250);

  return (
    <div className="relative mt-8 w-full select-none">
      {/* =====================================================================
          1. FULL-BLEED RISING OUTCOME CURVE + 4 CLEAN EDITORIAL COLUMNS
         ===================================================================== */}
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* SVG Rising Curve + Vertical Dotted Drop-Lines */}
        <div className="relative hidden md:block">
          <svg
            viewBox="0 0 1200 280"
            className="h-[210px] w-full overflow-visible lg:h-[250px]"
            aria-label="Rising retail trajectory across Start, Sell, Collect, and Scale"
            role="img"
          >
            <defs>
              <linearGradient
                id="novaRisingGradient"
                x1="0%"
                y1="85%"
                x2="100%"
                y2="5%"
              >
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                <stop offset="18%" stopColor="#60a5fa" stopOpacity="1" />
                <stop offset="42%" stopColor="#a78bfa" stopOpacity="1" />
                <stop offset="68%" stopColor="#fb923c" stopOpacity="1" />
                <stop offset="90%" stopColor="#34d399" stopOpacity="1" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.85" />
              </linearGradient>

              <filter
                id="novaCurveGlow"
                x="-20%"
                y="-30%"
                width="140%"
                height="160%"
              >
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Soft ambient glow along the curve */}
            <path
              d="M -60 212 C 150 210, 340 192, 540 158 C 760 120, 960 62, 1260 -22"
              fill="none"
              stroke="url(#novaRisingGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.22"
              filter="url(#novaCurveGlow)"
            />

            {/* Primary rising trajectory arc */}
            <path
              d="M -60 212 C 150 210, 340 192, 540 158 C 760 120, 960 62, 1260 -22"
              fill="none"
              stroke="url(#novaRisingGradient)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Vertical dotted drop-lines & milestone nodes */}
            {RISING_MILESTONES.map((m) => {
              const isHovered = m.id === activeStage;
              return (
                <g
                  key={m.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveStage(m.id)}
                  onMouseLeave={() => setActiveStage(null)}
                >
                  {/* Vertical dotted connector line */}
                  <line
                    x1={m.cx}
                    y1={m.cy + 14}
                    x2={m.cx}
                    y2={276}
                    stroke={
                      isHovered ? m.color : "rgba(203, 213, 225, 0.28)"
                    }
                    strokeWidth="1.5"
                    strokeDasharray="2 5"
                  />

                  {/* Subtle outer halo */}
                  <circle
                    cx={m.cx}
                    cy={m.cy}
                    r={isHovered ? 18 : 14}
                    fill={m.glowColor}
                  />

                  {/* Dark ring separator */}
                  <circle
                    cx={m.cx}
                    cy={m.cy}
                    r={10}
                    fill="#111633"
                  />

                  {/* Inner solid node */}
                  <circle
                    cx={m.cx}
                    cy={m.cy}
                    r={isHovered ? 7.5 : 6.5}
                    fill={m.color}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* 4 Unboxed Editorial Columns Aligned Beneath the 4 Vertical Lines */}
        <div className="mt-2 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 md:gap-7 lg:gap-10">
          {RISING_MILESTONES.map((m) => {
            const isHovered = m.id === activeStage;
            return (
              <div
                key={m.id}
                onMouseEnter={() => setActiveStage(m.id)}
                onMouseLeave={() => setActiveStage(null)}
                className="group text-left transition-opacity duration-200"
              >
                {/* Mobile color node indicator */}
                <div className="mb-2.5 flex items-center gap-2 md:hidden">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="tabnum text-xs font-medium text-slate-400">
                    {m.outcomeMetric}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <h3
                    className={cn(
                      "text-[22px] font-bold tracking-[-0.02em] transition-colors sm:text-[24px]",
                      isHovered ? "text-white" : "text-white/95",
                    )}
                  >
                    {m.title}
                  </h3>
                  <span className="tabnum hidden text-xs font-medium text-slate-400 md:inline">
                    {m.outcomeMetric}
                  </span>
                </div>

                <p className="mt-2 text-[14px] leading-[1.6] text-slate-300/80">
                  {m.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          2. BOTTOM-OF-HERO TABBED PRODUCT PREVIEW
             Minimal text tabs + clean application frame without fake traffic lights
         ===================================================================== */}
      <div className="mx-auto mt-16 max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Clean Text Tab Strip */}
        <div
          role="tablist"
          aria-label="Nova POS Workspace Views"
          className="no-scrollbar flex items-center justify-start gap-6 overflow-x-auto pb-4 sm:justify-center sm:gap-9"
        >
          {HERO_PREVIEW_TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "press shrink-0 text-[15px] transition-colors",
                  active
                    ? "font-semibold text-white"
                    : "font-medium text-slate-400 hover:text-slate-200",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Clean Application Window Frame */}
        <div className="mt-2 overflow-hidden rounded-t-2xl rounded-b-xl border border-white/12 bg-[#0c1220] shadow-[0_28px_80px_-20px_rgba(0,0,0,0.8)]">
          {/* Application Chrome Bar (Clean icons + centered search + profile, no fake macOS dots) */}
          <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#111827] px-4 py-2.5 sm:px-5">
            <div className="flex items-center gap-3 text-slate-400">
              <Clock className="size-4" />
              <span className="text-xs font-medium text-slate-300">
                Bright Corner Stores
              </span>
              <span className="hidden text-xs text-slate-500 md:inline">
                · Osu Badu St, Accra
              </span>
            </div>

            <div className="hidden flex-1 justify-center sm:flex">
              <div className="flex w-full max-w-sm items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#0a0e17] px-3 py-1.5 text-xs text-slate-400">
                <Search className="size-3.5 text-slate-500" />
                <span>Search products, barcodes, or orders</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-400">
              <Bell className="hidden size-4 sm:block" />
              <CircleUserRound className="hidden size-4 sm:block" />
              <button
                type="button"
                onClick={() => {
                  const target =
                    HERO_PREVIEW_TABS.find((t) => t.id === activeTab)?.route ??
                    "/home";
                  onLaunchRegister(target);
                }}
                className="press inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/15"
              >
                <span>Open view</span>
                <ArrowUpRight className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Tab Content Body */}
          <div className="p-4 sm:p-6">
            {activeTab === "home" && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                <div className="space-y-4 lg:col-span-5">
                  <div className="rounded-xl border border-white/10 bg-[#121a28] p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-200">
                        Today&rsquo;s sales
                      </span>
                      <span className="tabnum text-xs text-slate-400">
                        14 sales
                      </span>
                    </div>
                    <p className="tabnum mt-2 text-3xl font-extrabold tracking-tight text-white">
                      {fmtMoney(1842.5)}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3.5">
                      <div>
                        <p className="text-xs text-slate-400">Collected</p>
                        <p className="tabnum mt-0.5 text-sm font-semibold text-white">
                          {fmtMoney(1692.5)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Unpaid</p>
                        <p className="tabnum mt-0.5 text-sm font-semibold text-amber-400">
                          {fmtMoney(150)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#121a28] p-4">
                    <p className="text-xs font-medium text-slate-400">
                      Needs attention
                    </p>
                    <div className="mt-2.5 divide-y divide-white/10">
                      <button
                        type="button"
                        onClick={() => setActiveTab("customers")}
                        className="flex w-full items-center justify-between py-2.5 text-left"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">
                            Pending orders
                          </p>
                          <p className="text-xs text-slate-400">
                            Waiting to be fulfilled
                          </p>
                        </div>
                        <span className="flex items-center gap-1.5">
                          <span className="tabnum text-sm font-bold text-white">
                            2
                          </span>
                          <ChevronRight className="size-4 text-slate-500" />
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("inventory")}
                        className="flex w-full items-center justify-between pt-2.5 text-left"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">
                            Low stock
                          </p>
                          <p className="text-xs text-slate-400">
                            Sugar 1kg · Hand Sanitizer
                          </p>
                        </div>
                        <span className="flex items-center gap-1.5">
                          <span className="tabnum text-sm font-bold text-white">
                            3
                          </span>
                          <ChevronRight className="size-4 text-slate-500" />
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#121a28] p-5 lg:col-span-7">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-200">
                      Recent orders
                    </h4>
                    <button
                      type="button"
                      onClick={() => onLaunchRegister("/sell")}
                      className="press inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                    >
                      <Plus className="size-3.5" />
                      New sale
                    </button>
                  </div>

                  <div className="mt-3 divide-y divide-white/10">
                    {[
                      {
                        id: "ORD0000201",
                        customer: "Walk-in",
                        summary: "2h ago · 5 items",
                        amount: 46.0,
                        status: "Paid",
                        unpaid: false,
                      },
                      {
                        id: "ORD0000200",
                        customer: "Ama Serwaa",
                        summary: "4h ago · 3 items · MTN MoMo",
                        amount: 75.0,
                        status: "Paid",
                        unpaid: false,
                      },
                      {
                        id: "ORD0000199",
                        customer: "Kwame Mensah",
                        summary: "6h ago · 6 items · Part-paid",
                        amount: 282.0,
                        status: "Unpaid",
                        unpaid: true,
                      },
                      {
                        id: "ORD0000198",
                        customer: "Akua Owusu",
                        summary: "Yesterday · 2 items · Card",
                        amount: 110.0,
                        status: "Paid",
                        unpaid: false,
                      },
                    ].map((ord) => (
                      <div
                        key={ord.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {ord.customer}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            {ord.summary}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="tabnum text-sm font-bold text-white">
                            {fmtMoney(ord.amount)}
                          </p>
                          <p
                            className={cn(
                              "text-xs",
                              ord.unpaid
                                ? "font-medium text-amber-400"
                                : "text-slate-400",
                            )}
                          >
                            {ord.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "register" && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {DEMO_PRODUCTS.slice(0, 4).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPreviewCartCount((c) => c + 1);
                          setPreviewCartTotal((t) => t + p.price);
                        }}
                        className="press group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#121a28] p-2.5 text-left hover:border-white/25"
                      >
                        <div className="relative h-24 w-full overflow-hidden rounded-lg bg-[#1a2332]">
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="mt-2 truncate text-xs font-semibold text-white">
                          {p.name}
                        </p>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="tabnum text-sm font-bold text-white">
                            {fmtMoney(p.price)}
                          </span>
                          <span className="tabnum text-[11px] text-slate-400">
                            {p.stock} {p.unit}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#121a28] p-4 lg:col-span-4">
                  <div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <span className="text-sm font-semibold text-white">
                        Current sale
                      </span>
                      <span className="tabnum text-xs text-slate-400">
                        {previewCartCount} items
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Customer</span>
                        <span className="font-medium text-white">
                          Ama Serwaa
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Stock sync</span>
                        <span className="font-medium text-white">
                          Auto-decrement
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-white/10 pt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">Total</span>
                      <span className="tabnum text-xl font-bold text-white">
                        {fmtMoney(previewCartTotal)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onLaunchRegister("/sell")}
                      className="press mt-3 flex w-full items-center justify-center rounded-lg bg-emerald-500 py-2.5 text-xs font-semibold text-[#06281a]"
                    >
                      Charge {fmtMoney(previewCartTotal)}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "checkout" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  {
                    title: "MTN MoMo & Telecel Cash",
                    body: "Display your shop MoMo number on receipts and log transaction references (e.g. MTN-TX882) for end-of-day balancing.",
                    meta: "Merchant: 024 555 1020",
                  },
                  {
                    title: "Split Tenders & Change Due",
                    body: "Combine Cash and Mobile Money on a single order, or enter cash tendered to compute exact customer change immediately.",
                    meta: "Tendered ₵200 · Change ₵35",
                  },
                  {
                    title: "ESC/POS Thermal Receipts",
                    body: "Print 32-column receipts directly to 58mm/80mm Bluetooth thermal printers or share digital receipts with shoppers.",
                    meta: "Bluetooth ESC/POS ready",
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#121a28] p-4"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        {card.title}
                      </h4>
                      <p className="mt-2 text-xs leading-relaxed text-slate-300">
                        {card.body}
                      </p>
                    </div>
                    <p className="tabnum mt-4 border-t border-white/10 pt-2.5 text-xs font-medium text-slate-400">
                      {card.meta}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "inventory" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="rounded-xl border border-white/10 bg-[#121a28] p-4 md:col-span-7">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">
                      Catalog & stock levels
                    </h4>
                    <span className="tabnum text-xs text-slate-400">
                      14 products
                    </span>
                  </div>
                  <div className="mt-3 divide-y divide-white/10">
                    {DEMO_PRODUCTS.slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="size-9 rounded-lg object-cover"
                          />
                          <div>
                            <p className="text-sm font-medium text-white">
                              {p.name}
                            </p>
                            <p className="tabnum text-xs text-slate-400">
                              {p.sku} · {fmtMoney(p.price)}
                            </p>
                          </div>
                        </div>
                        <span className="tabnum text-xs font-semibold text-slate-200">
                          {p.stock} {p.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#121a28] p-4 md:col-span-5">
                  <h4 className="text-sm font-semibold text-white">
                    Stock movement log
                  </h4>
                  <div className="mt-3 divide-y divide-white/10 text-xs">
                    {[
                      {
                        item: "Bathing Soap",
                        delta: "+50 pcs",
                        reason: "Purchase · Supplier trip",
                      },
                      {
                        item: "Rice 5kg",
                        delta: "-2 bag",
                        reason: "Sale · ORD0000199",
                      },
                      {
                        item: "Hand Sanitizer",
                        delta: "-1 pcs",
                        reason: "Damage · Broken bottle",
                      },
                    ].map((mv) => (
                      <div
                        key={mv.item}
                        className="flex items-center justify-between py-2.5"
                      >
                        <div>
                          <p className="font-medium text-white">{mv.item}</p>
                          <p className="text-slate-400">{mv.reason}</p>
                        </div>
                        <span className="tabnum font-semibold text-slate-200">
                          {mv.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "customers" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  {
                    name: "Kwame Mensah",
                    phone: "055 188 3404 · Haatso, Accra",
                    due: 182.0,
                    orders: 8,
                  },
                  {
                    name: "Kofi Boateng",
                    phone: "024 410 0663 · Madina, Accra",
                    due: 120.0,
                    orders: 5,
                  },
                  {
                    name: "Ama Serwaa",
                    phone: "024 455 5102 · Osu Badu St, Accra",
                    due: 0,
                    orders: 19,
                  },
                ].map((c) => (
                  <div
                    key={c.name}
                    className="rounded-xl border border-white/10 bg-[#121a28] p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {c.name}
                        </p>
                        <p className="tabnum text-xs text-slate-400">
                          {c.phone}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "tabnum text-xs font-semibold",
                          c.due > 0 ? "text-amber-400" : "text-slate-400",
                        )}
                      >
                        {c.due > 0 ? `Owes ${fmtMoney(c.due)}` : "Settled"}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-2.5 text-xs">
                      <span className="tabnum text-slate-400">
                        {c.orders} orders
                      </span>
                      <Link
                        href="/customers"
                        className="font-medium text-emerald-400 hover:underline"
                      >
                        View ledger
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "reports" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="rounded-xl border border-white/10 bg-[#121a28] p-4 md:col-span-7">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-xs text-slate-400">7-day sales</p>
                      <p className="tabnum text-2xl font-bold text-white">
                        {fmtMoney(9480)}
                      </p>
                    </div>
                    <span className="tabnum text-xs font-medium text-emerald-400">
                      +18.6% vs prior week
                    </span>
                  </div>
                  <div className="mt-4 flex h-24 items-end gap-2 pt-2">
                    {[
                      { d: "M", h: "48%" },
                      { d: "T", h: "62%" },
                      { d: "W", h: "55%" },
                      { d: "T", h: "74%" },
                      { d: "F", h: "88%" },
                      { d: "S", h: "100%" },
                      { d: "Today", h: "78%", active: true },
                    ].map((bar, i) => (
                      <div
                        key={i}
                        className="flex flex-1 flex-col items-center gap-1.5"
                      >
                        <div className="flex h-16 w-full items-end rounded bg-white/5">
                          <div
                            style={{ height: bar.h }}
                            className={cn(
                              "w-full rounded",
                              bar.active ? "bg-emerald-400" : "bg-slate-600",
                            )}
                          />
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {bar.d}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#121a28] p-4 md:col-span-5">
                  <h4 className="text-sm font-semibold text-white">
                    Payment mix
                  </h4>
                  <div className="mt-3 space-y-2.5 text-xs">
                    {[
                      { label: "Mobile Money", pct: "48%", amt: 4550.4 },
                      { label: "Cash", pct: "37%", amt: 3507.6 },
                      { label: "Card", pct: "10%", amt: 948.0 },
                      { label: "Credit", pct: "5%", amt: 474.0 },
                    ].map((pm) => (
                      <div
                        key={pm.label}
                        className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0"
                      >
                        <span className="text-slate-300">{pm.label}</span>
                        <span className="tabnum font-semibold text-white">
                          {fmtMoney(pm.amt)} ({pm.pct})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "staff" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Role permissions",
                    body: "Assign Owner, Supervisor, and Cashier accounts so attendants can sell while owners control stock & pricing.",
                  },
                  {
                    title: "Offline outbox & conflict guard",
                    body: "Changes queue locally when offline and sync automatically. Conflicting edits are surfaced in /conflicts for review.",
                  },
                  {
                    title: "Sale & low-stock alerts",
                    body: "Owners and supervisors get notified when sales complete or when any product drops below its low-stock threshold.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-white/10 bg-[#121a28] p-4"
                  >
                    <h4 className="text-sm font-semibold text-white">
                      {item.title}
                    </h4>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

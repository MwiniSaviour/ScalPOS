"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { markOnboarded } from "@/lib/first-run";
import { fmtMoney } from "@/lib/money";
import { usePos } from "@/lib/store";
import { cn } from "@/lib/ui";
import {
  FAQ_ITEMS,
  PLAN_COMPARISON,
  TESTIMONIALS,
} from "./landing-data";
import { RisingCurveInfographic } from "./rising-curve-hero";
import { InteractiveRegisterDemo } from "./interactive-register-demo";
import { OutcomesInfographic } from "./outcomes-infographic";

export default function LandingScreen() {
  const router = useRouter();
  const theme = usePos((s) => s.settings.theme);
  const updateSettings = usePos((s) => s.updateSettings);
  const toast = usePos((s) => s.toast);

  const [heroInput, setHeroInput] = useState("");
  const [ctaInput, setCtaInput] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<
    "product" | "resources" | null
  >(null);
  const [renewalMode, setRenewalMode] = useState<"manual" | "auto">("manual");
  const [showFullComparison, setShowFullComparison] = useState(false);
  const [openFaqId, setOpenFaqId] = useState<string>("faq-1");
  const [scrolled, setScrolled] = useState(false);

  const navRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 16);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    updateSettings({ theme: next });
  }

  function launchApp(route = "/home", customInput?: string) {
    const trimmed = (customInput ?? "").trim();
    markOnboarded();
    if (trimmed) {
      if (trimmed.includes("@")) {
        router.push(`/auth`);
        return;
      }
      updateSettings({ shopName: trimmed });
      toast(`Welcome to ${trimmed}`, "ok");
    }
    router.push(route);
  }

  return (
    <div className="min-h-dvh w-full bg-bg text-ink">
      {/* =====================================================================
          1. STICKY TOP NAVBAR (Minimal, Clean, Reference-Aligned)
         ===================================================================== */}
      <header
        ref={navRef}
        className={cn(
          "sticky top-0 z-50 w-full transition-colors duration-200",
          scrolled
            ? "border-b border-white/10 bg-[#101530]/95 text-white backdrop-blur-md"
            : "bg-[#151a3d] text-white",
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand + Clean Nav Links */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="press flex items-center gap-2 focus:outline-none"
            >
              <img src="/icon-512.png" alt="ScalPOS" className="size-7 rounded-lg" draggable={false} />
              <span className="text-[19px] font-bold tracking-tight text-white">
                ScalPOS
              </span>
            </Link>

            <nav
              aria-label="Primary Navigation"
              className="hidden items-center gap-6 md:flex"
            >
              {/* Product Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenDropdown((d) => (d === "product" ? null : "product"))
                  }
                  aria-expanded={openDropdown === "product"}
                  className="press flex items-center gap-1 text-sm font-medium text-slate-200 hover:text-white"
                >
                  <span>Product</span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      openDropdown === "product" && "rotate-180",
                    )}
                  />
                </button>
                {openDropdown === "product" && (
                  <div className="anim-fade absolute left-0 top-full mt-3 w-72 rounded-xl border border-white/12 bg-[#11182d] p-2 text-white shadow-2xl">
                    {[
                      {
                        title: "Point of Sale Register",
                        desc: "Barcode scan, cart & discounts",
                        route: "/sell",
                      },
                      {
                        title: "Cash, MoMo & Split Checkout",
                        desc: "Multi-tender & change calculation",
                        route: "/pay",
                      },
                      {
                        title: "Inventory & Stock Log",
                        desc: "WebP photos & low-stock alerts",
                        route: "/inventory",
                      },
                      {
                        title: "Customers & Credit",
                        desc: "Part-payments & running balances",
                        route: "/customers",
                      },
                      {
                        title: "Sales & Payment Reports",
                        desc: "Daily totals & tender mix",
                        route: "/reports",
                      },
                    ].map((item) => (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          launchApp(item.route);
                        }}
                        className="block w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/8"
                      >
                        <p className="text-xs font-semibold text-white">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {item.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Resources Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenDropdown((d) =>
                      d === "resources" ? null : "resources",
                    )
                  }
                  aria-expanded={openDropdown === "resources"}
                  className="press flex items-center gap-1 text-sm font-medium text-slate-200 hover:text-white"
                >
                  <span>Resources</span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      openDropdown === "resources" && "rotate-180",
                    )}
                  />
                </button>
                {openDropdown === "resources" && (
                  <div className="anim-fade absolute left-0 top-full mt-3 w-64 rounded-xl border border-white/12 bg-[#11182d] p-2 text-white shadow-2xl">
                    {[
                      {
                        label: "Register Playground",
                        href: "#showcase",
                        sub: "Try checkout & thermal receipts",
                      },
                      {
                        label: "Profit Recovery Calculator",
                        href: "#outcomes",
                        sub: "Estimate annual recovered margin",
                      },
                      {
                        label: "Frequently Asked Questions",
                        href: "#faq",
                        sub: "Offline sync, hardware & billing",
                      },
                    ].map((res) => (
                      <a
                        key={res.label}
                        href={res.href}
                        onClick={() => setOpenDropdown(null)}
                        className="block rounded-lg px-3 py-2 transition-colors hover:bg-white/8"
                      >
                        <p className="text-xs font-semibold text-white">
                          {res.label}
                        </p>
                        <p className="text-[11px] text-slate-400">{res.sub}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <a
                href="#features"
                className="press text-sm font-medium text-slate-200 hover:text-white"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="press text-sm font-medium text-slate-200 hover:text-white"
              >
                Pricing
              </a>
            </nav>
          </div>

          {/* Right: Theme Switch, Log in, Get started */}
          <div className="hidden items-center gap-5 md:flex">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              className="press text-slate-300 hover:text-white"
            >
              {theme === "light" ? (
                <Moon className="size-4" />
              ) : (
                <Sun className="size-4" />
              )}
            </button>

            <Link
              href="/auth"
              className="press text-sm font-medium text-slate-200 hover:text-white"
            >
              Log in
            </Link>

            <button
              type="button"
              onClick={() => launchApp("/sell")}
              className="press rounded-lg bg-[#5850ec] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4f46e5]"
            >
              Get started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2.5 md:hidden">
            <button
              type="button"
              onClick={() => launchApp("/sell")}
              className="press rounded-lg bg-[#5850ec] px-3 py-1.5 text-xs font-semibold text-white"
            >
              Get started
            </button>
            <button
              type="button"
              aria-label="Toggle Menu"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="press flex size-9 items-center justify-center rounded-lg text-white"
            >
              {mobileMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="anim-fade border-b border-white/10 bg-[#151a3d] px-4 pt-2 pb-5 md:hidden">
            <div className="flex flex-col space-y-1 text-sm font-medium text-slate-200">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-white/8"
              >
                Features
              </a>
              <a
                href="#showcase"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-white/8"
              >
                Register preview
              </a>
              <a
                href="#outcomes"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-white/8"
              >
                Outcomes &amp; ROI
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-white/8"
              >
                Pricing
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-white/8"
              >
                FAQ
              </a>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-white/10 pt-4">
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="press flex items-center justify-center rounded-lg border border-white/15 py-2 text-xs font-semibold text-white"
              >
                Log in
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  launchApp("/home");
                }}
                className="press flex items-center justify-center rounded-lg bg-[#5850ec] py-2 text-xs font-semibold text-white"
              >
                Open POS
              </button>
            </div>
          </div>
        )}
      </header>

      {/* =====================================================================
          2. HERO SECTION (Clean, Uncluttered, Reference-Faithful)
         ===================================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#151a3d] via-[#1c1642] to-[#0a0e17] pt-12 pb-16 text-white sm:pt-16 sm:pb-24">
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-[-0.03em] text-white sm:text-5xl md:text-[56px]">
            The all-in-one point of sale platform for{" "}
            <span className="text-[#f49cbb]">businesses</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-200/85 sm:text-base">
            Build a home for your register, inventory, and mobile money
            collections — all under your own shop brand, online or offline.
          </p>

          {/* Clean White Input Container + Solid Button (Matching Reference) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              launchApp("/home", heroInput);
            }}
            className="mx-auto mt-8 flex max-w-md flex-col gap-2 rounded-xl bg-white p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.45)] sm:flex-row sm:items-center"
          >
            <input
              type="text"
              value={heroInput}
              onChange={(e) => setHeroInput(e.target.value)}
              placeholder="Enter your email or shop name"
              aria-label="Enter your email or shop name"
              className="w-full flex-1 bg-transparent px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="press shrink-0 rounded-lg bg-[#5850ec] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#4f46e5]"
            >
              Get started
            </button>
          </form>
        </div>

        {/* Rising Curve + 4 Editorial Columns + Tabbed App Frame */}
        <RisingCurveInfographic
          onLaunchRegister={(route) => launchApp(route ?? "/home")}
        />
      </section>

      {/* =====================================================================
          3. ARCHITECTURAL METRICS & SOCIAL PROOF STRIP
         ===================================================================== */}
      <section
        aria-label="Retail metrics"
        className="border-b border-line bg-surface"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 divide-y divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {[
              {
                value: fmtMoney(18400000) + "+",
                label: "Annualized retail sales tracked",
              },
              {
                value: "100%",
                label: "Offline checkout availability",
              },
              {
                value: "2.4s",
                label: "Average barcode-to-receipt time",
              },
              {
                value: "₵120/yr",
                label: "Standard yearly cloud plan",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="py-8 sm:px-6 first:sm:pl-0 last:sm:pr-0"
              >
                <p className="tabnum text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-ink3">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. CORE CAPABILITIES (Clean Asymmetric Grid — No Icon Squares or Pills)
         ===================================================================== */}
      <section id="features" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Built for how retail counters actually work
            </h2>
            <p className="mt-2.5 text-base text-ink2">
              Every workflow—from offline barcode checkout and Mobile Money
              reconciliation to customer credit ledgers—lives in one fast,
              local-first application.
            </p>
          </div>

          {/* Asymmetric 12-Column Grid */}
          <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Card 1 (7 Cols): Offline-First Architecture */}
            <div className="flex flex-col justify-between rounded-2xl border border-line2 bg-surface p-6 sm:p-8 lg:col-span-7">
              <div>
                <p className="text-xs font-medium text-ink3">
                  Local-first architecture
                </p>
                <h3 className="mt-1.5 text-xl font-bold text-ink">
                  Works without internet. Syncs when signal returns.
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink2">
                  Your catalog, orders, and customer balances are persisted on
                  the device. Product photos are compressed to ≤512px WebP
                  blobs in IndexedDB so the register never stalls when data or
                  power fluctuates.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-surface2/50 p-4 text-xs">
                <div className="pr-3">
                  <p className="text-ink3">Ledger storage</p>
                  <p className="mt-0.5 font-semibold text-ink">
                    On-device + Outbox
                  </p>
                </div>
                <div className="px-3">
                  <p className="text-ink3">Product media</p>
                  <p className="mt-0.5 font-semibold text-ink">
                    IndexedDB WebP
                  </p>
                </div>
                <div className="pl-3">
                  <p className="text-ink3">Multi-device edits</p>
                  <p className="mt-0.5 font-semibold text-ink">
                    Conflict resolution
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2 (5 Cols): Ghana Payments & Split Tenders */}
            <div className="flex flex-col justify-between rounded-2xl border border-line2 bg-surface p-6 sm:p-8 lg:col-span-5">
              <div>
                <p className="text-xs font-medium text-ink3">
                  Tender flexibility
                </p>
                <h3 className="mt-1.5 text-xl font-bold text-ink">
                  Cash, MTN MoMo, Card &amp; split payments
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink2">
                  Record single or combined tenders on any order, calculate
                  exact change on cash notes, and log Mobile Money transaction
                  references for clean evening balancing.
                </p>
              </div>

              <div className="mt-6 space-y-2 rounded-xl border border-line bg-surface2/50 p-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink2">MTN MoMo · MTN-TX001</span>
                  <span className="tabnum font-semibold text-ink">
                    {fmtMoney(75)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-line pt-2">
                  <span className="text-ink2">Cash tendered (Change ₵14)</span>
                  <span className="tabnum font-semibold text-ink">
                    {fmtMoney(46)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3 (4 Cols): Customer Credit Ledger */}
            <div className="flex flex-col justify-between rounded-2xl border border-line2 bg-surface p-6 lg:col-span-4">
              <div>
                <p className="text-xs font-medium text-ink3">
                  Credit management
                </p>
                <h3 className="mt-1.5 text-lg font-bold text-ink">
                  Customer credit &amp; debt collection
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink2">
                  Attach part-paid sales to customer profiles, track running
                  balances owed across orders, and record repayments in one tap.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-xs">
                <span className="font-medium text-ink">
                  Kwame Mensah (ORD0000199)
                </span>
                <span className="tabnum font-semibold text-warn">
                  Owes {fmtMoney(182)}
                </span>
              </div>
            </div>

            {/* Card 4 (4 Cols): Stock Audit & Barcode */}
            <div className="flex flex-col justify-between rounded-2xl border border-line2 bg-surface p-6 lg:col-span-4">
              <div>
                <p className="text-xs font-medium text-ink3">
                  Inventory control
                </p>
                <h3 className="mt-1.5 text-lg font-bold text-ink">
                  Barcode scanner &amp; movement log
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink2">
                  Scan barcodes with your phone camera. Every stock change
                  records a reason: Purchase, Sale, Damage, Return, Count, or
                  Opening.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-xs">
                <span className="text-ink2">Low-stock alerts</span>
                <span className="font-medium text-ink">Per-SKU threshold</span>
              </div>
            </div>

            {/* Card 5 (4 Cols): Thermal Receipts & Team Roles */}
            <div className="flex flex-col justify-between rounded-2xl border border-line2 bg-surface p-6 lg:col-span-4">
              <div>
                <p className="text-xs font-medium text-ink3">
                  Receipts &amp; staff
                </p>
                <h3 className="mt-1.5 text-lg font-bold text-ink">
                  Bluetooth ESC/POS &amp; team roles
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink2">
                  Print 32-column thermal receipts over Bluetooth or share
                  digital receipts. Assign Owner, Supervisor, and Cashier
                  permissions.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-xs">
                <span className="text-ink2">Printer protocol</span>
                <span className="font-medium text-ink">58mm / 80mm ESC/POS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. INTERACTIVE REGISTER SHOWCASE
         ===================================================================== */}
      <section
        id="showcase"
        className="scroll-mt-20 border-y border-line bg-surface2/30 py-16 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Test the register right here
            </h2>
            <p className="mt-2 text-base text-ink2">
              Add items from the sample catalog, choose a tender method, and
              inspect the live 32-column thermal receipt.
            </p>
          </div>

          <InteractiveRegisterDemo
            onLaunchRegister={(route) => launchApp(route ?? "/sell")}
          />
        </div>
      </section>

      {/* =====================================================================
          6. OUTCOMES & RISING RETENTION TRAJECTORY
         ===================================================================== */}
      <section id="outcomes" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Measurable outcomes across your shop
            </h2>
            <p className="mt-2 text-base text-ink2">
              Replacing paper credit books and manual stock counts recovers
              margin from week one.
            </p>
          </div>

          <OutcomesInfographic
            onLaunchRegister={(route) => launchApp(route ?? "/home")}
          />
        </div>
      </section>

      {/* =====================================================================
          7. TESTIMONIALS (Clean Editorial Grid — No Neon Pills)
         ===================================================================== */}
      <section className="border-y border-line bg-surface2/30 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Used by shop owners across Ghana
            </h2>
            <p className="mt-2 text-base text-ink2">
              From neighborhood provision stores in Osu to electronics hubs in
              Kumasi Adum.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <article
                key={t.id}
                className="flex flex-col justify-between rounded-2xl border border-line2 bg-surface p-6 sm:p-8"
              >
                <div>
                  <div className="flex items-baseline justify-between border-b border-line pb-3 text-xs">
                    <span className="text-ink3">{t.metricLabel}</span>
                    <span className="tabnum font-bold text-ink">
                      {t.metricValue}
                    </span>
                  </div>
                  <blockquote className="mt-4 text-[15px] leading-relaxed text-ink">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                </div>

                <div className="mt-6 pt-2">
                  <p className="text-sm font-semibold text-ink">{t.name}</p>
                  <p className="text-xs text-ink3">
                    {t.role}, {t.shopName} · {t.location}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          8. PRICING SECTION (Clean Architectural Columns)
         ===================================================================== */}
      <section id="pricing" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Simple yearly pricing in Ghana cedis
              </h2>
              <p className="mt-2 text-base text-ink2">
                Every shop starts with a full 7-day free trial — no card
                needed. After that, pick a plan to keep using ScalPOS. Plans
                bill yearly via Paystack.
              </p>
            </div>

            {/* Renewal Mode Segmented Control */}
            <div className="inline-flex items-center rounded-lg border border-line2 bg-surface2 p-1 text-xs">
              <button
                type="button"
                onClick={() => setRenewalMode("manual")}
                className={cn(
                  "press rounded-md px-3 py-1.5 font-medium transition-colors",
                  renewalMode === "manual"
                    ? "bg-surface text-ink shadow-2xs"
                    : "text-ink3 hover:text-ink",
                )}
              >
                Manual renewal
              </button>
              <button
                type="button"
                onClick={() => setRenewalMode("auto")}
                className={cn(
                  "press rounded-md px-3 py-1.5 font-medium transition-colors",
                  renewalMode === "auto"
                    ? "bg-surface text-ink shadow-2xs"
                    : "text-ink3 hover:text-ink",
                )}
              >
                Auto-renew
              </button>
            </div>
          </div>

          {/* 2 Clean Plan Columns */}
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Standard Plan */}
            <div className="flex flex-col justify-between rounded-2xl border border-line2 bg-surface p-7">
              <div>
                <h3 className="text-lg font-bold text-ink">Standard</h3>
                <p className="mt-1.5 text-sm text-ink2">
                  For single-owner shops that want cloud backup and instant
                  device recovery.
                </p>
                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="tabnum text-3xl font-extrabold tracking-tight text-ink">
                    {fmtMoney(120)}
                  </span>
                  <span className="text-xs text-ink3">
                    / year (₵10/mo · 7-day trial)
                  </span>
                </div>

                <ul className="mt-6 space-y-2.5 border-t border-line pt-6 text-sm text-ink2">
                  {[
                    "Full offline POS register & cart discounts",
                    "Single owner cloud account",
                    "Unlimited products, sales & customers",
                    "Automatic cloud backup & restore",
                    "Paystack checkout (MoMo or Card)",
                    renewalMode === "manual"
                      ? "Manual yearly renewal"
                      : "Automatic yearly renewal",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => launchApp("/billing")}
                className="press mt-8 w-full rounded-xl bg-accent py-3 text-xs font-semibold text-accentink"
              >
                Start 7-day trial
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="flex flex-col justify-between rounded-2xl border border-ink/30 bg-surface p-7">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-ink">Enterprise</h3>
                  <span className="text-xs font-medium text-accent">
                    Multi-user &amp; sync
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-ink2">
                  For shops with cashiers, supervisors, or multiple counters
                  needing real-time sync.
                </p>
                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="tabnum text-3xl font-extrabold tracking-tight text-ink">
                    {fmtMoney(360)}
                  </span>
                  <span className="text-xs text-ink3">
                    / year (₵30/mo · 7-day trial)
                  </span>
                </div>

                <ul className="mt-6 space-y-2.5 border-t border-line pt-6 text-sm text-ink">
                  {[
                    "Everything in Standard",
                    "Owner, Supervisor & Cashier roles",
                    "Real-time sync across multiple devices",
                    "Sync conflict resolution (/conflicts)",
                    "Remote owner sale & low-stock alerts",
                    "Desktop & multi-counter access",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => launchApp("/billing")}
                className="press mt-8 w-full rounded-xl bg-ink py-3 text-xs font-semibold text-bg"
              >
                Start Enterprise trial
              </button>
            </div>
          </div>

          {/* Expandable Feature Comparison Table */}
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setShowFullComparison((v) => !v)}
              className="press inline-flex items-center gap-1.5 text-xs font-medium text-ink2 hover:text-ink"
            >
              <span>
                {showFullComparison
                  ? "Hide feature comparison"
                  : "View full feature comparison"}
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform",
                  showFullComparison && "rotate-180",
                )}
              />
            </button>

            {showFullComparison && (
              <div className="anim-fade mt-4 overflow-x-auto rounded-2xl border border-line2 bg-surface">
                <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-line bg-surface2/60 font-semibold text-ink2">
                      <th className="py-3.5 pl-5 pr-4">Feature</th>
                      <th className="px-4 py-3.5">Standard (₵120/yr)</th>
                      <th className="py-3.5 pl-4 pr-5">
                        Enterprise (₵360/yr)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {PLAN_COMPARISON.map((row) => (
                      <tr key={row.feature}>
                        <td className="py-3 pl-5 pr-4 font-medium text-ink">
                          {row.feature}
                        </td>
                        {[row.standard, row.enterprise].map(
                          (cell, idx) => (
                            <td key={idx} className="px-4 py-3 text-ink2">
                              {typeof cell === "boolean" ? (
                                cell ? (
                                  <Check className="size-4 text-accent" />
                                ) : (
                                  <span className="text-ink4">—</span>
                                )
                              ) : (
                                <span>{cell}</span>
                              )}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          9. FAQ SECTION (Clean Hairline Accordion)
         ===================================================================== */}
      <section
        id="faq"
        className="scroll-mt-20 border-t border-line bg-surface2/20 py-16 sm:py-24"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Frequently asked questions
          </h2>

          <div className="mt-8 divide-y divide-line border-y border-line">
            {FAQ_ITEMS.map((item) => {
              const isOpen = openFaqId === item.id;
              return (
                <div key={item.id}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenFaqId((prev) => (prev === item.id ? "" : item.id))
                    }
                    className="flex w-full items-center justify-between gap-4 py-4 text-left"
                  >
                    <span className="text-[15px] font-semibold text-ink">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-ink3 transition-transform duration-200",
                        isOpen && "rotate-180 text-ink",
                      )}
                    />
                  </button>
                  {isOpen && (
                    <p className="pb-5 text-sm leading-relaxed text-ink2">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          10. CLOSING CTA SECTION
         ===================================================================== */}
      <section className="bg-[#151a3d] py-16 text-white sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Set up your shop register in minutes
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
            Every shop starts with a 7-day free trial — the full register,
            inventory, receipts and cloud backup. Pick a plan when the trial
            ends to keep selling.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              launchApp("/home", ctaInput);
            }}
            className="mx-auto mt-7 flex max-w-md flex-col gap-2 rounded-xl bg-white p-1.5 shadow-xl sm:flex-row sm:items-center"
          >
            <input
              type="text"
              value={ctaInput}
              onChange={(e) => setCtaInput(e.target.value)}
              placeholder="Enter your shop name"
              aria-label="Enter your shop name"
              className="w-full flex-1 bg-transparent px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="press shrink-0 rounded-lg bg-[#5850ec] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#4f46e5]"
            >
              Get started
            </button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-6 text-xs text-slate-300">
            <button
              type="button"
              onClick={() => launchApp("/sell")}
              className="inline-flex items-center gap-1 font-medium text-white hover:underline"
            >
              <span>Open live register</span>
              <ArrowUpRight className="size-3.5" />
            </button>
            <Link href="/billing" className="hover:text-white hover:underline">
              View plans &amp; billing
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================================
          11. FOOTER
         ===================================================================== */}
      <footer className="border-t border-line bg-bg py-12 text-ink2">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <img src="/icon-512.png" alt="ScalPOS" className="size-6 rounded-md" draggable={false} />
                <span className="text-base font-bold tracking-tight text-ink">
                  ScalPOS
                </span>
              </div>
              <p className="mt-2.5 max-w-xs text-xs leading-relaxed text-ink3">
                Offline-first point of sale for Ghanaian retail. Built for
                phones, tablets, and counter desktops.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-ink">Product</h3>
              <ul className="mt-2.5 space-y-2 text-xs text-ink3">
                <li>
                  <button
                    type="button"
                    onClick={() => launchApp("/home")}
                    className="hover:text-ink"
                  >
                    Home dashboard
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => launchApp("/sell")}
                    className="hover:text-ink"
                  >
                    Register
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => launchApp("/inventory")}
                    className="hover:text-ink"
                  >
                    Inventory
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => launchApp("/customers")}
                    className="hover:text-ink"
                  >
                    Customers
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => launchApp("/reports")}
                    className="hover:text-ink"
                  >
                    Reports
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-ink">Operations</h3>
              <ul className="mt-2.5 space-y-2 text-xs text-ink3">
                <li>
                  <button
                    type="button"
                    onClick={() => launchApp("/stock")}
                    className="hover:text-ink"
                  >
                    Stock log
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => launchApp("/categories")}
                    className="hover:text-ink"
                  >
                    Categories
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => launchApp("/staff")}
                    className="hover:text-ink"
                  >
                    Staff &amp; roles
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => launchApp("/settings")}
                    className="hover:text-ink"
                  >
                    Settings
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-ink">Account</h3>
              <ul className="mt-2.5 space-y-2 text-xs text-ink3">
                <li>
                  <Link href="/auth" className="hover:text-ink">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href="/billing" className="hover:text-ink">
                    Plans &amp; billing
                  </Link>
                </li>
                <li>
                  <Link href="/onboarding" className="hover:text-ink">
                    Intro tour
                  </Link>
                </li>
                <li>
                  <a href="https://pos.scalmint.com/legal" className="hover:text-ink">
                    Legal &amp; privacy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-ink3 sm:flex-row">
            <p>© {new Date().getFullYear()} ScalPOS. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={toggleTheme}
                className="hover:text-ink"
              >
                {theme === "light" ? "Light theme" : "Dark theme"}
              </button>
              <a href="https://pos.scalmint.com/legal" className="hover:text-ink">
                Terms &amp; Privacy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

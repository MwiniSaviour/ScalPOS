"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { fmtMoney } from "@/lib/money";

export function OutcomesInfographic({
  onLaunchRegister,
}: {
  onLaunchRegister: (route?: string) => void;
}) {
  const [dailySales, setDailySales] = useState<number>(2500);
  const [leakRate, setLeakRate] = useState<number>(4.5);

  const roi = useMemo(() => {
    const monthlyVolume = dailySales * 26;
    const monthlyRecovered = Math.round(monthlyVolume * (leakRate / 100) * 0.78);
    const annualRecovered = monthlyRecovered * 12;
    const paybackDays = Math.max(
      1,
      Math.ceil(120 / Math.max(1, monthlyRecovered / 26)),
    );
    return {
      monthlyRecovered,
      annualRecovered,
      paybackDays,
    };
  }, [dailySales, leakRate]);

  return (
    <div className="space-y-8">
      {/* =====================================================================
          1. RISING PROFIT RETENTION TRAJECTORY + FINANCIAL CALCULATOR
         ===================================================================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 7 Cols: Rising Trajectory Chart */}
        <div className="flex flex-col justify-between rounded-2xl border border-line2 bg-[#0d1424] p-6 text-white sm:p-8 lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Net margin retention over 12 months
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Measured across shops switching from paper credit books to ScalPOS.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-200">
                <span className="size-2 rounded-full bg-emerald-400" />
                ScalPOS
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-400">
                <span className="size-2 rounded-full bg-rose-400/70" />
                Paper notebook
              </span>
            </div>
          </div>

          {/* SVG Rising Comparison Chart */}
          <div className="mt-6">
            <svg
              viewBox="0 0 700 260"
              className="h-[220px] w-full overflow-visible sm:h-[245px]"
              role="img"
              aria-label="Chart showing rising net revenue retention with ScalPOS reaching +34% by Month 12 compared to paper notebooks"
            >
              <defs>
                <linearGradient
                  id="outcomeLineGrad"
                  x1="0%"
                  y1="100%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="45%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <linearGradient
                  id="outcomeAreaGrad"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                  <stop offset="65%" stopColor="#8b7cf7" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#0d1424" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[40, 95, 150, 205].map((y, idx) => (
                <g key={y}>
                  <line
                    x1="48"
                    y1={y}
                    x2="670"
                    y2={y}
                    stroke="rgba(148, 163, 184, 0.1)"
                    strokeDasharray="2 6"
                  />
                  <text
                    x="38"
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10.5"
                    fontWeight="500"
                  >
                    {["+35%", "+20%", "+5%", "Base"][idx]}
                  </text>
                </g>
              ))}

              {/* Paper Book Baseline Curve */}
              <path
                d="M 65 205 C 210 208, 390 218, 645 232"
                fill="none"
                stroke="#f4586e"
                strokeWidth="2"
                strokeDasharray="4 5"
                opacity="0.65"
              />
              <text
                x="638"
                y="248"
                textAnchor="end"
                fill="#94a3b8"
                fontSize="11"
                fontWeight="500"
              >
                Paper ledger (-6.8% leak)
              </text>

              {/* Rising ScalPOS Area + Curve */}
              <path
                d="M 65 205 C 185 190, 310 142, 465 95 C 545 70, 600 48, 645 34 L 645 205 L 65 205 Z"
                fill="url(#outcomeAreaGrad)"
              />
              <path
                d="M 65 205 C 185 190, 310 142, 465 95 C 545 70, 600 48, 645 34"
                fill="none"
                stroke="url(#outcomeLineGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Milestone Data Nodes */}
              {[
                {
                  x: 95,
                  y: 196,
                  period: "Week 1",
                  stat: "Catalog live",
                  color: "#60a5fa",
                },
                {
                  x: 265,
                  y: 156,
                  period: "Month 1",
                  stat: "+12% collected",
                  color: "#a78bfa",
                },
                {
                  x: 455,
                  y: 98,
                  period: "Month 6",
                  stat: "-72% stockouts",
                  color: "#fb923c",
                },
                {
                  x: 635,
                  y: 36,
                  period: "Month 12",
                  stat: "+34% margin",
                  color: "#34d399",
                },
              ].map((pt) => (
                <g key={pt.period}>
                  <line
                    x1={pt.x}
                    y1={pt.y + 8}
                    x2={pt.x}
                    y2="215"
                    stroke="rgba(203, 213, 225, 0.25)"
                    strokeWidth="1.2"
                    strokeDasharray="2 5"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="10"
                    fill={pt.color}
                    opacity="0.2"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="5.5"
                    fill="#0d1424"
                    stroke={pt.color}
                    strokeWidth="2.5"
                  />
                  <text
                    x={pt.x}
                    y={pt.y - 14}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {pt.stat}
                  </text>
                  <text
                    x={pt.x}
                    y="232"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="11"
                    fontWeight="500"
                  >
                    {pt.period}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Clean Hairline KPI Row */}
          <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-5">
            <div className="pr-4">
              <p className="tabnum text-xl font-bold text-white">98.6%</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Credit debt recovery
              </p>
            </div>
            <div className="px-4">
              <p className="tabnum text-xl font-bold text-white">0 hrs</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Offline counter downtime
              </p>
            </div>
            <div className="pl-4">
              <p className="tabnum text-xl font-bold text-white">3.2×</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Faster daily closing
              </p>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Clean Financial Recovery Estimator */}
        <div className="flex flex-col justify-between rounded-2xl border border-line2 bg-surface p-6 sm:p-8 lg:col-span-5">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Estimate your recovered profit
            </h3>
            <p className="mt-1 text-sm text-ink2">
              Adjust daily sales and typical unrecorded credit or stock leakage.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <div className="flex items-baseline justify-between">
                  <label
                    htmlFor="daily-sales-slider"
                    className="text-xs font-medium text-ink2"
                  >
                    Daily sales volume
                  </label>
                  <span className="tabnum text-base font-bold text-ink">
                    {fmtMoney(dailySales)} / day
                  </span>
                </div>
                <input
                  id="daily-sales-slider"
                  type="range"
                  min={400}
                  max={20000}
                  step={200}
                  value={dailySales}
                  onChange={(e) => setDailySales(Number(e.target.value))}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-surface3 accent-emerald-500"
                />
                <div className="mt-1 flex justify-between text-[11px] text-ink3">
                  <span>₵400</span>
                  <span>₵2,500</span>
                  <span>₵20,000</span>
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <label
                    htmlFor="leak-rate-slider"
                    className="text-xs font-medium text-ink2"
                  >
                    Unrecorded credit &amp; stock leakage
                  </label>
                  <span className="tabnum text-base font-bold text-ink">
                    {leakRate.toFixed(1)}%
                  </span>
                </div>
                <input
                  id="leak-rate-slider"
                  type="range"
                  min={1.5}
                  max={9.0}
                  step={0.5}
                  value={leakRate}
                  onChange={(e) => setLeakRate(Number(e.target.value))}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-surface3 accent-emerald-500"
                />
                <div className="mt-1 flex justify-between text-[11px] text-ink3">
                  <span>1.5%</span>
                  <span>4.5% (typical)</span>
                  <span>9.0%</span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-line2 bg-surface2/60 p-4">
              <span className="text-xs font-medium text-ink2">
                Estimated annual profit recovered
              </span>
              <p className="tabnum mt-1 text-3xl font-extrabold tracking-tight text-ink">
                {fmtMoney(roi.annualRecovered)}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
                <div>
                  <span className="text-ink3">Monthly recovery</span>
                  <p className="tabnum mt-0.5 font-semibold text-ink">
                    {fmtMoney(roi.monthlyRecovered)} / mo
                  </p>
                </div>
                <div>
                  <span className="text-ink3">Standard plan payback</span>
                  <p className="tabnum mt-0.5 font-semibold text-ink">
                    {roi.paybackDays} trading day{roi.paybackDays === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onLaunchRegister("/home")}
            className="press mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent py-3 text-sm font-semibold text-accentink"
          >
            <span>Open live dashboard</span>
            <ArrowUpRight className="size-4" />
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. CLEAN ARCHITECTURAL COMPARISON: PAPER LEDGER VS. NOVA POS
         ===================================================================== */}
      <div className="grid grid-cols-1 divide-y divide-line overflow-hidden rounded-2xl border border-line2 bg-surface md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-wider text-ink3">
            Without ScalPOS
          </p>
          <h4 className="mt-1 text-lg font-bold text-ink">
            Paper notebooks &amp; calculators
          </h4>
          <ul className="mt-4 space-y-3 text-sm text-ink2">
            {[
              "Part-paid customer credit gets buried in notebooks and goes uncollected.",
              "Fast-selling items run out before anyone notices shelf counts are low.",
              "Evening cash vs. MTN MoMo balancing takes 45 minutes of manual tallying.",
              "Cloud-only web registers stall the counter whenever mobile data drops.",
            ].map((item) => (
              <li
                key={item}
                className="border-b border-line/60 pb-2.5 last:border-0 last:pb-0"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-wider text-accent">
            With ScalPOS
          </p>
          <h4 className="mt-1 text-lg font-bold text-ink">
            Local-first digital register &amp; ledger
          </h4>
          <ul className="mt-4 space-y-3 text-sm text-ink">
            {[
              "Every credit sale attaches to a customer profile with running balance tracking.",
              "Automatic stock deduction on every sale with low-stock threshold alerts.",
              "Instant daily reports across Cash, MTN MoMo, Card, Credit, and top products.",
              "100% offline execution—ring up sales and print Bluetooth receipts without signal.",
            ].map((item) => (
              <li
                key={item}
                className="border-b border-line/60 pb-2.5 last:border-0 last:pb-0"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

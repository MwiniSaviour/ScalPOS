"use client";

import { Button } from "@/components/ui/button";
import { markOnboarded } from "@/lib/first-run";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SLIDES: {
  title: string;
  body: string;
  src: string;
  alt: string;
  spotlight?: boolean;
}[] = [
  {
    title: "Your personal life",
    body: "Allowances, hostel fees and everyday spending — all in one calm place.",
    src: "/onboarding/personal-life.webp",
    alt: "Phone showing spending charts, a wallet and savings",
    spotlight: true,
  },
  {
    title: "Your business",
    body: "Sell, restock and get paid, even when the network is down.",
    src: "/onboarding/business.webp",
    alt: "Till, receipt and card terminal showing a successful sale",
  },
  {
    title: "Grow both, together",
    body: "See business and personal money side by side, then plan what comes next.",
    src: "/onboarding/growth.webp",
    alt: "Growth tree with charts, receipts and a payment terminal",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  function goTo(next: number) {
    const target = Math.min(SLIDES.length - 1, Math.max(0, next));
    if (target === index) return;
    setDirection(target > index ? "next" : "prev");
    setIndex(target);
  }

  function finish() {
    markOnboarded();
    router.replace("/onboarding/use");
  }

  const slide = SLIDES[index];

  return (
    <div className="anim-fade relative flex h-dvh flex-col overflow-hidden bg-bg px-5">
      <div className="safe-t shrink-0" />

      <div className="flex shrink-0 justify-end pb-1 pt-4">
        <div
          className="h-1 w-11 overflow-hidden rounded-full bg-ink4/30"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={SLIDES.length}
          aria-valuenow={index + 1}
          aria-label={`Onboarding step ${index + 1} of ${SLIDES.length}`}
        >
          <div
            className="h-full rounded-full bg-ink/85 transition-[width] duration-300"
            style={{ width: `${((index + 1) / SLIDES.length) * 100}%` }}
          />
        </div>
      </div>

      <section key={index} className="flex min-h-0 flex-1 flex-col">
        <div
          className={`relative mx-auto flex min-h-0 w-full max-w-[380px] flex-1 items-center justify-center onboard-art-${direction}`}
        >
          {slide.spotlight && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[58%] size-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--accent) 28%, transparent), transparent 68%)",
              }}
            />
          )}
          <img
            src={slide.src}
            alt={slide.alt}
            className="relative max-h-[46vh] w-full max-w-[92vw] object-contain"
            draggable={false}
          />
        </div>

        <div className="onboard-copy mx-auto w-full max-w-[340px] pb-5 text-center">
          <h1 className="text-[24px]/7 font-semibold tracking-[-0.02em] text-ink">
            {slide.title}
          </h1>
          <p className="mx-auto mt-2 max-w-[320px] text-[14px]/6 text-ink3">{slide.body}</p>
        </div>
      </section>

      <div className="shrink-0 pb-[calc(var(--nova-sab)+16px)]">
        <p className="mb-3 text-center text-[15px] font-semibold tracking-[-0.01em] text-ink/85">
          ScalPOS
        </p>
        <Button
          block
          size="lg"
          className="h-14 rounded-full text-[16px]"
          onClick={() => (index < SLIDES.length - 1 ? goTo(index + 1) : finish())}
        >
          {index < SLIDES.length - 1 ? "Continue" : "Get started"}
        </Button>
        <button
          type="button"
          onClick={finish}
          className="press mt-2 w-full text-center text-[13px] font-medium text-ink3"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

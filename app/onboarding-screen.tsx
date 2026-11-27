"use client";

import { Button } from "@/components/ui/button";
import { markOnboarded } from "@/lib/first-run";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SLIDES: { title: string; body: string; src: string; alt: string }[] = [
  {
    title: "Your personal life",
    body: "Allowances, hostel fees and everyday spending — all in one calm place.",
    src: "/onboarding/personal-life.webp",
    alt: "Phone showing spending charts, a wallet and savings",
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
    <div className="anim-fade flex h-dvh flex-col overflow-hidden bg-bg px-5 pt-6">
      <div className="safe-t shrink-0" />

      <section key={index} className="flex min-h-0 flex-1 flex-col">
        <div
          className={`mx-auto flex min-h-0 w-full max-w-[360px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-surface3 onboard-art-${direction}`}
        >
          <img
            src={slide.src}
            alt={slide.alt}
            className="size-full object-contain"
            draggable={false}
          />
        </div>

        <div className="onboard-copy mx-auto mt-4 w-full max-w-[420px] rounded-2xl border border-line bg-surface p-5 text-center">
          <h1 className="text-[20px] font-bold tracking-[-0.01em] text-ink">{slide.title}</h1>
          <p className="mt-1.5 text-[14px] leading-snug text-ink3">{slide.body}</p>
          <Button
            block
            size="lg"
            className="mt-4 h-12 rounded-full"
            onClick={() => (index < SLIDES.length - 1 ? goTo(index + 1) : finish())}
          >
            {index < SLIDES.length - 1 ? "Next" : "Get started"}
          </Button>
          <button
            type="button"
            onClick={finish}
            className="press mt-2.5 w-full text-center text-[14px] font-semibold text-accent"
          >
            Skip
          </button>
        </div>
      </section>

      <div className="flex shrink-0 items-center justify-center gap-0 py-1">
        {SLIDES.map((s, dot) => (
          <button
            key={s.title}
            type="button"
            aria-label={`Go to slide ${dot + 1}`}
            aria-current={dot === index ? "step" : undefined}
            onClick={() => goTo(dot)}
            className="press flex size-11 items-center justify-center"
          >
            <span
              className={`block h-1.5 rounded-full transition-all duration-300 ${
                dot === index ? "w-5 bg-accent" : "w-1.5 bg-ink4/40"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

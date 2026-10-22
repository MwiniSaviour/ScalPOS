"use client";

import { Button } from "@/components/ui/button";
import { ArtGrow, ArtSell, ArtTrack } from "@/components/brand/onboard-art";
import { markOnboarded } from "@/lib/first-run";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";

const SLIDES: { title: string; body: string; art: ReactNode }[] = [
  {
    title: "Sell in seconds",
    body: "Tap a product or scan a barcode. Check out even when the network is down.",
    art: <ArtSell />,
  },
  {
    title: "Know your shelves",
    body: "Every sale, top-up and shortfall lands in your stock history automatically.",
    art: <ArtTrack />,
  },
  {
    title: "Grow with every payment",
    body: "Cash, mobile money or card — receipted, recorded and ready to review.",
    art: <ArtGrow />,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const w = e.currentTarget.clientWidth;
    if (w > 0) {
      setIndex(Math.min(2, Math.max(0, Math.round(e.currentTarget.scrollLeft / w))));
    }
  }

  function goTo(idx: number) {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  }

  function next() {
    goTo(index + 1);
  }

  function finish() {
    markOnboarded();
    router.replace("/auth");
  }

  return (
    <div className="anim-fade flex h-dvh flex-col bg-bg">
      <div
        ref={ref}
        onScroll={handleScroll}
        className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth"
      >
        {SLIDES.map((s, i) => (
          <section key={s.title} className="flex h-full w-full shrink-0 snap-center flex-col px-5 pt-6">
            <div className="safe-t shrink-0" />
            <div className="flex min-h-0 flex-1 items-center justify-center">{s.art}</div>
            <div className="mb-5 mt-3 flex shrink-0 items-center justify-center gap-1.5">
              {SLIDES.map((_, di) => (
                <button key={di} type="button" aria-label={`Go to slide ${di + 1}`} onClick={() => goTo(di)} className="press">
                  {di === index ? (
                    <span className="block h-1.5 w-5 rounded-full bg-accent" />
                  ) : (
                    <span className="block size-1.5 rounded-full bg-ink4/40" />
                  )}
                </button>
              ))}
            </div>
            <div className="mx-0 mb-2 w-full rounded-2xl border border-line bg-surface p-5 text-center">
              <h1 className="text-[20px] font-bold text-ink">{s.title}</h1>
              <p className="mt-1.5 text-[14px] leading-snug text-ink3">{s.body}</p>
              <Button block size="lg" className="mt-4 h-12 rounded-full" onClick={i < 2 ? next : finish}>
                {i < 2 ? "Next" : "Get started"}
              </Button>
              <button
                type="button"
                onClick={finish}
                className="mt-2.5 w-full text-center text-[14px] font-semibold text-accent"
              >
                Skip
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

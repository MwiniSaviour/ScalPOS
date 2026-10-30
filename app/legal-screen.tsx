"use client";

import { ScreenHeader } from "@/components/shell/screenheader";
import { LEGAL_DOCS, type LegalDoc } from "@/lib/legal-docs";
import { cn } from "@/lib/ui";
import { useSyncExternalStore } from "react";

const TABS: { id: LegalDoc["id"]; label: string }[] = [
  { id: "terms", label: "Terms" },
  { id: "privacy", label: "Privacy" },
  { id: "refunds", label: "Refunds" },
];

const DOC_PARAM: Record<string, string> = { terms: "terms", privacy: "privacy", refunds: "refunds" };

function readDocId(): LegalDoc["id"] {
  if (typeof window === "undefined") return "terms";
  const q = new URLSearchParams(window.location.search).get("doc");
  return q && DOC_PARAM[q] ? (q as LegalDoc["id"]) : "terms";
}

function subscribeDoc(cb: () => void) {
  const onPop = () => cb();
  window.addEventListener("popstate", onPop);
  return () => window.removeEventListener("popstate", onPop);
}

const SERVER_DOC: LegalDoc["id"] = "terms";

export default function LegalPage() {
  const active = useSyncExternalStore(subscribeDoc, readDocId, () => SERVER_DOC);
  const doc: LegalDoc = LEGAL_DOCS.find((d) => d.id === active) ?? LEGAL_DOCS[0];

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-[640px]">
        <ScreenHeader title="Legal" onBack />
        <p className="px-5 pt-4 text-[14px] leading-6 text-ink3">
          These documents stay live on the ScalMint site, outside the app.
        </p>

        <nav
          data-testid="legal-tabs"
          className="sticky top-14 z-20 mt-4 flex gap-1.5 border-y border-line bg-bg/95 px-4 py-2 backdrop-blur"
        >
          {TABS.map((t) => (
            <a
              key={t.id}
              href={`/legal?doc=${DOC_PARAM[t.id]}`}
              className={cn(
                "press rounded-full px-3.5 py-1.5 text-[13px] font-semibold",
                active === t.id ? "bg-accent text-accentink" : "bg-surface2 text-ink2",
              )}
            >
              {t.label}
            </a>
          ))}
        </nav>

        <div className="flex gap-5 px-5 pt-5">
          <aside className="hidden w-40 shrink-0 sm:block">
            <ul className="sticky top-32 space-y-1.5">
              {doc.sections.map((s, i) => (
                <li key={s.heading}>
                  <a href={`#${doc.id}-${i}`} className="text-[13px] leading-5 text-ink3 hover:text-accent">
                    {s.heading}
                  </a>
                </li>
              ))}
            </ul>
          </aside>

          <div className="min-w-0 flex-1 pb-28">
            <p data-testid="legal-updated" className="text-[12px] text-ink3">
              Last updated: {doc.updated}
            </p>
            <article data-testid="legal-doc" className="break-words">
              <nav className="mt-3 rounded-card bg-surface p-3 sm:hidden">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-ink3">
                  On this page
                </p>
                <ul className="mt-1.5 space-y-1">
                  {doc.sections.map((s, i) => (
                    <li key={s.heading}>
                      <a href={`#${doc.id}-${i}`} className="block text-[13px] leading-5 text-ink2">
                        {s.heading}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              {doc.sections.map((section, i) => (
                <section key={section.heading} id={`${doc.id}-${i}`} className="mt-5 first:mt-2 scroll-mt-28">
                  <h2 className="text-[16px] font-semibold text-ink">{section.heading}</h2>
                  {section.body.map((para, j) => (
                    <p key={para.slice(0, 24) + "-" + j} className="mt-1.5 text-[14px] leading-6 text-ink2">
                      {para}
                    </p>
                  ))}
                </section>
              ))}
            </article>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {TABS.filter((t) => t.id !== active).map((t) => (
                <a
                  key={t.id}
                  href={`/legal?doc=${DOC_PARAM[t.id]}`}
                  className="rounded-full border border-line2 bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink2 transition hover:text-ink"
                >
                  {t.label} →
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

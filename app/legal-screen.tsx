"use client";

import { ScreenHeader } from "@/components/shell/screenheader";
import { Segmented } from "@/components/ui/segmented";
import { LEGAL_DOCS, type LegalDocId } from "@/lib/legal-docs";
import { useState } from "react";

const TABS: { value: LegalDocId; label: string }[] = [
  { value: "terms", label: "Terms" },
  { value: "privacy", label: "Privacy" },
  { value: "refunds", label: "Refunds" },
];

export default function LegalScreen() {
  const [active, setActive] = useState<LegalDocId>("terms");

  const doc = LEGAL_DOCS.find((d) => d.id === active) ?? LEGAL_DOCS[0];

  return (
    <div className="anim-fade flex min-h-dvh flex-col bg-bg">
      <ScreenHeader title="Legal" onBack />
      <div className="px-4 pt-3 pb-28">
        <div data-testid="legal-tabs">
          <Segmented value={active} onChange={setActive} options={TABS} />
        </div>
        <p className="mt-2.5 text-[12px] text-ink3">Last updated: {doc.updated}</p>
        <article data-testid="legal-doc" className="break-words">
          {doc.sections.map((section) => (
            <section key={section.heading} className="mt-5 first:mt-2">
              <h2 className="text-[15px] font-semibold text-ink">{section.heading}</h2>
              {section.body.map((para, i) => (
                <p key={para.slice(0, 24) + "-" + i} className="mt-1.5 text-[14px] leading-6 text-ink2">
                  {para}
                </p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}

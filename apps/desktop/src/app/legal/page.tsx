import Link from "next/link"
import { LEGAL_DOCS, type LegalDocId } from "@/lib/legal-docs"

const TABS: { id: LegalDocId; label: string }[] = [
  { id: "terms", label: "Terms" },
  { id: "privacy", label: "Privacy" },
  { id: "refunds", label: "Refunds" },
]

export const metadata = {
  title: "Legal — ScalPOS",
}

export default async function LegalPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>
}) {
  const { doc: rawDoc } = await searchParams
  const active: LegalDocId = TABS.some((t) => t.id === rawDoc)
    ? (rawDoc as LegalDocId)
    : "terms"
  const doc = LEGAL_DOCS.find((d) => d.id === active) ?? LEGAL_DOCS[0]

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-lg font-bold text-foreground">
            ScalPOS
          </Link>
          <Link href="/" className="text-sm font-medium text-muted hover:text-foreground">
            Back to site
          </Link>
        </div>

        <h1 className="mt-8 text-3xl font-bold tracking-tight text-foreground">{doc.title}</h1>
        <p className="mt-1 text-xs text-muted">Last updated: {doc.updated}</p>

        <nav className="mt-5 flex gap-2">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/legal?doc=${t.id}`}
              className={
                active === t.id
                  ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-text-secondary hover:text-foreground"
              }
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <article className="mt-8">
          {doc.sections.map((section, i) => (
            <section key={section.heading} id={`${doc.id}-${i}`} className="mt-6 scroll-mt-24 first:mt-0">
              <h2 className="text-lg font-semibold text-foreground">{section.heading}</h2>
              {section.body.map((para, j) => (
                <p key={`${section.heading}-${j}`} className="mt-2 text-sm leading-6 text-text-secondary">
                  {para}
                </p>
              ))}
            </section>
          ))}
        </article>

        <div className="mt-10 flex flex-wrap gap-2.5">
          {TABS.filter((t) => t.id !== active).map((t) => (
            <Link
              key={t.id}
              href={`/legal?doc=${t.id}`}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-text-secondary hover:text-foreground"
            >
              {t.label} →
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}

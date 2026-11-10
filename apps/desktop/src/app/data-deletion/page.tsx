import Link from "next/link"
import { Mail, Trash2 } from "lucide-react"

export const metadata = {
  title: "Delete your data — ScalPOS",
}

export default function DataDeletionPage() {
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

        <h1 className="mt-8 text-3xl font-bold tracking-tight text-foreground">
          Delete your ScalPOS data
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          The fastest way is in the app: <strong className="font-semibold text-foreground">More →
          My account → Danger zone → Delete account</strong>. If you can&rsquo;t open the app, email
          us and we&rsquo;ll handle it within 30 days.
        </p>

        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger">
              <Trash2 className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-foreground">
                If you can&rsquo;t open the app
              </h2>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm leading-6 text-text-secondary">
                <li>Email us from the address linked to your ScalPOS account.</li>
                <li>Use the subject line &ldquo;Data deletion request&rdquo;.</li>
                <li>Tell us the shop name so we can locate the account.</li>
              </ol>
              <a
                href="mailto:support@scalmint.com?subject=Data%20deletion%20request"
                className="btn-primary mt-4"
              >
                <Mail className="size-[17px]" />
                Email support@scalmint.com
              </a>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">What gets deleted</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-6 text-text-secondary">
            <li>Your account email and profile details.</li>
            <li>Products, prices, stock, orders, customers and staff records synced to our cloud.</li>
            <li>Uploaded product photos stored in our cloud.</li>
          </ul>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            Data that only lives on your own device (an offline shop) is removed by uninstalling
            the app or clearing its storage in Android settings.
          </p>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Records we may keep</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            We may keep the minimum billing records the law requires, in anonymised form, and
            records needed to resolve disputes. Everything else is removed from our cloud within
            30 days.
          </p>
        </section>

        <p className="mt-8 text-sm leading-6 text-text-secondary">
          Questions about privacy? Read our{" "}
          <Link href="/legal?doc=privacy" className="font-medium text-primary">
            Privacy Policy
          </Link>{" "}
          or{" "}
          <Link href="/legal?doc=terms" className="font-medium text-primary">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </main>
  )
}

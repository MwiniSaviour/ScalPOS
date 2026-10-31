"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Trash2 } from "lucide-react";
import { BrandMark } from "@/components/brandmark";

export default function DataDeletionScreen() {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-[640px] px-5 pt-8 pb-16">
        <div className="flex items-center justify-between gap-3">
          <BrandMark />
          <Link
            href="/"
            className="press flex items-center gap-1.5 text-[14px] font-medium text-ink3 hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Back to site
          </Link>
        </div>

        <h1 className="mt-8 text-[28px]/9 font-bold tracking-[-0.02em] text-ink">
          Delete your ScalPOS data
        </h1>
        <p className="mt-2 text-[15px]/6 text-ink3">
          You can ask us to delete your ScalPOS account and the shop data synced to our cloud.
          Requests are handled within 30 days.
        </p>

        <section className="mt-8 rounded-card border border-line bg-surface p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
              <Trash2 className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-semibold text-ink">How to request deletion</h2>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[14px]/6 text-ink3">
                <li>Email us from the address linked to your ScalPOS account.</li>
                <li>Use the subject line &ldquo;Data deletion request&rdquo;.</li>
                <li>Tell us the shop name so we can locate the account.</li>
              </ol>
              <a
                href="mailto:support@scalmint.com?subject=Data%20deletion%20request"
                className="press mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[14px] font-semibold text-accentink"
              >
                <Mail className="size-[17px]" />
                Email support@scalmint.com
              </a>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-card border border-line bg-surface p-4">
          <h2 className="text-[17px] font-semibold text-ink">What gets deleted</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[14px]/6 text-ink3">
            <li>Your account email and profile details.</li>
            <li>Products, prices, stock, orders, customers and staff records synced to our cloud.</li>
            <li>Uploaded product photos stored in our cloud.</li>
          </ul>
          <p className="mt-3 text-[14px]/6 text-ink3">
            Data that only lives on your own device (an offline shop) is removed by uninstalling
            the app or clearing its storage in Android settings.
          </p>
        </section>

        <section className="mt-6 rounded-card border border-line bg-surface p-4">
          <h2 className="text-[17px] font-semibold text-ink">Records we may keep</h2>
          <p className="mt-2 text-[14px]/6 text-ink3">
            We may keep the minimum billing records the law requires, in anonymised form, and
            records needed to resolve disputes. Everything else is removed from our cloud within
            30 days.
          </p>
        </section>

        <p className="mt-8 text-[13px]/5 text-ink3">
          Questions about privacy? Read our{" "}
          <Link href="/legal?doc=privacy" className="font-medium text-accent">
            Privacy Policy
          </Link>{" "}
          or{" "}
          <Link href="/legal?doc=terms" className="font-medium text-accent">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

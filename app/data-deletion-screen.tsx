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
          ScalPOS holds data for business profiles, personal finance profiles and multi-business accounts. You can delete a profile in the app, delete the whole account, or ask us to do it for you. The fastest route is <strong className="font-semibold text-ink">More → My account → Danger zone → Delete account</strong>. If you cannot open the app, email us and we will handle the request within 30 days.
        </p>

        <section className="mt-8 rounded-card border border-line bg-surface p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
              <Trash2 className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-semibold text-ink">If you cannot open the app</h2>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[14px]/6 text-ink3">
                <li>Email us from the address linked to your ScalPOS account.</li>
                <li>Use the subject line “Data deletion request”.</li>
                <li>Tell us the profile or business name, and whether you want one profile or the whole account deleted.</li>
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
            <li>Your account email, profile names, profile types and team invitations.</li>
            <li>Business records synced to our cloud: products, categories, prices, stock, orders, payments, customers, suppliers and staff records.</li>
            <li>Personal finance records synced to our cloud: funds, expenses, budgets, activities, savings goals, notes and dates.</li>
            <li>Uploaded product photos that are stored with the selected profile.</li>
          </ul>
          <p className="mt-3 text-[14px]/6 text-ink3">
            Data that has never left a device — including offline mobile data and local desktop data — must be removed through the app, by uninstalling it, or by clearing the application storage on that device. Deleting one profile does not erase data held under another business profile.
          </p>
        </section>

        <section className="mt-6 rounded-card border border-line bg-surface p-4">
          <h2 className="text-[17px] font-semibold text-ink">Backups you created</h2>
          <p className="mt-2 text-[14px]/6 text-ink3">
            Backup files you exported, including any copy saved to your own Google Drive, remain under your control. We cannot delete files stored in your personal Drive. Delete those files yourself if they are no longer needed.
          </p>
        </section>

        <section className="mt-6 rounded-card border border-line bg-surface p-4">
          <h2 className="text-[17px] font-semibold text-ink">Records we may keep</h2>
          <p className="mt-2 text-[14px]/6 text-ink3">
            We may keep the minimum billing records the law requires, in anonymised form where possible, and records needed to resolve disputes. Everything else is removed from our cloud within 30 days. Where a legal hold applies, deletion is deferred until the hold is lifted.
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

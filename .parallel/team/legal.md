# Legal docs — report

## Files changed
- `lib/legal-docs.ts` — new typed `LEGAL_DOCS` array (terms / privacy / refunds), updated date 23 October 2026.
- `app/legal/page.tsx` — new Suspense-wrapped page loading `../legal-screen` (same pattern as settings/page.tsx).
- `app/legal-screen.tsx` — new client screen: ScreenHeader "Legal" + Segmented tabs + document rendering.

## Gotchas applied
- Placeholders: `[Nova POS operator legal entity], Accra, Ghana` used in all three contact sections (org still being incorporated); DPC registration published as "will be published here once the registration is complete" in privacy contact.
- Statutes cited sparingly, no section numbers beyond two total: Data Protection Act, 2012 (Act 843) — privacy "Who we are"; Payment Systems and Services Act, 2019 (Act 987) — terms "Subscriptions" (Paystack licensing). ETA 758/772 intentionally not named to keep plain-language tone.
- No invented cloud region for Supabase — "cloud-hosted on Supabase" only.
- VAT wording per brief: "excluding taxes that Ghanaian law requires; tax is added at checkout where it applies."
- Plan contents quoted exactly per brief (Offline Single Owner GHS 120/y; Enterprise GHS 360/y with roles, sync, cloud storage/backup, desktop/cross-device, notifications).
- Manual renewal ("never charged automatically", reminders + manual pay) per brief; 7-day refund window for "did not do what we said" vs no refund for unused time; 30-day price-change notice.
- Document rendering: plain `bg-bg`, no cards; headings `text-[15px] font-semibold text-ink mt-5 first:mt-2`, paragraphs `text-[14px] leading-6 text-ink2 mt-1.5`; "Last updated" muted line under tabs; testids `legal-tabs` (wrapper around Segmented since Segmented takes no props) and `legal-doc`.
- No code comments written; did not touch cdp-qa.cjs or any other screens.

export type LegalDocId = "terms" | "privacy" | "refunds";

export type LegalSection = {
  heading: string;
  body: string[];
};

export type LegalDoc = {
  id: LegalDocId;
  title: string;
  updated: string;
  sections: LegalSection[];
};

const UPDATED = "27 November 2026";

export const LEGAL_DOCS: LegalDoc[] = [
  {
    id: "terms",
    title: "Terms of Service",
    updated: UPDATED,
    sections: [
      {
        heading: "Scope and acceptance",
        body: [
          "These Terms of Service govern your use of ScalPOS, operated by ScalMint, Accra, Ghana. By creating an account, installing the mobile or desktop application, or continuing to use the service, you agree to these terms.",
          "If you use ScalPOS on behalf of a business, you confirm that you are authorised to accept these terms for that business. If you do not agree, do not use the service.",
        ],
      },
      {
        heading: "The services we provide",
        body: [
          "ScalPOS is a suite of locally-first money and operations tools. It includes a Capacitor mobile application for Android, an offline-first desktop application for Windows, and a web presence for account, billing and legal information.",
          "The service supports business profiles for retail, pharmacy, restaurant and salon operations, and a personal finance profile for funds, expenses, budgets, activities and savings goals. Personal finance mode is a record-keeping tool. It is not a bank, wallet, credit provider, investment service or accountant.",
        ],
      },
      {
        heading: "Multi-business profiles",
        body: [
          "One sign-in may hold several separate business profiles, including business and personal profiles. Each profile has its own settings, records, active device data and subscription status. Switching profiles changes which profile's data is active on the device.",
          "You are the administrator of every profile you create. You are responsible for the accuracy of the information entered into each profile and for the actions of anyone you authorise to use it. Do not use one profile's data to impersonate another business or person.",
        ],
      },
      {
        heading: "Eligibility and acceptable use",
        body: [
          "You must be at least 18 years old and legally capable of entering into this agreement. You may use ScalPOS only for lawful purposes and only with data you are entitled to record and store.",
          "You must not use the service to sell prohibited goods, conceal or misstate transactions, evade tax, infringe another person's rights, interfere with the service, attempt to access another profile's data, or reverse engineer or redistribute the software except as permitted by law.",
        ],
      },
      {
        heading: "Your data and your records",
        body: [
          "As between you and ScalMint, you own the data you enter into ScalPOS, including product, order, customer, staff, finance and savings records. You grant ScalMint a limited licence to process that data only to provide, secure and support the service, as described in the Privacy Policy.",
          "You remain responsible for the accuracy and completeness of your records and for your own tax, VAT, accounting and regulatory filings with the Ghana Revenue Authority or other authorities. ScalPOS reports are convenience tools and are not official tax documents or legal records.",
          "You should keep independent backups of records that matter to you. The backup and export tools are provided for that purpose, but no backup method can guarantee against every form of loss.",
        ],
      },
      {
        heading: "Software licences",
        body: [
          "Subject to your subscription and compliance with these terms, ScalMint grants you a limited, non-exclusive, non-transferable, revocable licence to install and use the mobile and desktop applications for your own profiles. This is a licence to use the software, not a transfer of ownership.",
          "All intellectual property in ScalPOS, including its software, design, documentation and branding, remains with ScalMint or its licensors. You may not copy, modify, sell, sublicense or distribute the applications except as expressly permitted.",
        ],
      },
      {
        heading: "Accounts, sign-in and security",
        body: [
          "Sign-in uses a one-time code sent to the email address you control. Anyone with access to that inbox may be able to enter your account, so you must keep it secure. Where the app provides a device PIN, you are responsible for choosing and protecting it.",
          "On a cloud plan you may invite team members and assign roles. You are responsible for reviewing access, removing former staff promptly and ensuring that staff follow these terms. Access changes take effect according to the service's normal sync behaviour.",
        ],
      },
      {
        heading: "Plans, subscriptions and profiles",
        body: [
          "Every new profile receives a seven-day free trial. The standard plan is GHS 120 per year and the enterprise plan is GHS 360 per year. Each profile's subscription is assessed separately; a paid profile does not automatically pay for another profile unless that profile is separately subscribed.",
          "Enterprise includes team accounts, cloud sync, backup and recovery, cross-device access and desktop access where available. The standard plan covers a single owner and offline register use. Full plan details are shown in the app and in the Subscription and Refund Policy, which forms part of these terms.",
          "Payments are processed by Paystack, a licensed payment service provider. Subscriptions are paid once for twelve months and do not renew automatically. You decide whether to renew. Prices shown exclude taxes that Ghanaian law requires, and any applicable tax is added at checkout.",
        ],
      },
      {
        heading: "Offline use and service availability",
        body: [
          "The register, inventory, finance and savings tools are designed to work without an internet connection on the device where data is stored. Cloud sync, one-time sign-in codes, subscription checks and payment pages require a network connection.",
          "ScalPOS is provided on a best-effort basis. We do not control Paystack, mobile money networks, telecom providers, internet service, electricity supply or printer hardware. Deal with the relevant provider for failures in their systems and contact us for ScalPOS issues.",
        ],
      },
      {
        heading: "Backups and data portability",
        body: [
          "You may export a backup from the app. Backups are JSON documents that may include product photos. Where you enable Google Drive backup, the file is saved to your own Drive under the permissions you grant. We do not use that file for our own purposes.",
          "Restoring a backup replaces the active profile's data with the snapshot in that file. You are responsible for choosing the correct backup and profile before restoring.",
        ],
      },
      {
        heading: "Suspension, termination and deletion",
        body: [
          "If a trial or subscription expires and is not renewed, the app may restrict access until a plan is active. Local data remains on your device and can be exported while the app is locked, subject to the controls available on that device.",
          "We may suspend or terminate access if you materially breach these terms, use the service unlawfully or create risk for other users. Where practicable, we will give notice and an opportunity to correct the issue.",
          "You may delete a profile in the app or request deletion through the data deletion page. Cloud data for that profile is removed according to the Privacy Policy. Data stored only on your device must be removed by you through the app or your device settings.",
        ],
      },
      {
        heading: "Changes to these terms",
        body: [
          "We may update these terms as the service changes or as the law requires. Where a change materially reduces what you receive under a paid plan, we will give at least 14 days' notice in the app before it takes effect.",
          "Continuing to use ScalPOS after an update means you accept the revised terms. Previous versions are available on request from support@scalmint.com.",
        ],
      },
      {
        heading: "Disclaimers and limitation of liability",
        body: [
          "ScalPOS is provided 'as is' and 'as available'. To the extent permitted by law, we disclaim implied warranties of merchantability, fitness for a particular purpose and uninterrupted operation.",
          "Our total liability arising from or relating to ScalPOS is limited to the amount you paid ScalMint in the twelve months before the event giving rise to the claim. We are not liable for indirect or consequential losses such as lost profits, lost goodwill, lost stock, business interruption or third-party payment failures.",
          "Nothing in these terms limits liability that cannot lawfully be limited, including liability for fraud or willful misconduct.",
        ],
      },
      {
        heading: "Governing law and disputes",
        body: [
          "These terms are governed by the laws of the Republic of Ghana. If a dispute arises, contact support@scalmint.com first and we will aim to resolve it within 30 days. If it cannot be resolved amicably, the courts of Ghana have exclusive jurisdiction.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "ScalPOS is operated by ScalMint, Accra, Ghana. Questions about these terms: support@scalmint.com. Website: https://pos.scalmint.com.",
        ],
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    updated: UPDATED,
    sections: [
      {
        heading: "Who we are and what this covers",
        body: [
          "ScalMint, Accra, Ghana, is the data controller for the personal data described in this policy. This policy covers the ScalPOS mobile application, desktop application, website, business profiles, personal finance profiles and multi-business account features.",
          "This notice is prepared with Ghana's Data Protection Act, 2012 (Act 843) in mind. ScalMint is completing its registration with the Data Protection Commission and will publish registration details when issued.",
        ],
      },
      {
        heading: "Information we collect",
        body: [
          "Account and profile data: your email address, one-time sign-in records, profile names, profile types, colours, subscription status and team member invitations.",
          "Business records: products, categories, prices, stock movements, orders, payments, customers, suppliers, purchase orders, staff names and role assignments that you enter or that sync from an authorised device.",
          "Personal finance records: funds received, expenses, categories, monthly budgets, activities, savings goals, goal notes, start and projected end dates, and contribution notes that you choose to enter.",
          "Device and diagnostic data: app version, basic device information and error information used to diagnose faults. We do not read your contacts, call logs, messages, photos outside the app's own storage, or precise location.",
        ],
      },
      {
        heading: "Information we do not collect",
        body: [
          "We never ask for or store card PINs, mobile money PINs, wallet passwords or full card numbers. Payments are handled by Paystack, and card or mobile money credentials pass directly between you and Paystack.",
          "We do not sell your personal data and we do not use your business or personal finance records for advertising, credit scoring or profiling.",
        ],
      },
      {
        heading: "Why we process it",
        body: [
          "To provide the service: operate the register, inventory, credit book, reports, personal finance tools and savings goals on your device, and sync them between authorised devices when cloud services are enabled.",
          "To administer the account: send one-time sign-in codes, manage profiles and team members, process subscriptions through Paystack, provide support, prevent fraud and meet legal obligations.",
          "We rely on performance of our contract with you to provide the core service, on your consent for optional integrations such as Google Drive backup, on legal obligation for tax and billing records where applicable, and on legitimate interests for security and support.",
        ],
      },
      {
        heading: "Local-first storage",
        body: [
          "ScalPOS is designed so that records are created and first stored on the device you use. The mobile app uses device-local storage and an on-device image store for product photos. The desktop application keeps its offline data on the computer where it is installed.",
          "Data leaves the device only when you connect a cloud account, enable sync, create an optional backup, or use a payment or sign-in service that requires a network request. You remain in control of those choices.",
        ],
      },
      {
        heading: "Cloud storage and profile isolation",
        body: [
          "Where cloud sync is enabled, records are hosted on Supabase. Access controls are applied so that each organisation or business profile is logically separated from others. Multi-business profiles under one account are kept distinct; switching profile does not merge their records.",
          "We do not use one profile's records to populate another profile. Never attempt to access data outside the profiles you own or are authorised to use.",
        ],
      },
      {
        heading: "Service providers and recipients",
        body: [
          "Supabase provides cloud database, authentication and storage infrastructure. Paystack processes subscription payments. Google Drive is used only if you choose Drive backup; the backup file is stored under your Google account and the permissions you grant.",
          "We may disclose information where the law requires it, to protect the rights and safety of users or the public, or to professional advisers under confidentiality obligations. We do not disclose your records for marketing.",
        ],
      },
      {
        heading: "Personal finance and savings information",
        body: [
          "Personal finance records are treated as your own private records. They are used to display balances, budgets, activities and goal progress. We do not share them with employers, banks, credit bureaus or advertisers.",
          "Goal notes and contribution notes are optional. If you include sensitive personal details in a note, those details are stored as part of the profile and will appear in backups and any synced records for that profile.",
        ],
      },
      {
        heading: "International transfers",
        body: [
          "Some service providers may process data outside Ghana. Where that occurs, we use providers that offer contractual and technical safeguards appropriate to the data involved, and we apply access controls to limit who can reach production records.",
        ],
      },
      {
        heading: "How long we keep information",
        body: [
          "We keep cloud data while the relevant account or profile remains active and within the applicable subscription or trial. After account or profile deletion, cloud records are removed within 30 days, except for the minimum records required by law or for dispute resolution, which are retained in anonymised form where possible.",
          "Data that has never left your device remains there until you remove it through the app, a backup restore, or your device settings. Copies in backups you created remain under your control and must be deleted by you if no longer needed.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "Subject to Ghana's Data Protection Act, you may request access to your personal data, ask us to correct inaccurate data, ask us to delete data, object to certain processing, or withdraw consent where we rely on consent. Send requests to support@scalmint.com or use https://pos.scalmint.com/data-deletion.",
          "You may complain to the Data Protection Commission of Ghana if you are dissatisfied with our response. We ask that you contact us first so we have an opportunity to resolve the matter.",
        ],
      },
      {
        heading: "Security",
        body: [
          "Cloud traffic is encrypted in transit. Access to production systems is restricted to authorised personnel for support and maintenance. Business profiles are logically isolated, and device PINs are available where supported.",
          "No system is perfectly secure. If a personal data breach occurs, we will take steps to contain it, notify affected users where required, and notify the Data Protection Commission within the timeframe required by law.",
        ],
      },
      {
        heading: "Children",
        body: [
          "ScalPOS is intended for adults managing a business or their own finances. It is not directed at anyone under 18. If we become aware that a child has an account, we will take appropriate steps to remove it.",
        ],
      },
      {
        heading: "Changes to this policy",
        body: [
          "We may update this policy as the service or law changes. Material changes will be announced in the app before they take effect. The current version is always available at https://pos.scalmint.com/legal.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "Data controller: ScalMint, Accra, Ghana. For privacy questions, access requests or deletion requests, email support@scalmint.com. Data Protection Commission registration details will be published here once issued.",
        ],
      },
    ],
  },
  {
    id: "refunds",
    title: "Subscription & Refund Policy",
    updated: UPDATED,
    sections: [
      {
        heading: "About this policy",
        body: [
          "This policy explains how ScalPOS plans work across the mobile app, desktop app and multi-business profiles. It forms part of the Terms of Service. Plan names, prices and entitlements shown in the app at purchase are the current offer.",
        ],
      },
      {
        heading: "Free trial",
        body: [
          "Each new profile receives a seven-day free trial. No card is required to start. When the trial ends, access is restricted until a plan is active for that profile. Profile data remains on the device and, where cloud sync was enabled, in the account until deleted.",
        ],
      },
      {
        heading: "Plans and platform access",
        body: [
          "The standard plan is GHS 120 per year for a single owner using the offline register. The enterprise plan is GHS 360 per year and includes team roles, cloud sync, backup and recovery, cross-device access and desktop access where available.",
          "Desktop access is tied to the plan of the profile whose data is being used. Installing the desktop application does not create a separate subscription. Personal finance profiles and business profiles are billed separately unless a promotion states otherwise.",
        ],
      },
      {
        heading: "Multi-business subscriptions",
        body: [
          "Each business profile has its own subscription status. A profile must have an active trial or plan to use paid features. Switching profiles does not transfer paid access from one profile to another.",
          "If you create several profiles, review each one's billing status in the app. Deleting a profile does not automatically refund its remaining subscription period.",
        ],
      },
      {
        heading: "Billing and payment",
        body: [
          "Payment is processed once by Paystack for a twelve-month period. We do not store card numbers, card PINs or mobile money PINs. Prices shown exclude taxes that Ghanaian law requires; applicable tax is added at checkout.",
          "There is no automatic renewal. When the period is nearing its end, the app may remind you, and you decide whether to pay again. If you do not renew, paid cloud features stop at expiry and the profile may be locked until renewal.",
        ],
      },
      {
        heading: "Refund window",
        body: [
          "Within seven days of a payment, you may request a full refund for that payment if the service did not perform as described. Email support@scalmint.com with the profile name, payment date and the issue. Refunds are returned through Paystack to the original payment method where possible.",
          "After seven days, we do not refund unused time. Your paid period continues until its expiry date, so you keep the access you paid for.",
        ],
      },
      {
        heading: "Cancellation",
        body: [
          "You may cancel at any time in the app or by emailing support@scalmint.com. Cancelling does not trigger a future charge because renewal is manual. Your current paid period runs to its expiry date unless these terms provide otherwise.",
          "Cancelling a plan does not delete your profile or records. Export a backup before your paid access ends if you need a portable copy.",
        ],
      },
      {
        heading: "Suspension for non-payment or breach",
        body: [
          "If a plan expires, is not renewed, or a payment is reversed, the app may restrict paid features until the account is made current. If we suspend a profile for a material breach of the Terms of Service, access remains suspended until the issue is resolved.",
          "A suspension does not by itself delete local data. Where a profile is deleted, the retention rules in the Privacy Policy apply.",
        ],
      },
      {
        heading: "Price changes",
        body: [
          "If we change prices, we will announce the change in the app at least 30 days before it affects a renewal. The price you paid for your current twelve-month period does not change during that period.",
        ],
      },
      {
        heading: "Questions",
        body: [
          "Billing and refund questions: support@scalmint.com. ScalPOS is operated by ScalMint, Accra, Ghana. Website: https://pos.scalmint.com.",
        ],
      },
    ],
  },
];

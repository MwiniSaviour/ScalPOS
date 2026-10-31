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

export const LEGAL_DOCS: LegalDoc[] = [
  {
    id: "terms",
    title: "Terms of Service",
    updated: "23 October 2026",
    sections: [
      {
        heading: "What ScalPOS is",
        body: [
          "ScalPOS is a point-of-sale app for shops in Ghana. It gives you an offline-first register, inventory tracking, credit book for customers, sales reports and Bluetooth receipt printing. If you choose a cloud plan, you also get team accounts and syncing between devices.",
          "This app is a tool that runs on your shop's devices. It is not a bank, a mobile money operator or an accountant. We help you record sales; we do not hold or move your money.",
        ],
      },
      {
        heading: "Who these terms are for",
        body: [
          "You must own the shop or have the owner's permission to use ScalPOS for it. You sign up with an email address you control. If you add team members, you are responsible for what they do in your shop's account.",
          "You must use ScalPOS lawfully. Do not use it to sell banned goods, evade tax or mislead customers.",
        ],
      },
      {
        heading: "Your records and your taxes",
        body: [
          "Your shop data is yours. You are responsible for keeping your own records accurate and for making sure your tax and VAT filings with the Ghana Revenue Authority are correct. ScalPOS reports are a convenience, not official tax records.",
          "Keep your own backups outside the app if your records matter to your business.",
        ],
      },
      {
        heading: "Accounts and security",
        body: [
          "You sign in with your email. We send a one-time sign-in code to that email, so anyone with access to your email inbox can enter your shop. Keep your email and your device secure.",
          "On a cloud plan you can add team members with roles, and you can remove a team member at any time. Remove them as soon as they leave your shop; access is cut off immediately.",
        ],
      },
      {
        heading: "Subscriptions",
        body: [
          "ScalPOS has two paid plans: Offline Single Owner at GHS 120 per year and Enterprise at GHS 360 per year. See the Subscription and Refund Policy for what each plan includes.",
          "Plans are billed through Paystack, a payment service provider licensed under Ghana's Payment Systems and Services Act, 2019 (Act 987). You are charged once for 12 months and never automatically recharged — renewal is always manual. You can cancel at any time in the app or by emailing support@scalmint.com.",
        ],
      },
      {
        heading: "Service availability",
        body: [
          "ScalPOS is provided as is, on a best-effort basis. The register, inventory and credit book are designed to work without internet, but cloud features, email sign-in codes and payment screen loading need a network connection.",
          "We do not control Paystack, mobile money networks, phone networks, the internet or electricity supply. If a payment fails at the network level, deal with the payment provider for the transaction itself and contact us for the app side.",
        ],
      },
      {
        heading: "Deleting your account",
        body: [
          "You can delete your account from the app or by email. When you do, your shop's data is removed from our cloud within 30 days.",
          "Where the law requires records to be kept longer, we may keep the minimum needed, or keep billing records in anonymised form. Data on your local devices stays there until you erase it yourself.",
        ],
      },
      {
        heading: "Changes to these terms",
        body: [
          "We may update these terms as the app changes or as the law requires. If a change reduces what you get for your money, we announce it in the app at least 14 days before it takes effect.",
          "Continuing to use ScalPOS after a change means you accept the updated terms.",
        ],
      },
      {
        heading: "Limitation of liability",
        body: [
          "If something goes wrong with ScalPOS, our total liability to you is limited to the amount you paid us in the last 12 months. To the extent allowed by law, we are not liable for indirect losses such as lost profits, lost goodwill or lost stock value.",
          "We are not liable for losses caused by internet outages, network failures, printer faults, power cuts, misuse of your devices or actions of your staff.",
        ],
      },
      {
        heading: "Disputes",
        body: [
          "If you have a problem, contact us first at support@scalmint.com. We aim to resolve every complaint within 30 days.",
          "If we cannot agree, a court of Ghana will decide, and these terms are governed by the laws of Ghana.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "ScalPOS is operated by ScalMint (www.scalmint.com), Accra, Ghana. Questions about these terms: support@scalmint.com.",
        ],
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    updated: "23 October 2026",
    sections: [
      {
        heading: "Who we are",
        body: [
          "ScalPOS is a point-of-sale app for Ghanaian shops, run by ScalMint (www.scalmint.com), Accra, Ghana. We are the data controller for the personal data described here.",
          "We plan to register with Ghana's Data Protection Commission as the law requires, and to renew that registration every two years. This notice is written to meet Ghana's Data Protection Act, 2012 (Act 843).",
        ],
      },
      {
        heading: "What we collect",
        body: [
          "Account data: your email address and the names and photos your team members choose for their profiles.",
          "Shop data: what you put into the app — product names, prices, stock levels, orders, customer names and phone numbers, and staff names and avatars.",
          "Device data: your app version and basic device information, used only to fix problems. We do not read your files, contacts or location.",
        ],
      },
      {
        heading: "What we never collect",
        body: [
          "We never collect card PINs, mobile money PINs or account passwords for wallets. Payment details go directly from you to Paystack, a licensed payment service provider. We never see, touch or store them.",
          "We do not sell your data to anyone, for any price.",
        ],
      },
      {
        heading: "Why we collect it",
        body: [
          "To provide the service: run your register, sync your shop between devices when you use a cloud plan, and restore from backup after you lose a phone.",
          "To run the account: send one-time sign-in codes to your email, process plan payments through Paystack, and give you support.",
        ],
      },
      {
        heading: "Where your data lives",
        body: [
          "ScalPOS is offline-first. Your shop data is created and first stored on your own device. It only leaves the device when you, the owner, connect a cloud plan and choose to sync.",
          "Synced data is cloud-hosted on Supabase, with row-level access controls so no other shop can read your records. Payments are handled by Paystack; card and mobile money details pass between you and Paystack alone.",
          "Bluetooth receipt printing happens entirely on your device through Android. No print data touches our servers. If you add a product photo, it is stored inside your app's own storage on your device.",
        ],
      },
      {
        heading: "Who else sees your data",
        body: [
          "Only the processors we need to run the service: Supabase for cloud hosting and Paystack for payments, each working under instruction from us. Your internet provider sees traffic the way it does for any app.",
          "We share data with others only if the law forces us to, or if you ask us to.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "We keep your data while your account is active. If you delete your account, your shop data is removed from our cloud within 30 days.",
          "Removing a team member cuts their access immediately, but data that was already synced belongs to the shop that collected it and stays with that shop. Billing records that the law requires are kept in anonymised form.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can ask us for a copy of your personal data, ask us to correct it, ask us to delete it, or object to how we use it. Request deletion at https://pos.scalmint.com/data-deletion or email support@scalmint.com and we will respond within a reasonable time.",
          "If you are not happy with how we handle your data, you can appeal to us first — and you can also complain to the Data Protection Commission of Ghana.",
        ],
      },
      {
        heading: "Children",
        body: [
          "ScalPOS is for shop owners and their staff. It is not meant for anyone under 18. If we learn a child has an account, we delete it.",
        ],
      },
      {
        heading: "How we protect your data",
        body: [
          "Data sent to the cloud travels over encrypted connections. Supabase enforces row-level access controls so one shop can never read another's records. Only a small number of our staff can reach production data, and only to fix problems you report.",
          "No system is perfect. If a breach ever affects your data, we will tell you and notify the Data Protection Commission as the law requires.",
        ],
      },
      {
        heading: "Changes to this policy",
        body: [
          "If this policy changes, we announce it in the app before it takes effect. Big changes get at least 14 days' notice.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "Data controller: ScalMint (www.scalmint.com), Accra, Ghana. For any privacy question or request, email support@scalmint.com. Our Data Protection Commission registration details will be published here once the registration is complete.",
        ],
      },
    ],
  },
  {
    id: "refunds",
    title: "Subscription & Refund Policy",
    updated: "23 October 2026",
    sections: [
      {
        heading: "About this policy",
        body: [
          "This policy explains the two ScalPOS plans, how billing works, when you get a refund and how prices change. It is part of the ScalPOS Terms of Service.",
        ],
      },
      {
        heading: "Plans at a glance",
        body: [
          "Offline Single Owner: GHS 120 per year. Enterprise: GHS 360 per year. Both plans run for 12 months from the day you pay.",
        ],
      },
      {
        heading: "Offline Single Owner plan",
        body: [
          "GHS 120 per year includes one shop account with a single owner and the offline register: sales, inventory, credit book, reports and Bluetooth receipt printing, all working without internet.",
        ],
      },
      {
        heading: "Enterprise plan",
        body: [
          "GHS 360 per year includes everything in Offline Single Owner, plus: multi-user accounts with roles (owner, supervisor, cashier), real-time sync across devices, secure cloud storage with backup and recovery, desktop and cross-device access, and notifications.",
        ],
      },
      {
        heading: "Billing",
        body: [
          "You pay once for 12 months. Payment is handled by Paystack, a licensed payment service provider; we never see your card PIN or mobile money PIN.",
          "Prices shown exclude any taxes that Ghanaian law requires; tax is added at checkout where it applies.",
        ],
      },
      {
        heading: "Renewal",
        body: [
          "You are never charged automatically. When your 12 months are ending, the app reminds you, and you decide whether to pay again. If you do not renew, your plan ends at expiry and cloud features stop syncing; data already on your device stays.",
        ],
      },
      {
        heading: "Refunds",
        body: [
          "Within 7 days of paying, you can ask for a full refund if ScalPOS did not do what we said it would. Email support@scalmint.com, tell us what fell short, and we will refund you through Paystack.",
          "After 7 days we do not refund unused time. Your plan keeps running until it expires, so you lose nothing you have paid for.",
        ],
      },
      {
        heading: "Cancelling",
        body: [
          "You can cancel in the app or by emailing support@scalmint.com at any time. Cancelling stops future charges; there are none to stop, since renewal is manual. Your current plan simply runs to its expiry date.",
        ],
      },
      {
        heading: "Price changes",
        body: [
          "If we change plan prices, we announce it in the app at least 30 days before it affects your next payment. Your current year's price never changes mid-term.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "ScalPOS is operated by ScalMint (www.scalmint.com), Accra, Ghana. Billing and refund questions: support@scalmint.com.",
        ],
      },
    ],
  },
];

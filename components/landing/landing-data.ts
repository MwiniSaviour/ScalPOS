export type CurveMilestoneId = "start" | "sell" | "collect" | "scale";

export type CurveMilestone = {
  id: CurveMilestoneId;
  title: string;
  description: string;
  outcomeMetric: string;
  color: string;
  glowColor: string;
  /** SVG coordinates along the 1200x260 rising curve canvas */
  cx: number;
  cy: number;
};

export const RISING_MILESTONES: CurveMilestone[] = [
  {
    id: "start",
    title: "Start",
    description:
      "Set up your catalog as you unpack stock. Add products with camera photos, barcodes, and prices in Ghana cedis on any phone or counter device.",
    outcomeMetric: "2 min setup",
    color: "#60a5fa",
    glowColor: "rgba(96, 165, 250, 0.32)",
    cx: 155,
    cy: 204,
  },
  {
    id: "sell",
    title: "Sell",
    description:
      "Ring up walk-in and regular shoppers in seconds with tap-to-add tiles, barcode scanning, discounts, and Bluetooth thermal receipts—even offline.",
    outcomeMetric: "2.4s checkout",
    color: "#a78bfa",
    glowColor: "rgba(167, 139, 250, 0.32)",
    cx: 450,
    cy: 174,
  },
  {
    id: "collect",
    title: "Collect",
    description:
      "Use our built-in payments ledger to record Cash, MTN MoMo, Telecel Cash, and Card, split tenders, and track every cedi of customer credit.",
    outcomeMetric: "98.6% collected",
    color: "#fb923c",
    glowColor: "rgba(251, 146, 60, 0.32)",
    cx: 745,
    cy: 116,
  },
  {
    id: "scale",
    title: "Scale",
    description:
      "Grow your business to the next level with Owner, Supervisor, and Cashier roles, low-stock alerts, multi-device sync, and live sales reports.",
    outcomeMetric: "+34% net margin",
    color: "#34d399",
    glowColor: "rgba(52, 211, 153, 0.36)",
    cx: 1040,
    cy: 38,
  },
];

export type HeroPreviewTabId =
  | "home"
  | "register"
  | "checkout"
  | "inventory"
  | "customers"
  | "reports"
  | "staff";

export type HeroPreviewTab = {
  id: HeroPreviewTabId;
  label: string;
  route: string;
};

export const HERO_PREVIEW_TABS: HeroPreviewTab[] = [
  { id: "home", label: "Home", route: "/home" },
  { id: "register", label: "Register", route: "/sell" },
  { id: "checkout", label: "Payments", route: "/pay" },
  { id: "inventory", label: "Inventory", route: "/inventory" },
  { id: "customers", label: "Customers", route: "/customers" },
  { id: "reports", label: "Reports", route: "/reports" },
  { id: "staff", label: "Staff", route: "/staff" },
];

export type DemoProduct = {
  id: string;
  name: string;
  category: "Electronics" | "Groceries" | "Home & Kitchen" | "Clothing" | "Personal Care";
  categoryColor: string;
  cost: number;
  price: number;
  stock: number;
  lowStockAt: number;
  unit: string;
  sku: string;
  barcode: string;
  imageUrl: string;
};

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: "p_earbuds",
    name: "Wireless Earbuds",
    category: "Electronics",
    categoryColor: "#4c8dff",
    cost: 55,
    price: 85,
    stock: 42,
    lowStockAt: 10,
    unit: "pcs",
    sku: "ELEC-001",
    barcode: "GD1111101",
    imageUrl: "/products/earbuds.jpg",
  },
  {
    id: "p_rice",
    name: "Rice 5kg",
    category: "Groceries",
    categoryColor: "#34d399",
    cost: 95,
    price: 120,
    stock: 39,
    lowStockAt: 10,
    unit: "bag",
    sku: "GROC-001",
    barcode: "GD2222201",
    imageUrl: "/products/rice.jpg",
  },
  {
    id: "p_charger",
    name: "Phone Charger 20W",
    category: "Electronics",
    categoryColor: "#4c8dff",
    cost: 28,
    price: 45,
    stock: 96,
    lowStockAt: 15,
    unit: "pcs",
    sku: "ELEC-002",
    barcode: "GD1111102",
    imageUrl: "/products/charger.jpg",
  },
  {
    id: "p_oil",
    name: "Cooking Oil 1L",
    category: "Groceries",
    categoryColor: "#34d399",
    cost: 25,
    price: 32,
    stock: 58,
    lowStockAt: 12,
    unit: "ltr",
    sku: "GROC-002",
    barcode: "GD2222202",
    imageUrl: "/products/oil.jpg",
  },
  {
    id: "p_powerbank",
    name: "Power Bank 10,000mAh",
    category: "Electronics",
    categoryColor: "#4c8dff",
    cost: 85,
    price: 120,
    stock: 27,
    lowStockAt: 8,
    unit: "pcs",
    sku: "ELEC-003",
    barcode: "GD1111103",
    imageUrl: "/products/powerbank.jpg",
  },
  {
    id: "p_indomie",
    name: "Indomie Noodles",
    category: "Groceries",
    categoryColor: "#34d399",
    cost: 2.2,
    price: 3.5,
    stock: 240,
    lowStockAt: 50,
    unit: "pack",
    sku: "GROC-003",
    barcode: "GD2222203",
    imageUrl: "/products/noodles.jpg",
  },
  {
    id: "p_jeans",
    name: "Denim Jeans",
    category: "Clothing",
    categoryColor: "#a78bfa",
    cost: 120,
    price: 180,
    stock: 6,
    lowStockAt: 6,
    unit: "pcs",
    sku: "CLOTH-001",
    barcode: "GD4444401",
    imageUrl: "/products/jeans.jpg",
  },
  {
    id: "p_soap",
    name: "Bathing Soap",
    category: "Personal Care",
    categoryColor: "#f4586e",
    cost: 6.5,
    price: 10,
    stock: 130,
    lowStockAt: 25,
    unit: "pcs",
    sku: "CARE-002",
    barcode: "GD5555502",
    imageUrl: "/products/soap.jpg",
  },
];

export type TestimonialItem = {
  id: string;
  quote: string;
  name: string;
  role: string;
  shopName: string;
  location: string;
  metricLabel: string;
  metricValue: string;
};

export const TESTIMONIALS: TestimonialItem[] = [
  {
    id: "t1",
    quote:
      "Before Nova POS, customers who bought on part-payment were written in a notebook that got torn or misplaced. In our first six weeks we recovered over ₵3,800 in outstanding balances, and evening cash counting dropped from 45 minutes to under 3.",
    name: "Ama Serwaa Mensah",
    role: "Owner",
    shopName: "Bright Corner Provisions",
    location: "Osu, Accra",
    metricLabel: "Credit recovered in 6 weeks",
    metricValue: "₵3,840",
  },
  {
    id: "t2",
    quote:
      "In Adum, mobile data can drop right when five customers are waiting to pay via MTN MoMo and cash. Nova POS never stalls—cashiers scan barcodes with the phone camera, print the Bluetooth receipt immediately, and everything syncs once signal returns.",
    name: "Kwame Boateng",
    role: "Managing Director",
    shopName: "Adum Tech Hub",
    location: "Adum, Kumasi",
    metricLabel: "Counter checkout speed",
    metricValue: "3.4× faster",
  },
  {
    id: "t3",
    quote:
      "We used to realize fast-moving items were finished only when a customer asked for them. Now we get a low-stock alert the moment sugar, cooking oil, or sanitizers hit our minimum threshold.",
    name: "Esi Appiah-Korang",
    role: "Proprietor",
    shopName: "Grace Care & Mini-Mart",
    location: "East Legon, Accra",
    metricLabel: "Reduction in stockouts",
    metricValue: "72%",
  },
  {
    id: "t4",
    quote:
      "Separate Owner, Supervisor, and Cashier roles changed how I run my two stalls. My attendants ring up sales and log stock arrivals while I get live notifications for completed orders and review payment mix from home.",
    name: "Yaw Darko",
    role: "Store Owner",
    shopName: "Market Circle Apparel",
    location: "Takoradi",
    metricLabel: "Monthly shrinkage saved",
    metricValue: "₵1,950",
  },
];

export type FaqItem = {
  id: string;
  q: string;
  a: string;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-1",
    q: "Does Nova POS work without internet or mobile data?",
    a: "Yes. Nova POS is offline-first. Your product catalog, compressed WebP product photos (stored in IndexedDB), customer balances, and order history live directly on your device. You can ring up sales, scan barcodes, adjust stock, and print Bluetooth receipts without a connection. On cloud plans, changes queue in an offline outbox and sync automatically when data returns.",
  },
  {
    id: "faq-2",
    q: "How do MTN MoMo, split payments, and credit sales work?",
    a: "At checkout (/pay), you can record full payments in Cash (with automatic change calculation), Mobile Money (with transaction reference logging such as MTN-TX001), or Card. If a customer pays partly in Cash and partly via MoMo, add both payment lines to the same order. For partial payments or credit purchases, attach the customer profile and Nova POS tracks the unpaid balance until settled.",
  },
  {
    id: "faq-3",
    q: "Do I need dedicated POS hardware or barcode scanners?",
    a: "No. Nova POS runs on any Android phone, tablet, or desktop browser. Your device camera scans barcodes and captures product photos. For printed receipts, pair any standard 58mm or 80mm Bluetooth ESC/POS thermal printer, or share digital receipts directly with customers.",
  },
  {
    id: "faq-4",
    q: "What happens if two staff members edit the same product while offline?",
    a: "On the Enterprise plan, if two devices modify the same record while offline, Nova POS flags the discrepancy in the Sync Conflicts view (/conflicts) so the shop owner can compare both versions and choose the correct record without losing a single sale.",
  },
  {
    id: "faq-5",
    q: "How do the 7-day free trial and yearly Paystack billing work?",
    a: "Single-device offline usage is free forever. When you connect your shop for cloud backup or multi-device team sync, you get a 7-day free trial. After the trial, plans are billed yearly via Paystack in Ghana cedis—Standard is ₵120/year (₵10/month) and Enterprise is ₵360/year (₵30/month). You can keep renewal on Manual (default) or enable Auto-renew.",
  },
  {
    id: "faq-6",
    q: "How is my shop ledger backed up if I change phones?",
    a: "You can export a complete JSON backup of your categories, products, customers, orders, settings, and stock movements from the More screen (/more) at any time. Standard and Enterprise plans also maintain continuous cloud backups so you can sign in and restore your shop onto a new device in seconds.",
  },
];

export type ComparisonRow = {
  feature: string;
  starter: string | boolean;
  standard: string | boolean;
  enterprise: string | boolean;
};

export const PLAN_COMPARISON: ComparisonRow[] = [
  {
    feature: "Offline POS register, cart & discounts",
    starter: true,
    standard: true,
    enterprise: true,
  },
  {
    feature: "Cash, MTN MoMo, Card & split payments",
    starter: true,
    standard: true,
    enterprise: true,
  },
  {
    feature: "Camera barcode scanner & WebP product photos",
    starter: true,
    standard: true,
    enterprise: true,
  },
  {
    feature: "Bluetooth ESC/POS thermal & digital receipts",
    starter: true,
    standard: true,
    enterprise: true,
  },
  {
    feature: "Stock ledger, audit reasons & low-stock alerts",
    starter: true,
    standard: true,
    enterprise: true,
  },
  {
    feature: "Customer profiles & credit balance tracking",
    starter: true,
    standard: true,
    enterprise: true,
  },
  {
    feature: "Backup & device restore",
    starter: "Local JSON export",
    standard: "Automatic cloud backup",
    enterprise: "Real-time cloud backup",
  },
  {
    feature: "Staff accounts & role permissions",
    starter: "1 Owner (local)",
    standard: "Single owner",
    enterprise: "Owner, Supervisor & Cashier",
  },
  {
    feature: "Multi-device sync & conflict resolution",
    starter: false,
    standard: false,
    enterprise: true,
  },
  {
    feature: "Remote owner sale & low-stock notifications",
    starter: false,
    standard: "On-device",
    enterprise: "Synced across owner devices",
  },
  {
    feature: "Counter & desktop access",
    starter: "1 device",
    standard: "1 active device",
    enterprise: "Unlimited counters & desktop",
  },
];

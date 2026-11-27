export type Category = {
  id: string;
  name: string;
  color: string; // hex for chips/dots
};

/**
 * A sellable pack of a product: "Box of 10 strips" of a base unit.
 * `factor` is how many base units one pack contains.
 */
export type Pack = {
  name: string;
  factor: number;
};

/**
 * A batch of a product with its own expiry (pharmacy).
 * `expiry` is an ISO date string ("YYYY-MM-DD"); empty = no expiry.
 */
export type Batch = {
  id: string;
  productId: string;
  batchNo: string;
  expiry: string;
  qty: number;
  cost: number;
  createdAt: number;
  updatedAt: number;
};

/** How much of an order line came out of each batch (FEFO allocation). */
export type BatchAllocation = {
  batchId: string;
  qty: number;
};

/** A choice on a menu item: "no onions", "extra cheese" (restaurant). */
export type Modifier = {
  id: string;
  name: string;
  priceDelta: number;
};

/** A size option on a menu item: "Large +50" (restaurant). */
export type Variant = {
  id: string;
  name: string;
  priceDelta: number;
};

/** One ingredient line of a recipe. */
export type RecipeLine = {
  ingredientProductId: string;
  qty: number;
  wastePct?: number;
};

/** What a plated dish consumes. One recipe per menu item. */
export type Recipe = {
  id: string;
  productId: string;
  lines: RecipeLine[];
  createdAt: number;
  updatedAt: number;
};

/** A dining table (restaurant). */
export type RestaurantTable = {
  id: string;
  name: string;
  seats: number;
  createdAt: number;
  updatedAt: number;
};

/** Where a ticket sits in the kitchen pipeline. */
export type TicketStatus = "queued" | "preparing" | "ready" | "served";

/** Where a booking sits in its life (salon). */
export type AppointmentStatus =
  | "booked"
  | "arrived"
  | "in-service"
  | "done"
  | "no-show"
  | "cancelled";

/** A booked visit (salon). */
export type Appointment = {
  id: string;
  customerId: string | null;
  staffId?: string;
  /** the services booked — [{ productId, price, qty? }] */
  serviceLines: { productId: string; price: number; qty?: number }[];
  /** when the visit starts — ISO datetime */
  start: string;
  /** how long the visit runs, in minutes */
  durationMin: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

/**
 * A service package (salon) — bought once, spent over many visits.
 *
 * `credits` says what the package carries: a braid package might hold
 * "2 × braids, 1 × treatment".
 */
export type Package = {
  id: string;
  name: string;
  price: number;
  credits: { productId: string; qty: number }[];
  createdAt: number;
  updatedAt: number;
};

export type Product = {
  id: string;
  name: string;
  categoryId: string | null;
  cost: number; // buying price GHS
  price: number; // selling price GHS
  stock: number; // current units
  lowStockAt: number; // alert threshold
  unit: "pcs" | "kg" | "bag" | "box" | "ltr" | "pack";
  sku: string;
  barcode: string;
  imageUrl: string; // photo path; empty = monogram tile
  description: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  /* pharmacy */
  prescriptionOnly?: boolean;
  controlled?: boolean;
  packs?: Pack[];
  /* restaurant */
  modifiers?: Modifier[];
  variants?: Variant[];
  /** the item is off the menu until this date (inclusive) */
  unavailableUntil?: string;
  /* salon */
  /** "service" items are sold by appointment — they never touch stock */
  kind?: "product" | "service";
  /** how long the service takes, in minutes */
  durationMin?: number;
};

export type PaymentMethod = "cash" | "momo" | "card" | "credit";

export type Payment = {
  id: string;
  method: PaymentMethod;
  amount: number;
  t: number;
  ref?: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  imageUrl: string;
  qty: number;
  price: number; // unit price at time of sale
  cost: number; // unit cost at time of sale (for reports)
  /* pharmacy */
  batchAllocations?: BatchAllocation[];
  packName?: string;
  prescriptionRef?: string;
  /** base units this line consumed (pack lines sell packs, stock moves in base units) */
  baseQty?: number;
  /* restaurant */
  modifierIds?: string[];
  /** names snapshotted so the receipt and order detail read right even if the menu item changes */
  modifierNames?: string[];
  variantId?: string;
  variantName?: string;
  /** ingredients this line consumed — so a refund can credit exactly what was taken */
  recipeConsumption?: { productId: string; qty: number }[];
  /* salon */
  /** the staff member who served this line — earns the commission */
  serviceStaffId?: string;
  /** the commission this line earned, stamped at sale time */
  commissionAmt?: number;
  /** the line was paid for with a package credit (priced to 0) */
  useCredit?: boolean;
  /** the package this line belongs to — set on a package purchase or a credit line */
  packageId?: string;
  /** how many units of this line a package credit paid for */
  creditedQty?: number;
  /** "service" lines are sold by appointment — they never touch stock */
  kind?: "product" | "service";
};

export type OrderStatus = "pending" | "completed" | "refunded";
export type PayStatus = "unpaid" | "partial" | "paid" | "refunded";

export type Order = {
  id: string; // ORD-YYYYMMDD-NNNN
  items: OrderItem[];
  customerId: string | null; // null = walk-in
  subtotal: number;
  discount: number; // amount GHS
  total: number;
  tax?: number; // tax on the order (added to total, or informational when prices include tax)
  status: OrderStatus;
  payments: Payment[];
  payStatus: PayStatus;
  createdAt: number;
  completedAt: number | null;
  note?: string;
  /* restaurant */
  orderType?: string; // "dine-in" | "takeaway" | "delivery"
  tableId?: string;
  ticketStatus?: TicketStatus;
  /* salon */
  /** the staff member who served the visit — the one who earned the commission */
  staffId?: string;
  /** the appointment this visit came from */
  appointmentId?: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  note: string;
  createdAt: number;
  /* pharmacy */
  allergies?: string;
  /* salon */
  /** notes the stylist left on a visit — newest first */
  visitNotes?: { t: number; text: string }[];
  /** package credits this client still owns — [{ packageId, remaining, sourceOrderId? }] */
  packageCredits?: {
    packageId: string;
    remaining: number;
    /** the purchase that granted this entry — a refund voids only its own */
    sourceOrderId?: string;
  }[];
};

export type StockMove = {
  id: string;
  productId: string;
  qty: number; // negative = out
  reason: StockReason;
  ref?: string; // order id / note
  t: number;
  batchId?: string; // which batch moved (pharmacy)
};

export type StockReason =
  | "purchase"
  | "sale"
  | "adjust"
  | "damage"
  | "return"
  | "count"
  | "opening"
  | "expiry";

export type FinanceEntryKind = "expense" | "funds";

export type FinanceMethod = "cash" | "momo" | "bank" | "other";

export type FinanceCategory = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

export type FinanceEntry = {
  id: string;
  kind: FinanceEntryKind;
  amount: number;
  categoryId: string | null;
  goalId: string | null;
  source: string;
  note: string;
  method: FinanceMethod;
  t: number;
  createdAt: number;
};

export type FinanceBudget = {
  id: string;
  categoryId: string;
  amount: number;
  month: string;
  createdAt: number;
  updatedAt: number;
};

export type FinanceGoal = {
  id: string;
  name: string;
  target: number;
  color: string;
  balance: number;
  createdAt: number;
  updatedAt: number;
};

export const BUSINESS_TYPES = ["retail", "pharmacy", "restaurant", "salon", "personal"] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export type Settings = {
  businessType: BusinessType;
  shopName: string;
  address: string;
  phone: string;
  ownerId: string; // display name
  momoNumber: string;
  momoNetwork: string;
  taxInclusive: boolean; // prices include tax
  taxRate: number; // percent, e.g. 15 = 15% (0 = no tax)
  receiptFooter: string;
  theme: "dark" | "light";
  nextOrderNo: number;
  createdAt: number;
  /** restaurant setup — absent for every other business type */
  restaurantConfig?: {
    /** dine-in tables (a takeaway-only food vendor has none) */
    tables: boolean;
    /** the order types this shop takes */
    orderTypes: string[];
  };
  /** salon setup — absent for every other business type */
  salonConfig?: {
    /** the days the salon opens — 0 is Sunday, 6 is Saturday */
    openDays: number[];
    /** the opening hours — "HH:MM" */
    openHours: { start: string; end: string };
  };
};

/**
 * A cart line. `packIdx` points at `Product.packs[packIdx]` when the customer
 * bought a pack rather than the base unit; `price` is the pack price then
 * (undefined = the product's own price). `qty` counts the sold units
 * (packs when `packIdx` is set, base units otherwise).
 */
export type CartLine = {
  productId: string;
  qty: number;
  packIdx?: number;
  price?: number;
  /* restaurant */
  variantId?: string;
  variantName?: string;
  modifierIds?: string[];
  modifierNames?: string[];
  /* salon */
  /** the staff member serving this line — earns the commission */
  staffId?: string;
  /** the line is paid for with a package credit (prices to 0) */
  useCredit?: boolean;
  /** the package this line belongs to — set on a package purchase */
  packageId?: string;
};

export type Supplier = {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: number;
  updatedAt: number;
};

export type PurchaseOrderLine = {
  productId: string;
  packName: string | null;
  qty: number;
  unitCost: number;
};

export type PurchaseOrder = {
  id: string;
  supplierId: string | null;
  status: "draft" | "sent" | "received";
  lines: PurchaseOrderLine[];
  total: number;
  receivedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

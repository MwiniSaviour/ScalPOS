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

export const BUSINESS_TYPES = ["retail", "pharmacy", "restaurant", "salon"] as const;

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
};

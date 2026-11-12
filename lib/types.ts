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
};

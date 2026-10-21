export type Category = {
  id: string;
  name: string;
  color: string; // hex for chips/dots
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
};

export type StockMove = {
  id: string;
  productId: string;
  qty: number; // negative = out
  reason: StockReason;
  ref?: string; // order id / note
  t: number;
};

export type StockReason = "purchase" | "sale" | "adjust" | "damage" | "return" | "count" | "opening";

export type Settings = {
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

export type CartLine = {
  productId: string;
  qty: number;
};

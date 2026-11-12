import type { Feature } from "./features"

export type Role = "admin" | "employee"

export const BUSINESS_TYPES = ["retail", "pharmacy", "restaurant", "salon"] as const

export type BusinessType = (typeof BUSINESS_TYPES)[number]

export type OrderStatus = "pending" | "completed" | "refunded"
export type OrderPayStatus = "unpaid" | "partial" | "paid" | "refunded"
export type PaymentMethod = "cash" | "momo" | "card" | "credit"

export type PaymentStatus = "paid" | "pending"

export interface Profile {
  id: string
  name: string
  email: string
  avatar: string | null
  role: Role
  pin: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  color: string | null
  description: string | null
  image: string | null
  created_at: string
  product_count?: number
}

/**
 * A sellable pack of a product: "Box of 10 strips" of a base unit.
 * `factor` is how many base units one pack holds.
 */
export interface Pack {
  name: string
  factor: number
}

export interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
  price: number
  cost_price: number | null
  stock: number
  category_id: string | null
  category?: Category
  image: string | null
  description: string | null
  unit: string
  low_stock_at: number
  active: boolean
  prescription_only: boolean
  controlled: boolean
  packs: Pack[] | null
  created_at: string
  updated_at: string
}

/**
 * A batch of a product with its own expiry (pharmacy).
 * `expiry` is a "YYYY-MM-DD" date or null when the product does not expire.
 */
export interface ProductBatch {
  id: string
  product_id: string
  batch_no: string
  expiry: string | null
  qty: number
  cost: number
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  note: string | null
  created_at: string
  total_purchases: number
}

export interface Supplier {
  id: string
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface Sale {
  id: string
  invoice_no: string
  customer_id: string | null
  customer?: Customer
  employee_id: string | null
  employee?: Profile
  subtotal: number
  tax: number
  discount: number
  total: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  status: OrderStatus
  pay_status: OrderPayStatus
  payments: { method: PaymentMethod; amount: number }[]
  sale_date: string
  created_at: string
  items?: SaleItem[]
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: string | null
  date: string
  created_at: string
}

export interface Staff {
  id: string
  name: string
  role: "owner" | "supervisor" | "cashier"
  phone: string | null
  photo_path: string | null
  active: boolean
  created_at: string
}

export type StockMoveReason = "purchase" | "sale" | "adjust" | "damage" | "return" | "count" | "opening"

export interface StockMove {
  id: string
  product_id: string
  qty: number
  reason: StockMoveReason
  ref: string | null
  occurred_at: string
}

export interface ShopSettings {
  business_type: string
  shop_name: string
  address: string | null
  phone: string | null
  owner_name: string | null
  momo_number: string | null
  momo_network: string | null
  tax_inclusive: boolean
  tax_rate: number
  receipt_footer: string | null
  theme: string | null
  next_order_no: number
}

export interface DashboardStats {
  today_revenue: number
  month_revenue: number
  total_products: number
  total_customers: number
  low_stock_count: number
}

export interface RevenuePoint {
  date: string
  amount: number
}

export interface TopProduct {
  id: string
  name: string
  image: string | null
  total_quantity: number
  total_revenue: number
}

export interface CategorySales {
  category_name: string
  total: number
}

export type NavItem = {
  label: string
  href: string
  icon: string
  roles?: Role[]
  soon?: boolean
  /** the business type has to carry this feature for the item to show */
  feature?: Feature
  children?: NavItem[]
}

/**
 * One ordered line of a purchase order. The qty is in base units — the pack
 * name is only a label on the line, it never multiplies the quantity.
 */
export interface PurchaseOrderLine {
  productId: string
  packName: string | null
  qty: number
  unitCost: number
}

export interface PurchaseOrder {
  id: string
  supplier_id: string | null
  status: "draft" | "sent" | "received"
  lines: PurchaseOrderLine[]
  total: number
  received_at: string | null
  created_at: string
  updated_at: string
}

export interface CartItem {
  product_id: string
  product_name: string
  image: string | null
  unit_price: number
  quantity: number
  stock: number
}

export type ScanMode = "receive" | "pos"

export interface ScanSessionItem {
  product_id: string
  product_name: string
  barcode: string
  previous_stock: number
  new_stock: number
  quantity_added: number
  scanned_at: string
}

export interface ScanSession {
  id: string
  mode: ScanMode
  items: ScanSessionItem[]
  started_at: string
  completed_at: string | null
  status: "active" | "completed"
}

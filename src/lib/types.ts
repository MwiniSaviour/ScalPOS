export type Role = "admin" | "employee"

export type PaymentMethod = "cash" | "card" | "transfer"

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
  description: string | null
  image: string | null
  created_at: string
  product_count?: number
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
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
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
  children?: NavItem[]
}

export interface CartItem {
  product_id: string
  product_name: string
  image: string | null
  unit_price: number
  quantity: number
  stock: number
}

import type { NavItem } from "./types"

export const APP_NAME = "ShopManager"

export const STOCK_THRESHOLD = 10

export const TAX_PERCENT = 0

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "transfer", label: "Bank Transfer" },
] as const

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  {
    label: "Product Management",
    href: "/dashboard/products",
    icon: "Package",
    children: [
      { label: "Products", href: "/dashboard/products", icon: "Package" },
      { label: "Categories", href: "/dashboard/categories", icon: "Tags" },
    ],
  },
  { label: "Customers", href: "/dashboard/customers", icon: "Users" },
  { label: "Suppliers", href: "/dashboard/suppliers", icon: "Truck" },
  { label: "Employees", href: "/dashboard/employees", icon: "UserCog", roles: ["admin"] },
  { label: "POS", href: "/dashboard/pos", icon: "ShoppingCart" },
  { label: "Scanner", href: "/dashboard/scan", icon: "Scan" },
  { label: "Analytics & Reporting", href: "/dashboard/analytics", icon: "BarChart3" },
  { label: "Payments", href: "/dashboard/payments", icon: "Receipt" },
]

export const SCAN_MODES = [
  { value: "receive", label: "Receive Stock", description: "Scan products to add stock" },
  { value: "pos", label: "POS Scan", description: "Scan products to add to cart" },
] as const

export const ROLES = ["admin", "employee"] as const

export const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "price", label: "Price" },
  { value: "stock", label: "Stock" },
  { value: "created_at", label: "Newest" },
] as const

import type { NavItem } from "./types"

export const APP_NAME = "ScalPOS"

export const STOCK_THRESHOLD = 10

export const TAX_PERCENT = 0

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "momo", label: "Mobile Money" },
  { value: "card", label: "Card" },
  { value: "credit", label: "Credit" },
] as const

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  {
    label: "Inventory",
    href: "/dashboard/products",
    icon: "Package",
    children: [
      { label: "Products", href: "/dashboard/products", icon: "Package" },
      { label: "Categories", href: "/dashboard/categories", icon: "Tags" },
    ],
  },
  { label: "Customers", href: "/dashboard/customers", icon: "Users" },
  { label: "Suppliers", href: "/dashboard/suppliers", icon: "Truck" },
  {
    label: "Purchase Orders",
    href: "/dashboard/purchase-orders",
    icon: "ClipboardList",
    feature: "suppliers-po",
  },
  { label: "Employees", href: "/dashboard/employees", icon: "UserCog", roles: ["admin"] },
  { label: "POS", href: "/dashboard/pos", icon: "ShoppingCart" },
  { label: "Analytics & Reporting", href: "/dashboard/analytics", icon: "BarChart3" },
  { label: "Orders", href: "/dashboard/orders", icon: "ShoppingCart" },
]

export const SCAN_MODES = [
  { value: "receive", label: "Receive Stock", description: "Scan products to add stock" },
  { value: "pos", label: "POS Scan", description: "Scan products to add to cart" },
] as const

export const ROLES = ["owner", "supervisor", "cashier"] as const

export const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  owner: "Owner",
  supervisor: "Supervisor",
  cashier: "Cashier",
}

export const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "price", label: "Price" },
  { value: "stock", label: "Stock" },
  { value: "created_at", label: "Newest" },
] as const

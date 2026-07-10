import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

export function generateInvoiceNo(): string {
  const now = new Date()
  const yy = now.getFullYear().toString().slice(2)
  const mm = (now.getMonth() + 1).toString().padStart(2, "0")
  const dd = now.getDate().toString().padStart(2, "0")
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `INV-${yy}${mm}${dd}-${rand}`
}

export function getStockStatus(stock: number): {
  label: string
  variant: "success" | "warning" | "danger"
} {
  if (stock <= 0) return { label: "Out of Stock", variant: "danger" }
  if (stock <= 10) return { label: "Low Stock", variant: "warning" }
  return { label: "In Stock", variant: "success" }
}

export function calculateCartTotals(items: { unit_price: number; quantity: number }[]) {
  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
  return { subtotal }
}

export function calculateSaleTotal(
  subtotal: number,
  taxPercent: number,
  discountPercent: number
) {
  const discount = subtotal * (discountPercent / 100)
  const taxable = subtotal - discount
  const tax = taxable * (taxPercent / 100)
  const total = taxable + tax
  return { subtotal, discount, tax, total }
}

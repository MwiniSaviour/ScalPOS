"use client"

import { useEffect, useState } from "react"
import { fetchSettings } from "./api/data"
import { BUSINESS_TYPES, type BusinessType } from "./types"

export type Terms = {
  customer: string
  customers: string
  product: string
  products: string
  inventory: string
  order: string
  orders: string
  sale: string
}

const RETAIL: Terms = {
  customer: "Customer",
  customers: "Customers",
  product: "Product",
  products: "Products",
  inventory: "Inventory",
  order: "Order",
  orders: "Orders",
  sale: "Sale",
}

const TABLES: Record<BusinessType, Terms> = {
  retail: RETAIL,
  pharmacy: { ...RETAIL, customer: "Patient", customers: "Patients" },
  restaurant: {
    ...RETAIL,
    product: "Menu item",
    products: "Menu items",
    order: "Ticket",
    orders: "Tickets",
  },
  salon: {
    ...RETAIL,
    customer: "Client",
    customers: "Clients",
    product: "Service/Product",
    products: "Services/Products",
  },
}

export function termsOf(bt: BusinessType): Terms {
  return TABLES[bt] ?? RETAIL
}

export function isBusinessType(value: string): value is BusinessType {
  return (BUSINESS_TYPES as readonly string[]).includes(value)
}

export function useBusinessType(): BusinessType {
  const [businessType, setBusinessType] = useState<BusinessType>("retail")

  useEffect(() => {
    let alive = true
    fetchSettings()
      .then((settings) => {
        if (!alive) return
        const raw = settings?.business_type ?? "retail"
        setBusinessType(isBusinessType(raw) ? raw : "retail")
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return businessType
}

export function useTerms(): Terms {
  return termsOf(useBusinessType())
}

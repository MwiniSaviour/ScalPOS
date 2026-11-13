"use client";
import { usePos } from "./store";
import type { BusinessType } from "./types";

type Terms = {
  customer: string; customers: string; product: string; products: string;
  inventory: string; order: string; orders: string; sale: string;
};
const RETAIL: Terms = { customer: "Customer", customers: "Customers", product: "Product",
  products: "Products", inventory: "Inventory", order: "Order", orders: "Orders", sale: "Sale" };
const TABLES: Record<BusinessType, Terms> = {
  retail: RETAIL,
  pharmacy: { ...RETAIL, customer: "Patient", customers: "Patients" },
  restaurant: { ...RETAIL, product: "Menu item", products: "Menu items",
    order: "Ticket", orders: "Tickets" },
  salon: { ...RETAIL, customer: "Client", customers: "Clients",
    product: "Service/Product", products: "Services/Products" },
};
export function termsOf(bt: BusinessType): Terms { return TABLES[bt] ?? RETAIL; }
export function useTerms(): Terms { return termsOf(usePos((s) => s.settings.businessType)); }

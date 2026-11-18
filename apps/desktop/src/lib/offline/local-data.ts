"use client";

import type {
  Appointment, Category, Customer, PaymentMethod,
  Product, Sale, SaleItem, ServicePackage, ShopSettings, Staff,
} from "@/lib/types";
export type LocalAppointmentInput = {
  customer_id?: string | null
  staff_id?: string | null
  service_lines: { productId: string; price: number; qty?: number }[]
  start: string
  duration_min?: number
  status?: Appointment["status"]
  notes?: string
}

export type LocalStaffInput = {
  name: string
  role: "owner" | "supervisor" | "cashier"
  phone?: string | null
  photo_path?: string | null
  active?: boolean
  skills?: string[] | null
  schedule?: { day: number; start: string; end: string }[] | null
  commission_pct?: number | null
}
import { localAll, localDelete, localGet, localPut, nextLocalOrderNo } from "./local-db";

export const LOCAL_SHOP_KEY = "desk-pos-local-shop-v1";

export function hasLocalShop(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(LOCAL_SHOP_KEY) === "1";
}

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function localOrderId(no: number): string {
  const d = new Date();
  const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `ORD-${day}-${String(no).padStart(4, "0")}`;
}

export async function createLocalShop(settings?: Partial<ShopSettings>): Promise<ShopSettings> {
  const existing = await localGet<ShopSettings & { id: string }>("settings", "shop");
  if (existing) return existing;
  const shop: ShopSettings & { id: string } = {
    id: "shop",
    business_type: "retail",
    shop_name: "My Shop",
    address: null,
    phone: null,
    owner_name: "Owner",
    momo_number: null,
    momo_network: null,
    tax_inclusive: true,
    tax_rate: 0,
    receipt_footer: null,
    theme: "dark",
    next_order_no: 1,
    ...settings,
  };
  await localPut("settings", shop);
  window.localStorage.setItem(LOCAL_SHOP_KEY, "1");
  return shop;
}

export async function localSettings(): Promise<ShopSettings | null> {
  const row = await localGet<ShopSettings & { id: string }>("settings", "shop");
  if (!row) return null;
  return { ...row, id: undefined } as unknown as ShopSettings;
}

export async function updateLocalSettings(input: Partial<ShopSettings>): Promise<ShopSettings> {
  const current = (await localSettings()) ?? (await createLocalShop());
  const next = { ...current, ...input };
  await localPut("settings", { ...next, id: "shop" });
  return next;
}

export const localProducts = () => localAll<Product>("products");
export const localProduct = (productId: string) => localGet<Product>("products", productId);
export async function saveLocalProduct(product: Product): Promise<Product> {
  return localPut("products", product);
}
export async function deleteLocalProduct(productId: string): Promise<void> {
  await localDelete("products", productId);
}

export const localCategories = () => localAll<Category>("categories");
export const localCustomers = () => localAll<Customer>("customers");
export const localStaff = () => localAll<Staff>("staff");
export const localAppointments = () => localAll<Appointment>("appointments");
export const localPackages = () => localAll<ServicePackage>("packages");

export async function saveLocalAppointment(input: LocalAppointmentInput, appointmentId?: string): Promise<Appointment> {
  const now = new Date().toISOString();
  const current = appointmentId ? await localGet<Appointment>("appointments", appointmentId) : null;
  const row: Appointment = {
    id: appointmentId ?? id("ap_"),
    customer_id: input.customer_id ?? null,
    staff_id: input.staff_id ?? null,
    service_lines: input.service_lines,
    start: input.start,
    duration_min: input.duration_min ?? 30,
    status: input.status ?? "booked",
    notes: input.notes ?? "",
    created_at: current?.created_at ?? now,
    updated_at: now,
  };
  return localPut("appointments", row);
}

export async function deleteLocalAppointment(appointmentId: string): Promise<void> {
  await localDelete("appointments", appointmentId);
}

export async function saveLocalPackage(input: {
  name: string; price: number; credits: { productId: string; qty: number }[];
}, packageId?: string): Promise<ServicePackage> {
  const now = new Date().toISOString();
  const current = packageId ? await localGet<ServicePackage>("packages", packageId) : null;
  const row: ServicePackage = {
    id: packageId ?? id("pk_"),
    name: input.name,
    price: input.price,
    credits: input.credits,
    created_at: current?.created_at ?? now,
    updated_at: now,
  };
  return localPut("packages", row);
}

export async function deleteLocalPackage(packageId: string): Promise<void> {
  await localDelete("packages", packageId);
}

export type LocalSaleInput = {
  customer_id?: string | null;
  staff_id?: string | null;
  appointment_id?: string | null;
  items: {
    product_id: string | null
    name: string
    image_path?: string | null
    qty: number
    price: number
    service_staff_id?: string | null
    commission_amt?: number | null
    use_credit?: boolean
    package_id?: string | null
    credited_qty?: number | null
    kind?: "product" | "service" | null
  }[];
  payments: { method: string; amount: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  note?: string | null;
};

export async function localPlaceSale(input: LocalSaleInput, staffInput?: LocalStaffInput): Promise<Sale> {
  const no = await nextLocalOrderNo();
  const localId = localOrderId(no);
  const now = new Date().toISOString();
  const paid = input.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const items: SaleItem[] = input.items.map((it, i) => ({
    id: `${localId}#${i}`,
    sale_id: localId,
    product_id: it.product_id ?? null,
    product_name: it.name,
    quantity: it.qty,
    unit_price: it.price,
    subtotal: Math.round(it.qty * it.price * 100) / 100,
    variant_id: null,
    variant_name: null,
    modifier_ids: null,
    modifier_names: null,
    service_staff_id: it.service_staff_id ?? null,
    commission_amt: it.commission_amt ?? null,
    use_credit: it.use_credit ?? false,
    package_id: it.package_id ?? null,
    credited_qty: it.credited_qty ?? null,
    kind: it.kind ?? null,
  }));
  const row: Sale & { id: string } = {
    id: localId,
    invoice_no: localId,
    customer_id: input.customer_id ?? null,
    employee_id: null,
    subtotal: input.subtotal,
    tax: input.tax,
    discount: input.discount,
    total: input.total,
    payment_method: (input.payments[0]?.method ?? "cash") as PaymentMethod,
    payment_status: paid >= input.total ? "paid" : "pending",
    status: paid >= input.total ? "completed" : "pending",
    pay_status: paid >= input.total ? "paid" : paid > 0 ? "partial" : "unpaid",
    payments: input.payments.map((p) => ({ method: p.method as PaymentMethod, amount: p.amount })),
    order_type: null,
    table_id: null,
    ticket_status: null,
    staff_id: input.staff_id ?? null,
    appointment_id: input.appointment_id ?? null,
    sale_date: now,
    created_at: now,
    items,
  };
  await localPut("orders", row);

  if (staffInput) {
    await saveLocalStaff(staffInput);
  }
  for (const item of items) {
    if (!item.product_id || item.kind === "service") continue;
    const product = await localGet<Product>("products", item.product_id);
    if (product) await localPut("products", { ...product, stock: Math.max(0, product.stock - item.quantity) });
  }
  return row;
}

export const localSales = () => localAll<Sale>("orders");
export const localSale = (saleId: string) => localGet<Sale>("orders", saleId);

export async function saveLocalStaff(input: LocalStaffInput & { id?: string | null }): Promise<Staff> {
  const now = new Date().toISOString();
  const current = input.id ? await localGet<Staff>("staff", input.id) : null;
  const row: Staff = {
    id: input.id ?? id("st_"),
    name: input.name.trim(),
    role: input.role,
    phone: input.phone ?? null,
    photo_path: input.photo_path ?? null,
    active: input.active !== false,
    created_at: current?.created_at ?? now,
    skills: input.skills ?? null,
    schedule: input.schedule ?? null,
    commission_pct: input.commission_pct ?? null,
  };
  return localPut("staff", row);
}

export async function deleteLocalStaff(staffId: string): Promise<void> {
  await localDelete("staff", staffId);
}

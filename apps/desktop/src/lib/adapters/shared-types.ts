import type {
  Appointment as SharedAppointment,
  Batch as SharedBatch,
  Category as SharedCategory,
  Customer as SharedCustomer,
  Order as SharedOrder,
  Package as SharedPackage,
  Product as SharedProduct,
  Recipe as SharedRecipe,
  RestaurantTable as SharedTable,
  Settings as SharedSettings,
  StockMove as SharedStockMove,
  Supplier as SharedSupplier,
  PurchaseOrder as SharedPurchaseOrder,
} from "@pos/types";
import type { Staff as SharedStaff } from "@pos/staff";
import type {
  Appointment,
  Category,
  Customer,
  Product,
  ProductBatch,
  PurchaseOrder,
  Recipe,
  RestaurantTable,
  Sale,
  ServicePackage,
  ShopSettings,
  Staff,
  StockMove,
  Supplier,
} from "@/lib/types";

const iso = (t: number | null | undefined) => (t ? new Date(t).toISOString() : new Date(0).toISOString());

export function toDesktopProduct(p: SharedProduct): Product {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode || null,
    price: p.price,
    cost_price: p.cost,
    stock: p.stock,
    category_id: p.categoryId,
    image: p.imageUrl || null,
    description: p.description,
    unit: p.unit,
    low_stock_at: p.lowStockAt,
    active: p.active,
    prescription_only: p.prescriptionOnly ?? false,
    controlled: p.controlled ?? false,
    packs: p.packs ?? null,
    modifiers: p.modifiers ?? null,
    variants: p.variants ?? null,
    unavailable_until: p.unavailableUntil ?? null,
    kind: p.kind ?? null,
    duration_min: p.durationMin ?? null,
    created_at: iso(p.createdAt),
    updated_at: iso(p.updatedAt),
  };
}

export function toSharedProduct(i: {
  name: string;
  price: number;
  id?: string;
  sku?: string;
  barcode?: string | null;
  cost_price?: number | null;
  stock?: number;
  category_id?: string | null;
  image?: string | null;
  description?: string | null;
  unit?: string;
  low_stock_at?: number;
  active?: boolean;
  prescription_only?: boolean;
  controlled?: boolean;
  packs?: Product["packs"];
  modifiers?: Product["modifiers"];
  variants?: Product["variants"];
  unavailable_until?: string | null;
  kind?: "product" | "service" | null;
  duration_min?: number | null;
}): Partial<SharedProduct> & { name: string; price: number } {
  return {
    ...(i.id ? { id: i.id } : {}),
    name: i.name,
    price: i.price,
    sku: i.sku ?? "",
    barcode: i.barcode ?? "",
    cost: i.cost_price ?? 0,
    stock: i.stock ?? 0,
    categoryId: i.category_id ?? null,
    imageUrl: i.image ?? "",
    description: i.description ?? "",
    unit: (i.unit ?? "pcs") as SharedProduct["unit"],
    lowStockAt: i.low_stock_at ?? 0,
    active: i.active ?? true,
    prescriptionOnly: i.prescription_only ?? false,
    controlled: i.controlled ?? false,
    packs: i.packs ?? undefined,
    modifiers: i.modifiers ?? undefined,
    variants: i.variants ?? undefined,
    unavailableUntil: i.unavailable_until ?? undefined,
    kind: i.kind ?? undefined,
    durationMin: i.duration_min ?? undefined,
  };
}

export function toDesktopCategory(c: SharedCategory): Category {
  return { id: c.id, name: c.name, color: c.color, description: null, image: null, created_at: iso(0) };
}

export function toDesktopCustomer(c: SharedCustomer): Customer {
  return {
    id: c.id,
    name: c.name,
    email: "",
    phone: c.phone,
    address: c.address,
    note: c.note,
    created_at: iso(c.createdAt),
    total_purchases: 0,
    visit_notes: c.visitNotes ?? null,
    package_credits: c.packageCredits ?? null,
  };
}

export function toSharedCustomer(i: {
  id?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
}): Partial<SharedCustomer> & { name: string } {
  return {
    ...(i.id ? { id: i.id } : {}),
    name: i.name,
    phone: i.phone ?? "",
    address: i.address ?? "",
    note: i.note ?? "",
  };
}

export function toDesktopSale(o: SharedOrder): Sale {
  const method = (o.payments[0]?.method ?? "cash") as Sale["payment_method"];
  return {
    id: o.id,
    invoice_no: o.id,
    customer_id: o.customerId,
    employee_id: null,
    subtotal: o.subtotal,
    tax: o.tax ?? 0,
    discount: o.discount,
    total: o.total,
    payment_method: method,
    payment_status: o.status === "refunded" || o.payStatus === "paid" ? "paid" : "pending",
    status: o.status,
    pay_status: o.status === "refunded"
      ? "refunded"
      : o.payStatus === "paid"
        ? "paid"
        : o.payStatus === "partial"
          ? "partial"
          : "unpaid",
    payments: o.payments.map((p) => ({ method: p.method, amount: p.amount })),
    order_type: o.orderType ?? null,
    table_id: o.tableId ?? null,
    ticket_status: o.ticketStatus ?? null,
    staff_id: o.staffId ?? null,
    appointment_id: o.appointmentId ?? null,
    sale_date: iso(o.createdAt),
    created_at: iso(o.createdAt),
    items: o.items.map((it, n) => ({
      id: `${o.id}#${n}`,
      sale_id: o.id,
      product_id: it.productId || null,
      product_name: it.name,
      quantity: it.qty,
      unit_price: it.price,
      subtotal: Math.round(it.qty * it.price * 100) / 100,
      variant_id: it.variantId ?? null,
      variant_name: it.variantName ?? null,
      modifier_ids: it.modifierIds ?? null,
      modifier_names: it.modifierNames ?? null,
      service_staff_id: it.serviceStaffId ?? null,
      commission_amt: it.commissionAmt ?? null,
      use_credit: it.useCredit ?? false,
      package_id: it.packageId ?? null,
      credited_qty: it.creditedQty ?? null,
      kind: it.kind ?? null,
    })),
  };
}

export function toDesktopStaff(s: SharedStaff): Staff {
  return {
    id: s.id,
    name: s.name,
    role: s.role,
    phone: s.phone ?? null,
    photo_path: s.photoId ?? null,
    active: s.active,
    created_at: iso(s.createdAt),
    skills: s.skills ?? null,
    schedule: s.schedule ?? null,
    commission_pct: s.commissionPct ?? null,
  };
}

export function toDesktopAppointment(a: SharedAppointment): Appointment {
  return {
    id: a.id,
    customer_id: a.customerId,
    staff_id: a.staffId ?? null,
    service_lines: a.serviceLines,
    start: a.start,
    duration_min: a.durationMin,
    status: a.status,
    notes: a.notes ?? "",
    created_at: iso(a.createdAt),
    updated_at: iso(a.updatedAt),
  };
}

export function toDesktopPackage(p: SharedPackage): ServicePackage {
  return { id: p.id, name: p.name, price: p.price, credits: p.credits, created_at: iso(p.createdAt), updated_at: iso(p.updatedAt) };
}

export function toDesktopRecipe(r: SharedRecipe): Recipe {
  return { id: r.id, product_id: r.productId, lines: r.lines, created_at: iso(r.createdAt) };
}

export function toDesktopTable(t: SharedTable): RestaurantTable {
  return { id: t.id, name: t.name, seats: t.seats, created_at: iso(t.createdAt) };
}

export function toDesktopBatch(b: SharedBatch): ProductBatch {
  return { id: b.id, product_id: b.productId, batch_no: b.batchNo, expiry: b.expiry || null, qty: b.qty, cost: b.cost };
}

export function toDesktopSupplier(s: SharedSupplier): Supplier {
  return {
    id: s.id,
    name: s.name,
    contact_person: s.contactPerson,
    email: s.email,
    phone: s.phone,
    address: s.address,
    created_at: iso(s.createdAt),
  };
}

export function toDesktopPurchaseOrder(p: SharedPurchaseOrder): PurchaseOrder {
  return {
    id: p.id,
    supplier_id: p.supplierId,
    status: p.status,
    lines: p.lines,
    total: p.total,
    received_at: p.receivedAt ? iso(p.receivedAt) : null,
    created_at: iso(p.createdAt),
    updated_at: iso(p.updatedAt),
  };
}

export function toDesktopStockMove(m: SharedStockMove): StockMove {
  const reason = m.reason === "expiry" ? "damage" : m.reason;
  return { id: m.id, product_id: m.productId, qty: m.qty, reason: reason as StockMove["reason"], ref: m.ref ?? null, occurred_at: iso(m.t) };
}

export function toDesktopSettings(s: SharedSettings): ShopSettings {
  return {
    business_type: s.businessType,
    shop_name: s.shopName,
    address: s.address || null,
    phone: s.phone || null,
    owner_name: s.ownerId || null,
    momo_number: s.momoNumber || null,
    momo_network: s.momoNetwork || null,
    tax_inclusive: s.taxInclusive,
    tax_rate: s.taxRate,
    receipt_footer: s.receiptFooter || null,
    theme: s.theme,
    next_order_no: s.nextOrderNo,
  };
}

export function toSharedSettings(s: Partial<ShopSettings>): Partial<SharedSettings> {
  return {
    ...(s.business_type ? { businessType: s.business_type as SharedSettings["businessType"] } : {}),
    ...(s.shop_name !== undefined ? { shopName: s.shop_name } : {}),
    ...(s.address !== undefined ? { address: s.address ?? "" } : {}),
    ...(s.phone !== undefined ? { phone: s.phone ?? "" } : {}),
    ...(s.owner_name !== undefined ? { ownerId: s.owner_name ?? "" } : {}),
    ...(s.momo_number !== undefined ? { momoNumber: s.momo_number ?? "" } : {}),
    ...(s.momo_network !== undefined ? { momoNetwork: s.momo_network ?? "" } : {}),
    ...(s.tax_inclusive !== undefined ? { taxInclusive: s.tax_inclusive } : {}),
    ...(s.tax_rate !== undefined ? { taxRate: s.tax_rate } : {}),
    ...(s.receipt_footer !== undefined ? { receiptFooter: s.receipt_footer ?? "" } : {}),
    ...(s.theme !== undefined ? { theme: s.theme as SharedSettings["theme"] } : {}),
    ...(s.next_order_no !== undefined ? { nextOrderNo: s.next_order_no } : {}),
  };
}

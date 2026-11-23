import { usePos } from "@pos/store";
import type {
  Appointment as SharedAppointment,
  Package as SharedPackage,
  RecipeLine as SharedRecipeLine,
  Product as SharedProduct,
  StockReason as SharedStockReason,
} from "@pos/types";
import type { Staff as SharedStaff } from "@pos/staff";
import type {
  Appointment,
  AppointmentServiceLine,
  AppointmentStatus,
  Category,
  Customer,
  Modifier,
  Pack,
  PackageCreditLine,
  PaymentMethod,
  Product,
  ProductBatch,
  PurchaseOrder,
  PurchaseOrderLine,
  Recipe,
  RecipeLine,
  RestaurantTable,
  Sale,
  ServicePackage,
  ShopSettings,
  Staff,
  StaffSchedule,
  StockMove,
  Supplier,
  TicketStatus,
  Variant,
} from "@/lib/types";
import type { ImportOptions, ImportResult, ImportRow } from "@/lib/import/validate";
import {
  toDesktopAppointment,
  toDesktopBatch,
  toDesktopCategory,
  toDesktopCustomer,
  toDesktopPackage,
  toDesktopProduct,
  toDesktopPurchaseOrder,
  toDesktopRecipe,
  toDesktopSale,
  toDesktopSettings,
  toDesktopStaff,
  toDesktopStockMove,
  toDesktopSupplier,
  toDesktopTable,
  toSharedCustomer,
  toSharedProduct,
  toSharedSettings,
} from "@/lib/adapters/shared-types";

const state = () => usePos.getState();

export function makeLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface CategoryInput {
  name: string;
  color?: string | null;
}

export interface ProductInput {
  name: string;
  sku: string;
  barcode?: string | null;
  price: number;
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
  packs?: Pack[] | null;
  modifiers?: Modifier[] | null;
  variants?: Variant[] | null;
  unavailable_until?: string | null;
}

export interface ProductBatchInput {
  batch_no?: string;
  expiry?: string | null;
  qty?: number;
  cost?: number;
}

export interface CustomerInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
}

export interface SupplierInput {
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface PurchaseOrderInput {
  supplier_id?: string | null;
  lines?: PurchaseOrderLine[];
  status?: PurchaseOrder["status"];
}

export interface StaffInput {
  name: string;
  role: "owner" | "supervisor" | "cashier";
  phone?: string | null;
  photo_path?: string | null;
  active?: boolean;
  skills?: string[] | null;
  schedule?: StaffSchedule[] | null;
  commission_pct?: number | null;
}

export interface AppointmentInput {
  customer_id?: string | null;
  staff_id?: string | null;
  service_lines: AppointmentServiceLine[];
  start: string;
  duration_min?: number;
  status?: AppointmentStatus;
  notes?: string;
}

export interface PackageInput {
  name: string;
  price: number;
  credits: PackageCreditLine[];
}

export interface SaleInput {
  customer_id?: string | null;
  items: {
    product_id: string | null;
    name: string;
    image_path?: string | null;
    qty: number;
    price: number;
    cost?: number;
    service_staff_id?: string | null;
    commission_amt?: number | null;
    use_credit?: boolean;
    package_id?: string | null;
    credited_qty?: number | null;
    kind?: "product" | "service" | null;
  }[];
  payments: { method: string; amount: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  note?: string | null;
  staff_id?: string | null;
  appointment_id?: string | null;
}

export const PRODUCT_SELECT = "*, category:categories(id,name,color)";

export function withCommissions<T extends { price: number; qty: number; service_staff_id?: string | null; commission_amt?: number | null }>(
  items: T[],
  staff: Pick<Staff, "id" | "commission_pct">[],
): T[] {
  return items.map((item) => {
    if (!item.service_staff_id) return item;
    const pct = staff.find((s) => s.id === item.service_staff_id)?.commission_pct ?? 0;
    if (!(pct > 0)) return item;
    const amount = Number(item.price ?? 0) * Number(item.qty ?? 1) * pct / 100;
    return { ...item, commission_amt: Math.round(amount * 100) / 100 };
  });
}

export function buildOrderLocalId(nextNo: number): string {
  const d = new Date();
  const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `ORD-${day}-${String(nextNo).padStart(4, "0")}`;
}

export async function fetchCategories(): Promise<Category[]> {
  return state().categories.map(toDesktopCategory);
}

export async function fetchProducts(): Promise<Product[]> {
  return state().products.map(toDesktopProduct);
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const p = state().products.find((x) => x.id === id);
  return p ? toDesktopProduct(p) : null;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  return toDesktopProduct(state().upsertProduct(toSharedProduct(input)));
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const current = state().products.find((p) => p.id === id);
  if (!current) throw new Error("Product not found");
  const merged = toSharedProduct({
    name: current.name,
    price: current.price,
    sku: current.sku,
    barcode: current.barcode,
    cost_price: current.cost,
    stock: current.stock,
    category_id: current.categoryId,
    image: current.imageUrl,
    description: current.description,
    unit: current.unit,
    low_stock_at: current.lowStockAt,
    active: current.active,
    prescription_only: current.prescriptionOnly,
    controlled: current.controlled,
    packs: current.packs,
    modifiers: current.modifiers,
    variants: current.variants,
    unavailable_until: current.unavailableUntil,
    ...input,
  });
  return toDesktopProduct(state().upsertProduct({ ...merged, id }));
}

export async function adjustStock(productId: string, delta: number, reason: string, ref?: string): Promise<void> {
  state().adjustStock(productId, delta, reason as SharedStockReason, ref);
}

export async function fetchStockMoves(productId: string): Promise<StockMove[]> {
  return state().stockMoves.filter((m) => m.productId === productId).map(toDesktopStockMove);
}

export async function deleteProduct(id: string): Promise<void> {
  state().deleteProduct(id);
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  return toDesktopCategory(state().upsertCategory({ name: input.name, color: input.color ?? undefined }));
}

export async function updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
  const current = state().categories.find((c) => c.id === id);
  return toDesktopCategory(state().upsertCategory({ id, name: input.name ?? current?.name ?? "", color: input.color ?? current?.color ?? undefined }));
}

export async function deleteCategory(id: string): Promise<void> {
  usePos.setState((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) }));
}

export async function fetchCustomers(): Promise<Customer[]> {
  return state().customers.map(toDesktopCustomer);
}

export async function fetchCustomer(id: string): Promise<Customer | null> {
  const c = state().customers.find((x) => x.id === id);
  return c ? toDesktopCustomer(c) : null;
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  return toDesktopCustomer(state().upsertCustomer(toSharedCustomer(input)));
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<Customer> {
  const current = state().customers.find((c) => c.id === id);
  if (!current) throw new Error("Customer not found");
  return toDesktopCustomer(state().upsertCustomer({ ...toSharedCustomer({ ...input, name: input.name ?? current.name, id }), id }));
}

export async function deleteCustomer(id: string): Promise<void> {
  state().deleteCustomer(id);
}

export async function fetchAppointments(): Promise<Appointment[]> {
  return state().appointments.map(toDesktopAppointment);
}

export async function createAppointment(input: AppointmentInput): Promise<Appointment> {
  const row = state().upsertAppointment({
    customerId: input.customer_id,
    staffId: input.staff_id ?? undefined,
    serviceLines: input.service_lines,
    start: input.start,
    durationMin: input.duration_min,
    status: input.status,
    notes: input.notes,
  } as Partial<SharedAppointment> & { start: string; serviceLines: SharedAppointment["serviceLines"] });
  return toDesktopAppointment(row);
}

export async function updateAppointment(id: string, input: Partial<AppointmentInput>): Promise<Appointment> {
  const current = state().appointments.find((a) => a.id === id);
  if (!current) throw new Error("Appointment not found");
  if (input.status && input.status !== current.status) state().setAppointmentStatus(id, input.status);
  const row = state().upsertAppointment({
    id,
    customerId: input.customer_id ?? current.customerId,
    staffId: input.staff_id ?? current.staffId,
    serviceLines: input.service_lines ?? current.serviceLines,
    start: input.start ?? current.start,
    durationMin: input.duration_min ?? current.durationMin,
    notes: input.notes ?? current.notes,
    status: input.status ?? current.status,
  } as Partial<SharedAppointment> & { start: string; serviceLines: SharedAppointment["serviceLines"] });
  return toDesktopAppointment(row);
}

export async function deleteAppointment(id: string): Promise<void> {
  state().deleteAppointment(id);
}

export async function fetchPackages(): Promise<ServicePackage[]> {
  return state().packages.map(toDesktopPackage);
}

export async function createPackage(input: PackageInput): Promise<ServicePackage> {
  return toDesktopPackage(state().upsertPackage({ name: input.name, price: input.price, credits: input.credits }));
}

export async function updatePackage(id: string, input: Partial<PackageInput>): Promise<ServicePackage> {
  const current = state().packages.find((p) => p.id === id);
  if (!current) throw new Error("Package not found");
  return toDesktopPackage(state().upsertPackage({
    id,
    name: input.name ?? current.name,
    price: input.price ?? current.price,
    credits: input.credits ?? current.credits,
  } as Partial<SharedPackage> & { name: string; price: number }));
}

export async function deletePackage(id: string): Promise<void> {
  state().deletePackage(id);
}

export async function fetchRestaurantTables(): Promise<RestaurantTable[]> {
  return state().tables.map(toDesktopTable);
}

export async function createRestaurantTable(input: { name: string; seats: number }): Promise<RestaurantTable> {
  return toDesktopTable(state().upsertTable({ name: input.name, seats: input.seats }));
}

export async function updateRestaurantTable(
  id: string,
  input: Partial<{ name: string; seats: number }>,
): Promise<RestaurantTable> {
  const current = state().tables.find((t) => t.id === id);
  if (!current) throw new Error("Table not found");
  return toDesktopTable(state().upsertTable({ id, name: input.name ?? current.name, seats: input.seats ?? current.seats }));
}

export async function deleteRestaurantTable(id: string): Promise<void> {
  state().deleteTable(id);
}

export async function fetchRecipes(productIds?: string[]): Promise<Recipe[]> {
  const rows = state().recipes;
  return (productIds ? rows.filter((r) => productIds.includes(r.productId)) : rows).map(toDesktopRecipe);
}

export async function upsertRecipe(productId: string, lines: RecipeLine[]): Promise<Recipe> {
  return toDesktopRecipe(state().upsertRecipe({
    productId,
    lines: lines as SharedRecipeLine[],
  }));
}

export async function setTicketStatus(orderId: string, status: Sale["ticket_status"]): Promise<void> {
  if (status) state().setTicketStatus(orderId, status as TicketStatus);
}

export async function placeSale(input: SaleInput): Promise<Sale> {
  usePos.setState((s) => ({
    ...s,
    cart: input.items.map((it) => ({
      productId: it.product_id ?? "",
      qty: it.qty,
      ...(it.price !== undefined ? { price: it.price } : {}),
      ...(it.service_staff_id ? { staffId: it.service_staff_id } : {}),
      ...(it.use_credit ? { useCredit: true } : {}),
      ...(it.package_id ? { packageId: it.package_id } : {}),
    })),
    cartCustomerId: input.customer_id ?? null,
    cartDiscount: input.discount,
  }));
  const order = state().placeOrder(
    input.payments.map((p) => ({
      id: makeLocalId(),
      method: p.method as PaymentMethod,
      amount: p.amount,
      t: Date.now(),
    })),
    {
      prescriptionRef: input.note ?? undefined,
      orderType: undefined,
      tableId: undefined,
      tabOrderId: undefined,
    },
  );
  if (!order) throw new Error("Could not place sale");
  return toDesktopSale(order);
}

export async function fetchSales(): Promise<Sale[]> {
  return state().orders.map(toDesktopSale);
}

export async function fetchSale(id: string): Promise<Sale | null> {
  const o = state().orders.find((x) => x.id === id);
  return o ? toDesktopSale(o) : null;
}

export async function fetchSaleByLocalId(localId: string): Promise<Sale | null> {
  return fetchSale(localId);
}

export async function recordOrderPayment(
  orderId: string,
  payment: { method: PaymentMethod; amount: number },
): Promise<Sale> {
  state().addPaymentsToOrder(orderId, [{
    method: payment.method,
    amount: payment.amount,
  }]);
  const sale = await fetchSale(orderId);
  if (!sale) throw new Error("Order not found");
  return sale;
}

export async function fetchSettings(): Promise<ShopSettings | null> {
  return toDesktopSettings(state().settings);
}

export async function updateSettings(input: Partial<ShopSettings>): Promise<ShopSettings> {
  state().updateSettings(toSharedSettings(input));
  return toDesktopSettings(state().settings);
}

export async function fetchStaff(): Promise<Staff[]> {
  return state().staff.map(toDesktopStaff);
}

export async function upsertStaff(id: string | null, input: StaffInput): Promise<Staff> {
  const current = id ? state().staff.find((s) => s.id === id) : undefined;
  const row: SharedStaff = {
    id: id ?? makeLocalId(),
    name: input.name,
    role: input.role,
    phone: input.phone ?? undefined,
    photoId: input.photo_path ?? undefined,
    active: input.active ?? true,
    createdAt: current?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    skills: input.skills ?? undefined,
    schedule: input.schedule ?? undefined,
    commissionPct: input.commission_pct ?? undefined,
  };
  state().upsertStaff(row);
  return toDesktopStaff(row);
}

export async function deleteStaff(id: string): Promise<void> {
  state().deleteStaff(id);
}

export async function inviteEmployee(
  _org: string,
  _email: string,
  _role: Staff["role"],
): Promise<{ emailed: boolean; invite_url?: string }> {
  void _org;
  void _email;
  void _role;
  state().toast("Team invites need an internet connection", "warn");
  return { emailed: false };
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  return state().suppliers.map(toDesktopSupplier);
}

export async function upsertSupplier(id: string | null, input: SupplierInput): Promise<Supplier> {
  return toDesktopSupplier(state().upsertSupplier({
    ...(id ? { id } : {}),
    name: input.name,
    contactPerson: input.contact_person,
    email: input.email,
    phone: input.phone,
    address: input.address,
  }));
}

export async function deleteSupplier(id: string): Promise<void> {
  state().deleteSupplier(id);
}

export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  return state().purchaseOrders.map(toDesktopPurchaseOrder);
}

export async function fetchPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  const p = state().purchaseOrders.find((x) => x.id === id);
  return p ? toDesktopPurchaseOrder(p) : null;
}

export async function upsertPurchaseOrder(
  id: string | null,
  input: PurchaseOrderInput,
): Promise<PurchaseOrder> {
  return toDesktopPurchaseOrder(state().upsertPurchaseOrder({
    ...(id ? { id } : {}),
    supplierId: input.supplier_id,
    status: input.status,
    lines: input.lines ?? [],
  }));
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  state().deletePurchaseOrder(id);
}

export async function receivePurchaseOrder(id: string): Promise<PurchaseOrder> {
  state().receivePurchaseOrder(id);
  const row = state().purchaseOrders.find((x) => x.id === id);
  if (!row) throw new Error("Purchase order not found");
  return toDesktopPurchaseOrder(row);
}

export async function fetchProductBatches(productId: string): Promise<ProductBatch[]> {
  return state().batches.filter((b) => b.productId === productId).map(toDesktopBatch);
}

export async function fetchProductBatchesForProducts(productIds: string[]): Promise<ProductBatch[]> {
  return state().batches.filter((b) => productIds.includes(b.productId)).map(toDesktopBatch);
}

export async function createProductBatch(productId: string, input: ProductBatchInput): Promise<ProductBatch> {
  const row = state().upsertBatch({
    productId,
    batchNo: input.batch_no ?? "",
    expiry: input.expiry ?? "",
    qty: input.qty ?? 0,
    cost: input.cost ?? 0,
  });
  return toDesktopBatch(row);
}

export async function updateProductBatch(id: string, input: ProductBatchInput): Promise<ProductBatch> {
  const current = state().batches.find((b) => b.id === id);
  if (!current) throw new Error("Batch not found");
  return toDesktopBatch(state().upsertBatch({
    id,
    productId: current.productId,
    batchNo: input.batch_no ?? current.batchNo,
    expiry: input.expiry ?? current.expiry,
    qty: input.qty ?? current.qty,
    cost: input.cost ?? current.cost,
  }));
}

export async function deleteProductBatch(id: string): Promise<void> {
  state().deleteBatch(id);
}

export async function findProductByBarcode(barcode: string): Promise<Product | null> {
  const p = state().products.find((x) => x.barcode === barcode || x.sku === barcode);
  return p ? toDesktopProduct(p) : null;
}

export async function importProducts(rows: ImportRow[], options: ImportOptions): Promise<ImportResult> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const row of rows) {
    const existing = state().products.find(
      (p) => p.sku === row.sku || (row.barcode !== "" && p.barcode === row.barcode),
    );
    if (existing && !options.updateExisting) {
      skipped++;
      continue;
    }
    let categoryId = existing?.categoryId ?? null;
    if (!categoryId && options.createCategories) {
      const name = row.category || "General";
      categoryId = state().categories.find((c) => c.name === name)?.id
        ?? state().upsertCategory({ name }).id;
    }
    state().upsertProduct({
      ...(existing ? { id: existing.id } : {}),
      name: row.name,
      sku: row.sku,
      barcode: row.barcode,
      price: row.price,
      cost: row.cost_price,
      stock: existing ? existing.stock : row.stock,
      lowStockAt: row.low_stock_at,
      unit: row.unit as SharedProduct["unit"],
      description: row.description,
      active: row.active,
      categoryId,
    });
    if (existing) updated++;
    else created++;
  }
  return { created, updated, skipped };
}

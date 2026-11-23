const DB_NAME = "nova-desktop-local";
const MARKER = "desk-pos-migrated-v1";
const LEGACY_FLAG = "desk-pos-local-shop-v1";

export function needsMigration(read: (k: string) => string | null, hasLegacyData = false): boolean {
  return read(MARKER) !== "1" && (read(LEGACY_FLAG) === "1" || hasLegacyData);
}

export function convertLegacyOrders(rows: Array<Record<string, unknown>>) {
  return rows.map((r) => ({
    id: String(r.id ?? r.local_id ?? ""),
    invoiceNo: String(r.invoice_no ?? r.id ?? ""),
    customerId: (r.customer_id as string) ?? null,
    total: Number(r.total ?? 0),
    createdAt: typeof r.created_at === "string" ? Date.parse(r.created_at) : Date.now(),
  }));
}

function legacyRows(store: string): Promise<Array<Record<string, unknown>>> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve([]);
    const req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(store)) return resolve([]);
      const all = db.transaction(store, "readonly").objectStore(store).getAll();
      all.onsuccess = () => resolve((all.result ?? []) as Array<Record<string, unknown>>);
      all.onerror = () => resolve([]);
    };
    req.onerror = () => resolve([]);
  });
}

export async function migrateLegacyDesktop(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!needsMigration((k) => window.localStorage.getItem(k), true)) return;

  const stores = ["products", "categories", "customers", "orders", "staff", "appointments", "packages"] as const;
  const [products, categories, customers, orders, staff, appointments, packages] = await Promise.all(
    stores.map(legacyRows),
  );
  const now = Date.now();
  const withId = <T extends Record<string, unknown>>(rows: T[]) => rows.filter((r) => Boolean(r.id));
  const hasLegacyData = [products, categories, customers, orders, staff, appointments, packages]
    .some((rows) => rows.length > 0);
  const { usePos } = await import("@pos/store");

  usePos.setState((s) => ({
    ...s,
    products: withId(products).map((p) => ({
      id: String(p.id ?? ""),
      name: String(p.name ?? ""),
      sku: String(p.sku ?? ""),
      barcode: String(p.barcode ?? ""),
      cost: Number(p.cost_price ?? p.cost ?? 0),
      price: Number(p.price ?? 0),
      stock: Number(p.stock ?? 0),
      lowStockAt: Number(p.low_stock_at ?? 0),
      unit: (String(p.unit ?? "pcs") as "pcs"),
      categoryId: (p.category_id as string) ?? null,
      imageUrl: String(p.image ?? ""),
      description: String(p.description ?? ""),
      active: p.active !== false,
      prescriptionOnly: p.prescription_only === true,
      controlled: p.controlled === true,
      createdAt: now,
      updatedAt: now,
    })),
    categories: withId(categories).map((c) => ({
      id: String(c.id ?? ""),
      name: String(c.name ?? ""),
      color: String(c.color ?? "#64748b"),
    })),
    customers: withId(customers).map((c) => ({
      id: String(c.id ?? ""),
      name: String(c.name ?? ""),
      phone: String(c.phone ?? ""),
      address: String(c.address ?? ""),
      note: String(c.note ?? ""),
      createdAt: now,
    })),
    orders: convertLegacyOrders(withId(orders)).map((o) => ({
      id: o.id,
      customerId: o.customerId,
      total: o.total,
      subtotal: o.total,
      discount: 0,
      items: [],
      payments: [],
      status: "completed" as const,
      payStatus: "paid" as const,
      createdAt: o.createdAt,
      completedAt: o.createdAt,
    })),
    staff: withId(staff).map((member) => ({
      id: String(member.id ?? ""),
      name: String(member.name ?? ""),
      role: (member.role as "owner" | "supervisor" | "cashier") ?? "cashier",
      phone: String(member.phone ?? ""),
      active: member.active !== false,
      createdAt: now,
      updatedAt: now,
    })),
    appointments: withId(appointments).map((a) => ({
      id: String(a.id ?? ""),
      customerId: (a.customer_id as string) ?? null,
      staffId: (a.staff_id as string) ?? undefined,
      serviceLines: Array.isArray(a.service_lines)
        ? (a.service_lines as { productId: string; price: number; qty?: number }[])
        : [],
      start: String(a.start ?? new Date().toISOString()),
      durationMin: Number(a.duration_min ?? 30),
      status: (a.status as "booked" | "arrived" | "in-service" | "done" | "no-show" | "cancelled") ?? "booked",
      notes: String(a.notes ?? ""),
      createdAt: now,
      updatedAt: now,
    })),
    packages: withId(packages).map((pkg) => ({
      id: String(pkg.id ?? ""),
      name: String(pkg.name ?? ""),
      price: Number(pkg.price ?? 0),
      credits: Array.isArray(pkg.credits) ? (pkg.credits as { productId: string; qty: number }[]) : [],
      createdAt: now,
      updatedAt: now,
    })),
  }));

  if (!window.localStorage.getItem("nova-pos-trial-start")) {
    window.localStorage.setItem("nova-pos-trial-start", String(Date.now()));
  }
  if (hasLegacyData) window.localStorage.setItem("nova-pos-onboarded", "1");
  window.localStorage.setItem(MARKER, "1");
}

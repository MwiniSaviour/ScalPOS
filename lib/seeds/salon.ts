import type {
  Appointment,
  Category,
  Customer,
  Order,
  OrderItem,
  Package,
  Product,
  Settings,
  StockMove,
} from "../types";
import type { Staff, StaffSchedule, StaffRole } from "../staff";
import { DAY, H, line, makeOrder, productOf, type SeedBundle } from "./shared";

/**
 * A salon in East Legon — braids, cuts and nails sold by the stylist, visits
 * booked against the clock, packages that hand out credits to spend over
 * several visits.
 */
export function salonSeed(now: number): SeedBundle {
  const categories: Category[] = [
    { id: "c_hair", name: "Hair", color: "#a855f7" },
    { id: "c_nails", name: "Nails", color: "#ec4899" },
    { id: "c_beauty", name: "Beauty & Spa", color: "#f97316" },
    { id: "c_retail", name: "Retail Shelf", color: "#64748b" },
  ];

  const products: Product[] = [
    { id: "p_knotless", name: "Knotless Braids", categoryId: "c_hair", cost: 0, price: 250, stock: 0, lowStockAt: 0, unit: "pcs", sku: "SRV-001", barcode: "", imageUrl: "", description: "Mid-back, hair included", active: true, createdAt: now - DAY * 90, updatedAt: now - DAY, kind: "service", durationMin: 240 },
    { id: "p_ghana", name: "Ghana Weaving", categoryId: "c_hair", cost: 0, price: 180, stock: 0, lowStockAt: 0, unit: "pcs", sku: "SRV-002", barcode: "", imageUrl: "", description: "Cornrows, any pattern", active: true, createdAt: now - DAY * 90, updatedAt: now - DAY, kind: "service", durationMin: 150 },
    { id: "p_retouch", name: "Relaxer Retouch", categoryId: "c_hair", cost: 0, price: 120, stock: 0, lowStockAt: 0, unit: "pcs", sku: "SRV-003", barcode: "", imageUrl: "", description: "Root touch-up + treatment", active: true, createdAt: now - DAY * 90, updatedAt: now - DAY, kind: "service", durationMin: 90 },
    { id: "p_trim", name: "Cut & Trim", categoryId: "c_hair", cost: 0, price: 60, stock: 0, lowStockAt: 0, unit: "pcs", sku: "SRV-004", barcode: "", imageUrl: "", description: "Wash, cut, style", active: true, createdAt: now - DAY * 90, updatedAt: now - DAY, kind: "service", durationMin: 45 },
    { id: "p_therapy", name: "Deep Conditioning", categoryId: "c_hair", cost: 0, price: 80, stock: 0, lowStockAt: 0, unit: "pcs", sku: "SRV-005", barcode: "", imageUrl: "", description: "Steam treatment", active: true, createdAt: now - DAY * 90, updatedAt: now - DAY, kind: "service", durationMin: 40 },
    { id: "p_mani", name: "Manicure", categoryId: "c_nails", cost: 0, price: 70, stock: 0, lowStockAt: 0, unit: "pcs", sku: "SRV-006", barcode: "", imageUrl: "", description: "Shape, cuticle care, polish", active: true, createdAt: now - DAY * 90, updatedAt: now - DAY, kind: "service", durationMin: 50 },
    { id: "p_pedi", name: "Pedicure", categoryId: "c_nails", cost: 0, price: 90, stock: 0, lowStockAt: 0, unit: "pcs", sku: "SRV-007", barcode: "", imageUrl: "", description: "Soak, scrub, polish", active: true, createdAt: now - DAY * 90, updatedAt: now - DAY, kind: "service", durationMin: 60 },
    { id: "p_gel", name: "Gel Extensions", categoryId: "c_nails", cost: 0, price: 150, stock: 0, lowStockAt: 0, unit: "pcs", sku: "SRV-008", barcode: "", imageUrl: "", description: "Tips + gel overlay", active: true, createdAt: now - DAY * 90, updatedAt: now - DAY, kind: "service", durationMin: 90 },
    { id: "p_facial", name: "Classic Facial", categoryId: "c_beauty", cost: 0, price: 130, stock: 0, lowStockAt: 0, unit: "pcs", sku: "SRV-009", barcode: "", imageUrl: "", description: "Cleanse, steam, mask", active: true, createdAt: now - DAY * 90, updatedAt: now - DAY, kind: "service", durationMin: 60 },
    { id: "p_lash", name: "Lash Extensions", categoryId: "c_beauty", cost: 0, price: 160, stock: 0, lowStockAt: 0, unit: "pcs", sku: "SRV-010", barcode: "", imageUrl: "", description: "Full set, classic", active: true, createdAt: now - DAY * 90, updatedAt: now - DAY, kind: "service", durationMin: 75 },
    { id: "p_brow", name: "Brow Shaping", categoryId: "c_beauty", cost: 0, price: 40, stock: 0, lowStockAt: 0, unit: "pcs", sku: "SRV-011", barcode: "", imageUrl: "", description: "Tweeze or wax", active: true, createdAt: now - DAY * 90, updatedAt: now - DAY, kind: "service", durationMin: 20 },
    // the shelf behind the till
    { id: "p_shampoo", name: "Sulfate-Free Shampoo", categoryId: "c_retail", cost: 38, price: 65, stock: 18, lowStockAt: 5, unit: "pcs", sku: "RTL-001", barcode: "6001048010014", imageUrl: "", description: "500ml", active: true, createdAt: now - DAY * 80, updatedAt: now - DAY },
    { id: "p_oil", name: "Castor Growth Oil", categoryId: "c_retail", cost: 22, price: 45, stock: 26, lowStockAt: 8, unit: "pcs", sku: "RTL-002", barcode: "6001048010021", imageUrl: "", description: "200ml", active: true, createdAt: now - DAY * 80, updatedAt: now - DAY },
    { id: "p_wig", name: "Lace Closure", categoryId: "c_retail", cost: 260, price: 420, stock: 6, lowStockAt: 2, unit: "pcs", sku: "RTL-003", barcode: "6001048010038", imageUrl: "", description: "18\", body wave", active: true, createdAt: now - DAY * 80, updatedAt: now - DAY },
    { id: "p_extension", name: "Braiding Hair", categoryId: "c_retail", cost: 18, price: 35, stock: 40, lowStockAt: 10, unit: "pcs", sku: "RTL-004", barcode: "6001048010045", imageUrl: "", description: "Per pack", active: true, createdAt: now - DAY * 80, updatedAt: now - DAY },
  ];

  const staff: Staff[] = [
    { id: "s_akua", name: "Akua Mensah", role: "supervisor" as StaffRole, phone: "024 111 2233", active: true, createdAt: now - DAY * 90, updatedAt: now - DAY, skills: ["Knotless Braids", "Ghana Weaving", "Relaxer Retouch"], commissionPct: 25, schedule: ([
      [1, "9:00", "17:00"], [2, "9:00", "17:00"], [3, "9:00", "17:00"],
      [4, "9:00", "17:00"], [5, "9:00", "16:00"], [6, "9:00", "14:00"],
    ] as [number, string, string][]).map(([day, start, end]): StaffSchedule => ({ day, start, end })) },
    { id: "s_effia", name: "Effia Boateng", role: "cashier" as StaffRole, phone: "054 444 5566", active: true, createdAt: now - DAY * 75, updatedAt: now - DAY, skills: ["Cut & Trim", "Deep Conditioning", "Classic Facial"], commissionPct: 20, schedule: ([
      [2, "10:00", "18:00"], [3, "10:00", "18:00"], [4, "10:00", "18:00"], [5, "10:00", "18:00"], [6, "9:00", "15:00"],
    ] as [number, string, string][]).map(([day, start, end]): StaffSchedule => ({ day, start, end })) },
    { id: "s_nana", name: "Nana Yaa", role: "cashier" as StaffRole, phone: "027 777 8899", active: true, createdAt: now - DAY * 60, updatedAt: now - DAY, skills: ["Manicure", "Pedicure", "Gel Extensions", "Brow Shaping"], commissionPct: 30, schedule: ([
      [3, "9:00", "17:00"], [4, "9:00", "17:00"], [5, "9:00", "17:00"], [6, "9:00", "16:00"], [0, "12:00", "17:00"],
    ] as [number, string, string][]).map(([day, start, end]): StaffSchedule => ({ day, start, end })) },
    { id: "s_adjoa", name: "Adjoa Osei", role: "cashier" as StaffRole, phone: "", active: true, createdAt: now - DAY * 30, updatedAt: now - DAY },
  ];

  // packages grant credits a client spends over several visits
  const packages: Package[] = [
    { id: "pk_braid3", name: "Braid Club — 3 Visits", price: 630, credits: [{ productId: "p_knotless", qty: 2 }, { productId: "p_ghana", qty: 1 }], createdAt: now - DAY * 60, updatedAt: now - DAY * 60 },
    { id: "pk_nail4", name: "Nail Care — 4 Visits", price: 240, credits: [{ productId: "p_mani", qty: 2 }, { productId: "p_pedi", qty: 2 }], createdAt: now - DAY * 60, updatedAt: now - DAY * 60 },
    { id: "pk_glow", name: "Glow Package", price: 400, credits: [{ productId: "p_facial", qty: 2 }, { productId: "p_lash", qty: 1 }], createdAt: now - DAY * 45, updatedAt: now - DAY * 45 },
  ];

  const customers: Customer[] = [
    { id: "k_abena", name: "Abena Owusu", phone: "024 505 1010", address: "East Legon, Accra", note: "Allergic to gel remover — bring the acetone-free one", createdAt: now - DAY * 120,
      visitNotes: [{ t: now - DAY * 21, text: "Prefers Akua. Sensitive scalp — use the mild relaxer." } as never] },
    { id: "k_fola", name: "Fola Adeyemi", phone: "055 616 2020", address: "Cantonments, Accra", note: "Braid Club member", createdAt: now - DAY * 90,
      packageCredits: [{ packageId: "pk_braid3", remaining: 1 }, { packageId: "pk_nail4", remaining: 3 }] },
    { id: "k_esi", name: "Esi Hamilton", phone: "020 808 3030", address: "Airport Hills", note: "", createdAt: now - DAY * 70,
      packageCredits: [{ packageId: "pk_glow", remaining: 2 }] },
    { id: "k_mira", name: "Mira Danso", phone: "027 909 4040", address: "Adjiringanor", note: "Walks in on Saturdays", createdAt: now - DAY * 40 },
    { id: "k_linda", name: "Linda Okoro", phone: "024 303 5050", address: "Ashalley Botwe", note: "", createdAt: now - DAY * 15,
      visitNotes: [{ t: now - DAY * 8, text: "Asked for the braids to be looser at the edges next time." } as never] },
  ];

  const it = (pid: string, qty: number, extra?: Parameters<typeof line>[2]) =>
    line(productOf(products, pid), qty, extra);
  const svc = (pid: string, staffId?: string, over?: Partial<OrderItem>) =>
    ({ ...line(productOf(products, pid), 1), kind: "service" as const, ...(staffId ? { serviceStaffId: staffId } : {}), ...over });

  // who earned what — services carry their staff, commissions ride on the line
  const orders: Order[] = [
    makeOrder({
      n: 84, now, ago: H * 2,
      items: [svc("p_knotless", "s_akua"), it("p_oil", 1)],
      pay: [{ method: "cash", amount: 295, ago: H * 2 }],
      status: "completed", customerId: "k_abena",
    }),
    makeOrder({
      n: 83, now, ago: H * 4,
      // a credit visit — the mani is covered by Fola's Nail Care package
      items: [svc("p_mani", "s_nana", { useCredit: true, packageId: "pk_nail4", creditedQty: 1, price: 0 }), svc("p_gel", "s_nana")],
      pay: [{ method: "momo", amount: 150, ago: H * 4, ref: "MTN-TX771" }],
      status: "completed", customerId: "k_fola",
    }),
    makeOrder({
      n: 82, now, ago: H * 7,
      items: [svc("p_facial", "s_effia"), svc("p_brow", "s_nana")],
      pay: [{ method: "card", amount: 170, ago: H * 7 }],
      status: "completed", customerId: "k_esi",
    }),
    makeOrder({
      n: 81, now, ago: DAY * 1.1,
      items: [svc("p_ghana", "s_akua"), it("p_shampoo", 1)],
      pay: [{ method: "momo", amount: 245, ago: DAY * 1.1, ref: "VOD-TX330" }],
      status: "completed", customerId: "k_mira",
    }),
    makeOrder({
      n: 80, now, ago: DAY * 2.3,
      items: [svc("p_pedi", "s_nana"), svc("p_trim", "s_effia")],
      pay: [{ method: "cash", amount: 150, ago: DAY * 2.3 }],
      status: "completed", customerId: "k_linda",
    }),
    // a package sold at the till — the credits live on the client now
    makeOrder({
      n: 79, now, ago: DAY * 3.5,
      items: [{ ...it("p_extension", 2), packageId: "pk_braid3", name: "Braid Club — 3 Visits", price: 630 }],
      pay: [{ method: "momo", amount: 700, ago: DAY * 3.5, ref: "MTN-TX640" }],
      status: "completed", customerId: "k_fola",
    }),
    // a visit still going
    makeOrder({
      n: 78, now, ago: H * 1,
      items: [svc("p_retouch", "s_akua"), svc("p_therapy", "s_akua")],
      pay: [{ method: "cash", amount: 200, ago: H * 0.5 }],
      status: "pending", customerId: "k_esi",
    }),
  ];

  const stockMoves: StockMove[] = [
    { id: "mv_s1", productId: "p_oil", qty: -1, reason: "sale", ref: "ORD0000084", t: now - H * 2 },
    { id: "mv_s2", productId: "p_shampoo", qty: -1, reason: "sale", ref: "ORD0000081", t: now - DAY * 1.1 },
    { id: "mv_s3", productId: "p_extension", qty: 40, reason: "purchase", ref: "Opening shelf", t: now - DAY * 80 },
    { id: "mv_s4", productId: "p_shampoo", qty: 18, reason: "purchase", ref: "Supplier run", t: now - DAY * 30 },
  ];

  // the book — today and the next few days
  const at = (dayOffset: number, hour: number, minute = 0) =>
    new Date(now + dayOffset * DAY).setHours(hour, minute, 0, 0);
  const appointments: Appointment[] = [
    { id: "a_1", customerId: "k_fola", staffId: "s_akua", serviceLines: [{ productId: "p_knotless", price: 250 }], start: new Date(at(0, 14)).toISOString(), durationMin: 240, status: "in-service", notes: "Mid-back, purple edge control", createdAt: now - DAY * 2, updatedAt: now - H * 1 },
    { id: "a_2", customerId: "k_mira", staffId: "s_nana", serviceLines: [{ productId: "p_pedi", price: 90 }, { productId: "p_mani", price: 70 }], start: new Date(at(0, 15)).toISOString(), durationMin: 110, status: "arrived", createdAt: now - DAY, updatedAt: now - H * 2 },
    { id: "a_3", customerId: "k_abena", staffId: "s_effia", serviceLines: [{ productId: "p_trim", price: 60 }], start: new Date(at(0, 16)).toISOString(), durationMin: 45, status: "booked", createdAt: now - DAY * 2, updatedAt: now - DAY * 2 },
    { id: "a_4", customerId: "k_esi", staffId: "s_nana", serviceLines: [{ productId: "p_gel", price: 150 }], start: new Date(at(1, 10)).toISOString(), durationMin: 90, status: "booked", notes: "Covered by Glow Package — she has 2 left", createdAt: now - DAY, updatedAt: now - DAY },
    { id: "a_5", customerId: "k_linda", staffId: "s_akua", serviceLines: [{ productId: "p_ghana", price: 180 }], start: new Date(at(1, 11)).toISOString(), durationMin: 150, status: "booked", notes: "Looser at the edges", createdAt: now - DAY, updatedAt: now - DAY },
    { id: "a_6", customerId: "k_fola", staffId: "s_nana", serviceLines: [{ productId: "p_mani", price: 70 }], start: new Date(at(2, 12)).toISOString(), durationMin: 50, status: "booked", notes: "Nail Care package covers this", createdAt: now - H * 5, updatedAt: now - H * 5 },
    { id: "a_7", customerId: "k_mira", staffId: "s_effia", serviceLines: [{ productId: "p_facial", price: 130 }], start: new Date(at(3, 14)).toISOString(), durationMin: 60, status: "booked", createdAt: now - H * 5, updatedAt: now - H * 5 },
    { id: "a_8", customerId: "k_abena", staffId: "s_akua", serviceLines: [{ productId: "p_knotless", price: 250 }], start: new Date(at(-1, 10)).toISOString(), durationMin: 240, status: "done", createdAt: now - DAY * 3, updatedAt: now - DAY },
    { id: "a_9", customerId: "k_linda", staffId: "s_nana", serviceLines: [{ productId: "p_pedi", price: 90 }], start: new Date(at(-1, 13)).toISOString(), durationMin: 60, status: "no-show", createdAt: now - DAY * 2, updatedAt: now - DAY },
  ];

  const settings: Settings = {
    businessType: "salon",
    shopName: "Nova Beauty Lounge",
    address: "12 Lagos Avenue, East Legon, Accra",
    phone: "+233 30 901 2233",
    ownerId: "Owner",
    momoNumber: "0309012233",
    momoNetwork: "MTN MoMo",
    taxInclusive: true,
    taxRate: 0,
    receiptFooter: "You came, you slayed — see you soon!",
    theme: "dark",
    nextOrderNo: 85,
    createdAt: now - DAY * 90,
    salonConfig: { openDays: [1, 2, 3, 4, 5, 6], openHours: { start: "9:00", end: "19:00" } },
  };

  return {
    settings,
    categories,
    products,
    customers,
    orders,
    stockMoves,
    staff,
    batches: [],
    recipes: [],
    tables: [],
    appointments,
    packages,
  };
}

import type { Batch, Category, Customer, Order, Product, Settings, StockMove } from "../types";
import { DAY, H, daysFromNow, isoDay, line, makeOrder, productOf, type SeedBundle } from "./shared";

/**
 * A community pharmacy in Osu — medicine sold in boxes and strips, every
 * box carrying its own batch and expiry date, and a prescription counter
 * that asks for the patient's prescription.
 */
export function pharmacySeed(now: number): SeedBundle {
  const categories: Category[] = [
    { id: "c_rx", name: "Prescription", color: "#dc2626" },
    { id: "c_otc", name: "OTC & Pain Relief", color: "#2563eb" },
    { id: "c_health", name: "Health & Wellness", color: "#059669" },
    { id: "c_equip", name: "Medical Supplies", color: "#d97706" },
  ];

  const products: Product[] = [
    { id: "p_para", name: "Paracetamol 500mg (20 tabs)", categoryId: "c_otc", cost: 6.5, price: 9.5, stock: 64, lowStockAt: 15, unit: "box", sku: "MED-001", barcode: "GD7777001", imageUrl: "", description: "Analgesic · 20 tablets", active: true, createdAt: now - DAY * 70, updatedAt: now - DAY * 2 },
    { id: "p_ibu", name: "Ibuprofen 400mg (20 tabs)", categoryId: "c_otc", cost: 7, price: 11, stock: 88, lowStockAt: 20, unit: "box", sku: "MED-002", barcode: "GD7777002", imageUrl: "", description: "Anti-inflammatory · 20 tablets", active: true, createdAt: now - DAY * 70, updatedAt: now - DAY * 3 },
    { id: "p_amox", name: "Amoxicillin 500mg (21 caps)", categoryId: "c_rx", cost: 19, price: 27, stock: 26, lowStockAt: 8, unit: "box", sku: "MED-003", barcode: "GD7777003", imageUrl: "", description: "Broad-spectrum antibiotic", active: true, createdAt: now - DAY * 65, updatedAt: now - DAY * 2, prescriptionOnly: true },
    { id: "p_ors", name: "ORS Glucose Sachets (10)", categoryId: "c_health", cost: 9, price: 14, stock: 40, lowStockAt: 10, unit: "pack", sku: "MED-004", barcode: "GD7777004", imageUrl: "", description: "Oral rehydration salts", active: true, createdAt: now - DAY * 60, updatedAt: now - DAY },
    { id: "p_vitc", name: "Vitamin C 1000mg (20 tabs)", categoryId: "c_health", cost: 13, price: 19, stock: 45, lowStockAt: 12, unit: "box", sku: "MED-005", barcode: "GD7777005", imageUrl: "", description: "Effervescent · immunity", active: true, createdAt: now - DAY * 55, updatedAt: now - DAY },
    { id: "p_vitd", name: "Vitamin D3 1000IU (30 softgels)", categoryId: "c_health", cost: 16, price: 23, stock: 26, lowStockAt: 8, unit: "box", sku: "MED-006", barcode: "GD7777006", imageUrl: "", description: "Bone & immune support", active: true, createdAt: now - DAY * 55, updatedAt: now - DAY },
    { id: "p_supp", name: "Multivitamin Syrup 200ml", categoryId: "c_health", cost: 21, price: 30, stock: 18, lowStockAt: 6, unit: "pcs", sku: "MED-007", barcode: "GD7777007", imageUrl: "", description: "Cherry flavour · children", active: true, createdAt: now - DAY * 50, updatedAt: now - DAY },
    { id: "p_mask", name: "Surgical Face Masks (50)", categoryId: "c_equip", cost: 11, price: 16, stock: 3, lowStockAt: 12, unit: "box", sku: "MED-008", barcode: "GD7777008", imageUrl: "", description: "3-ply disposable masks", active: true, createdAt: now - DAY * 45, updatedAt: now - DAY },
    { id: "p_sani", name: "Sanitary Pads (10 pieces)", categoryId: "c_equip", cost: 9, price: 13, stock: 34, lowStockAt: 10, unit: "pack", sku: "MED-009", barcode: "GD7777009", imageUrl: "", description: "Regular absorbency", active: true, createdAt: now - DAY * 45, updatedAt: now - DAY },
    { id: "p_cond", name: "Condoms (12 pieces)", categoryId: "c_equip", cost: 16, price: 22, stock: 30, lowStockAt: 8, unit: "box", sku: "MED-010", barcode: "GD7777010", imageUrl: "", description: "Lubricated · no expiry on box", active: true, createdAt: now - DAY * 40, updatedAt: now - DAY },
    { id: "p_bpm", name: "Digital Blood Pressure Monitor", categoryId: "c_equip", cost: 88, price: 130, stock: 9, lowStockAt: 4, unit: "pcs", sku: "MED-011", barcode: "GD7777011", imageUrl: "", description: "Upper-arm · 2-user memory", active: true, createdAt: now - DAY * 35, updatedAt: now - DAY },
    { id: "p_gluc", name: "Glucose Meter Starter Kit", categoryId: "c_equip", cost: 62, price: 95, stock: 6, lowStockAt: 3, unit: "pcs", sku: "MED-012", barcode: "GD7777012", imageUrl: "", description: "Meter + 10 strips + lancets", active: true, createdAt: now - DAY * 35, updatedAt: now - DAY },
  ];

  // Every medicine box carries its own batch — the expiry report reads these.
  const batches: Batch[] = [
    { id: "b_para_1", productId: "p_para", batchNo: "PARA-2506", expiry: isoDay(daysFromNow(24, now)), qty: 24, cost: 6.5, createdAt: now - DAY * 60, updatedAt: now - DAY * 60 },
    { id: "b_para_2", productId: "p_para", batchNo: "PARA-2501", expiry: isoDay(daysFromNow(300, now)), qty: 40, cost: 6.5, createdAt: now - DAY * 60, updatedAt: now - DAY * 60 },
    { id: "b_ibu_1", productId: "p_ibu", batchNo: "IBU-2507", expiry: isoDay(daysFromNow(40, now)), qty: 28, cost: 7, createdAt: now - DAY * 58, updatedAt: now - DAY * 58 },
    { id: "b_ibu_2", productId: "p_ibu", batchNo: "IBU-2503", expiry: isoDay(daysFromNow(240, now)), qty: 60, cost: 7, createdAt: now - DAY * 58, updatedAt: now - DAY * 58 },
    { id: "b_amox_1", productId: "p_amox", batchNo: "AMX-2502", expiry: isoDay(daysFromNow(180, now)), qty: 26, cost: 19, createdAt: now - DAY * 50, updatedAt: now - DAY * 50 },
    { id: "b_amox_old", productId: "p_amox", batchNo: "AMX-2409", expiry: isoDay(daysFromNow(-12, now)), qty: 6, cost: 19, createdAt: now - DAY * 120, updatedAt: now - DAY * 12 },
    { id: "b_ors_1", productId: "p_ors", batchNo: "ORS-2504", expiry: isoDay(daysFromNow(150, now)), qty: 40, cost: 9, createdAt: now - DAY * 45, updatedAt: now - DAY * 45 },
    { id: "b_vitc_1", productId: "p_vitc", batchNo: "VITC-2505", expiry: isoDay(daysFromNow(200, now)), qty: 45, cost: 13, createdAt: now - DAY * 40, updatedAt: now - DAY * 40 },
    { id: "b_vitd_1", productId: "p_vitd", batchNo: "VITD-2501", expiry: isoDay(daysFromNow(310, now)), qty: 26, cost: 16, createdAt: now - DAY * 40, updatedAt: now - DAY * 40 },
    { id: "b_supp_1", productId: "p_supp", batchNo: "SYR-2412", expiry: isoDay(daysFromNow(60, now)), qty: 18, cost: 21, createdAt: now - DAY * 90, updatedAt: now - DAY * 90 },
    { id: "b_sani_1", productId: "p_sani", batchNo: "SANI-2501", expiry: isoDay(daysFromNow(400, now)), qty: 34, cost: 9, createdAt: now - DAY * 30, updatedAt: now - DAY * 30 },
  ];

  const customers: Customer[] = [
    { id: "k_abena", name: "Abena Sarpong", phone: "233 555 1010", address: "Osu Badu St, Accra", note: "Monthly blood-pressure check", createdAt: now - DAY * 90, allergies: "Penicillin" },
    { id: "k_nii", name: "Nii Okai", phone: "244 777 8899", address: "Kanda Estate, Accra", note: "Collects for his mother", createdAt: now - DAY * 60, allergies: "" },
    { id: "k_serwaa", name: "Serwaa Addo", phone: "020 334 5566", address: "Labone, Accra", note: "Asthma — keep inhaler stocked", createdAt: now - DAY * 40, allergies: "Aspirin" },
    { id: "k_kwadwo", name: "Kwadwo Antwi", phone: "055 121 3344", address: "Nungua, Accra", note: "", createdAt: now - DAY * 20, allergies: "" },
    { id: "k_maame", name: "Maame Efua", phone: "024 909 1122", address: "Teshie, Accra", note: "Regular customer", createdAt: now - DAY * 7, allergies: "" },
  ];

  const it = (pid: string, qty: number) => line(productOf(products, pid), qty);

  const orders: Order[] = [
    makeOrder({ n: 121, now, ago: H * 3, items: [it("p_para", 2), it("p_vitc", 1)], pay: [{ method: "cash", amount: 38, ago: H * 3 }], status: "completed", customerId: "k_serwaa" }),
    makeOrder({ n: 120, now, ago: H * 9, items: [it("p_amox", 1)], pay: [{ method: "momo", amount: 27, ago: H * 9, ref: "MTN-RX771" }], status: "completed", customerId: "k_abena" }),
    makeOrder({ n: 119, now, ago: H * 30, items: [it("p_ors", 2), it("p_sani", 1)], pay: [{ method: "cash", amount: 41, ago: H * 30 }], status: "completed", customerId: "k_kwadwo" }),
    makeOrder({ n: 118, now, ago: DAY * 2, items: [it("p_bpm", 1)], status: "pending", customerId: "k_nii" }),
    makeOrder({ n: 117, now, ago: DAY * 4, items: [it("p_ibu", 3), it("p_vitd", 1)], pay: [{ method: "card", amount: 56, ago: DAY * 4 }], status: "completed", customerId: "k_maame" }),
    makeOrder({ n: 116, now, ago: DAY * 6, items: [it("p_supp", 1), it("p_mask", 2)], pay: [{ method: "cash", amount: 62, ago: DAY * 6 }], status: "refunded" }),
  ];

  const stockMoves: StockMove[] = [
    { id: "mv_p1", productId: "p_para", qty: -2, reason: "sale", ref: "ORD0000121", t: now - H * 3 },
    { id: "mv_p2", productId: "p_vitc", qty: -1, reason: "sale", ref: "ORD0000121", t: now - H * 3 },
    { id: "mv_p3", productId: "p_amox", qty: -1, reason: "sale", ref: "ORD0000120", t: now - H * 9 },
    { id: "mv_p4", productId: "p_ors", qty: -2, reason: "sale", ref: "ORD0000119", t: now - H * 30 },
    { id: "mv_p5", productId: "p_sani", qty: -1, reason: "sale", ref: "ORD0000119", t: now - H * 30 },
    { id: "mv_p6", productId: "p_ibu", qty: -3, reason: "sale", ref: "ORD0000117", t: now - DAY * 4 },
    { id: "mv_p7", productId: "p_ibu", qty: 60, reason: "purchase", ref: "Supmed restock", t: now - DAY * 30 },
    { id: "mv_p8", productId: "p_amox", qty: 6, reason: "damage", ref: "Expired — returned to supplier", t: now - DAY * 12 },
  ];

  const settings: Settings = {
    businessType: "pharmacy",
    shopName: "MediCare Pharmacy",
    address: "8 Oxford Street, Osu, Accra",
    phone: "+233 30 278 4455",
    ownerId: "Owner",
    momoNumber: "0302784455",
    momoNetwork: "Telecel Cash",
    taxInclusive: true,
    taxRate: 0,
    receiptFooter: "Medicines are not returnable once dispensed.",
    theme: "dark",
    nextOrderNo: 122,
    createdAt: now - DAY * 90,
  };

  return {
    settings,
    categories,
    products,
    customers,
    orders,
    stockMoves,
    batches,
    recipes: [],
    tables: [],
    staff: [],
    appointments: [],
    packages: [],
  };
}

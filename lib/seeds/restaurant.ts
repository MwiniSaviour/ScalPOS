import type {
  Category,
  Customer,
  Order,
  Product,
  Recipe,
  RestaurantTable,
  Settings,
  StockMove,
} from "../types";
import { DAY, H, line, makeOrder, productOf, type SeedBundle } from "./shared";

/**
 * A restaurant in Osu — a menu sold by the plate, guests seated at tables,
 * tickets that move through the kitchen queue and dishes that draw their
 * ingredients from the kitchen shelf when they are sold.
 */
export function restaurantSeed(now: number): SeedBundle {
  const categories: Category[] = [
    { id: "c_mains", name: "Main Dishes", color: "#ea580c" },
    { id: "c_sides", name: "Sides & Soups", color: "#d97706" },
    { id: "c_drinks", name: "Drinks", color: "#0ea5e9" },
    { id: "c_dessert", name: "Desserts", color: "#ec4899" },
    { id: "c_store", name: "Kitchen Stock", color: "#64748b" },
  ];

  const products: Product[] = [
    { id: "p_jollof", name: "Jollof Rice", categoryId: "c_mains", cost: 11, price: 32, stock: 80, lowStockAt: 20, unit: "pcs", sku: "MAIN-001", barcode: "", imageUrl: "", description: "Party jollof with fried plantain", active: true, createdAt: now - DAY * 60, updatedAt: now - DAY,
      variants: [{ id: "v_jollof_r", name: "Regular", priceDelta: 0 }, { id: "v_jollof_l", name: "Large", priceDelta: 8 }],
      modifiers: [{ id: "m_jollof_chicken", name: "Extra chicken", priceDelta: 8 }, { id: "m_jollof_egg", name: "Extra egg", priceDelta: 3 }] },
    { id: "p_bank", name: "Banku & Tilapia", categoryId: "c_mains", cost: 18, price: 48, stock: 60, lowStockAt: 15, unit: "pcs", sku: "MAIN-002", barcode: "", imageUrl: "", description: "Grilled tilapia, pepper sauce", active: true, createdAt: now - DAY * 60, updatedAt: now - DAY,
      modifiers: [{ id: "m_bank_fish", name: "Extra tilapia", priceDelta: 12 }, { id: "m_bank_pepper", name: "Extra pepper", priceDelta: 0 }] },
    { id: "p_chicken", name: "Grilled Chicken", categoryId: "c_mains", cost: 26, price: 62, stock: 40, lowStockAt: 10, unit: "pcs", sku: "MAIN-003", barcode: "", imageUrl: "", description: "Half chicken with onion salad", active: true, createdAt: now - DAY * 55, updatedAt: now - DAY,
      variants: [{ id: "v_chicken_h", name: "Half", priceDelta: 0 }, { id: "v_chicken_f", name: "Full", priceDelta: 26 }],
      modifiers: [{ id: "m_chicken_gari", name: "Extra gari", priceDelta: 0 }] },
    { id: "p_wakye", name: "Waakye Special", categoryId: "c_mains", cost: 12, price: 30, stock: 70, lowStockAt: 18, unit: "pcs", sku: "MAIN-004", barcode: "", imageUrl: "", description: "With shito, wele and egg", active: true, createdAt: now - DAY * 50, updatedAt: now - DAY },
    { id: "p_fufu", name: "Fufu with Tomato Soup", categoryId: "c_mains", cost: 9, price: 26, stock: 50, lowStockAt: 12, unit: "pcs", sku: "MAIN-005", barcode: "", imageUrl: "", description: "Light soup", active: true, createdAt: now - DAY * 50, updatedAt: now - DAY },
    { id: "p_slaw", name: "Coleslaw", categoryId: "c_sides", cost: 3, price: 8, stock: 45, lowStockAt: 10, unit: "pcs", sku: "SIDE-001", barcode: "", imageUrl: "", description: "Cabbage, carrot, cream", active: true, createdAt: now - DAY * 45, updatedAt: now - DAY },
    { id: "p_soup", name: "Tomato Soup", categoryId: "c_sides", cost: 4, price: 10, stock: 38, lowStockAt: 10, unit: "pcs", sku: "SIDE-002", barcode: "", imageUrl: "", description: "Served with bread", active: true, createdAt: now - DAY * 45, updatedAt: now - DAY },
    { id: "p_fries", name: "Chips", categoryId: "c_sides", cost: 5, price: 12, stock: 55, lowStockAt: 15, unit: "pcs", sku: "SIDE-003", barcode: "", imageUrl: "", description: "Fried potato slices", active: true, createdAt: now - DAY * 45, updatedAt: now - DAY },
    { id: "p_mango", name: "Fresh Mango Juice", categoryId: "c_drinks", cost: 5, price: 15, stock: 60, lowStockAt: 15, unit: "pcs", sku: "DRINK-001", barcode: "", imageUrl: "", description: "Sweet, no sugar added", active: true, createdAt: now - DAY * 40, updatedAt: now - DAY },
    { id: "p_ginger", name: "Ginger Drink", categoryId: "c_drinks", cost: 3, price: 8, stock: 48, lowStockAt: 12, unit: "pcs", sku: "DRINK-002", barcode: "", imageUrl: "", description: "Hot ginger tea", active: true, createdAt: now - DAY * 40, updatedAt: now - DAY },
    { id: "p_boba", name: "Boba Tea", categoryId: "c_drinks", cost: 5, price: 12, stock: 30, lowStockAt: 8, unit: "pcs", sku: "DRINK-003", barcode: "", imageUrl: "", description: "Pearl milk tea", active: true, createdAt: now - DAY * 30, updatedAt: now - DAY },
    { id: "p_beer", name: "Club Beer", categoryId: "c_drinks", cost: 8, price: 14, stock: 72, lowStockAt: 24, unit: "pcs", sku: "DRINK-004", barcode: "", imageUrl: "", description: "Chilled, 500ml", active: true, createdAt: now - DAY * 30, updatedAt: now - DAY },
    { id: "p_water", name: "Bottled Water", categoryId: "c_drinks", cost: 1.5, price: 5, stock: 120, lowStockAt: 24, unit: "pcs", sku: "DRINK-005", barcode: "", imageUrl: "", description: "500ml", active: true, createdAt: now - DAY * 30, updatedAt: now - DAY },
    { id: "p_cake", name: "Chocolate Cake Slice", categoryId: "c_dessert", cost: 5, price: 14, stock: 20, lowStockAt: 6, unit: "pcs", sku: "DESS-001", barcode: "", imageUrl: "", description: "Served with cream", active: true, createdAt: now - DAY * 25, updatedAt: now - DAY },
    { id: "p_rice_raw", name: "Rice (raw)", categoryId: "c_store", cost: 9, price: 12, stock: 42, lowStockAt: 10, unit: "kg", sku: "STORE-001", barcode: "", imageUrl: "", description: "Kitchen shelf", active: true, createdAt: now - DAY * 60, updatedAt: now - DAY },
    { id: "p_tomato_raw", name: "Tomatoes (raw)", categoryId: "c_store", cost: 4, price: 6, stock: 14, lowStockAt: 4, unit: "kg", sku: "STORE-002", barcode: "", imageUrl: "", description: "Kitchen shelf", active: true, createdAt: now - DAY * 60, updatedAt: now - DAY },
    { id: "p_chicken_raw", name: "Chicken (raw)", categoryId: "c_store", cost: 18, price: 22, stock: 19, lowStockAt: 6, unit: "kg", sku: "STORE-003", barcode: "", imageUrl: "", description: "Kitchen shelf", active: true, createdAt: now - DAY * 60, updatedAt: now - DAY },
    { id: "p_tilapia_raw", name: "Tilapia (raw)", categoryId: "c_store", cost: 14, price: 18, stock: 9, lowStockAt: 4, unit: "kg", sku: "STORE-004", barcode: "", imageUrl: "", description: "Kitchen shelf", active: true, createdAt: now - DAY * 60, updatedAt: now - DAY },
    { id: "p_oil_raw", name: "Cooking Oil", categoryId: "c_store", cost: 22, price: 26, stock: 20, lowStockAt: 6, unit: "ltr", sku: "STORE-005", barcode: "", imageUrl: "", description: "Kitchen shelf", active: true, createdAt: now - DAY * 60, updatedAt: now - DAY },
  ];

  // A plated dish draws its ingredients from the kitchen shelf.
  const recipes: Recipe[] = [
    { id: "rc_jollof", productId: "p_jollof", lines: [
      { ingredientProductId: "p_rice_raw", qty: 0.25, wastePct: 10 },
      { ingredientProductId: "p_tomato_raw", qty: 0.15, wastePct: 10 },
      { ingredientProductId: "p_oil_raw", qty: 0.05 },
    ], createdAt: now - DAY * 55, updatedAt: now - DAY * 55 },
    { id: "rc_wakye", productId: "p_wakye", lines: [
      { ingredientProductId: "p_rice_raw", qty: 0.3, wastePct: 12 },
      { ingredientProductId: "p_oil_raw", qty: 0.04 },
    ], createdAt: now - DAY * 50, updatedAt: now - DAY * 50 },
    { id: "rc_bank", productId: "p_bank", lines: [
      { ingredientProductId: "p_tilapia_raw", qty: 0.35, wastePct: 8 },
      { ingredientProductId: "p_oil_raw", qty: 0.03 },
    ], createdAt: now - DAY * 55, updatedAt: now - DAY * 55 },
    { id: "rc_chicken", productId: "p_chicken", lines: [
      { ingredientProductId: "p_chicken_raw", qty: 0.6, wastePct: 15 },
      { ingredientProductId: "p_oil_raw", qty: 0.04 },
    ], createdAt: now - DAY * 50, updatedAt: now - DAY * 50 },
  ];

  const tables: RestaurantTable[] = [
    { id: "t_1", name: "Table 1", seats: 2, createdAt: now - DAY * 60, updatedAt: now - DAY * 60 },
    { id: "t_2", name: "Table 2", seats: 4, createdAt: now - DAY * 60, updatedAt: now - DAY * 60 },
    { id: "t_3", name: "Table 3", seats: 4, createdAt: now - DAY * 60, updatedAt: now - DAY * 60 },
    { id: "t_4", name: "Table 4", seats: 6, createdAt: now - DAY * 60, updatedAt: now - DAY * 60 },
    { id: "t_5", name: "Table 5", seats: 2, createdAt: now - DAY * 60, updatedAt: now - DAY * 60 },
    { id: "t_6", name: "Table 6", seats: 8, createdAt: now - DAY * 60, updatedAt: now - DAY * 60 },
  ];

  const customers: Customer[] = [
    { id: "k_maa", name: "Maa Darko", phone: "024 400 1122", address: "Ridge, Accra", note: "Regular — always table 4", createdAt: now - DAY * 80 },
    { id: "k_tolu", name: "Tolu Akinyemi", phone: "054 322 7788", address: "Airport Residential", note: "No pepper", createdAt: now - DAY * 45 },
    { id: "k_dede", name: "Dede Nkrumah", phone: "055 909 3344", address: "Labone, Accra", note: "", createdAt: now - DAY * 20 },
    { id: "k_joe", name: "Joe Quartey", phone: "027 118 5566", address: "Kokorlemle, Accra", note: "Corporate table", createdAt: now - DAY * 10 },
  ];

  const it = (pid: string, qty: number, extra?: Parameters<typeof line>[2]) =>
    line(productOf(products, pid), qty, extra);

  const orders: Order[] = [
    makeOrder({
      n: 88, now, ago: H * 1.5,
      items: [it("p_jollof", 2, { variantId: "v_jollof_l", variantName: "Large" }), it("p_chicken", 1, { modifierIds: ["m_chicken_gari"], modifierNames: ["Extra gari"] }), it("p_water", 2)],
      pay: [{ method: "cash", amount: 94, ago: H * 1.5 }],
      status: "pending", customerId: "k_joe",
      extra: { orderType: "dine-in", tableId: "t_4", ticketStatus: "preparing" },
    }),
    makeOrder({
      n: 87, now, ago: H * 3,
      items: [it("p_bank", 1, { modifierIds: ["m_bank_fish", "m_bank_pepper"], modifierNames: ["Extra tilapia", "Extra pepper"] }), it("p_slaw", 1)],
      pay: [{ method: "momo", amount: 68, ago: H * 3, ref: "MTN-TX992" }],
      status: "pending", customerId: "k_tolu",
      extra: { orderType: "dine-in", tableId: "t_2", ticketStatus: "ready" },
    }),
    makeOrder({
      n: 86, now, ago: H * 5,
      items: [it("p_wakye", 2), it("p_ginger", 2)],
      pay: [{ method: "cash", amount: 76, ago: H * 5 }],
      status: "completed", customerId: "k_maa",
      extra: { orderType: "dine-in", tableId: "t_4", ticketStatus: "served" },
    }),
    makeOrder({
      n: 85, now, ago: H * 8,
      items: [it("p_fufu", 1), it("p_fries", 1), it("p_mango", 1)],
      pay: [{ method: "card", amount: 53, ago: H * 8 }],
      status: "completed",
      extra: { orderType: "takeaway", ticketStatus: "served" },
    }),
    makeOrder({
      n: 84, now, ago: DAY * 1.2,
      items: [it("p_jollof", 3, { modifierIds: ["m_jollof_chicken", "m_jollof_egg"], modifierNames: ["Extra chicken", "Extra egg"] }), it("p_beer", 3)],
      pay: [{ method: "cash", amount: 141, ago: DAY * 1.2 }],
      status: "completed", customerId: "k_dede",
      extra: { orderType: "dine-in", tableId: "t_6", ticketStatus: "served" },
    }),
    makeOrder({
      n: 83, now, ago: DAY * 2,
      items: [it("p_cake", 2), it("p_boba", 2)],
      pay: [{ method: "momo", amount: 52, ago: DAY * 2, ref: "VOD-TX551" }],
      status: "completed",
      extra: { orderType: "takeaway", ticketStatus: "served" },
    }),
  ];

  const stockMoves: StockMove[] = [
    { id: "mv_r1", productId: "p_jollof", qty: -2, reason: "sale", ref: "ORD0000088", t: now - H * 1.5 },
    { id: "mv_r2", productId: "p_chicken", qty: -1, reason: "sale", ref: "ORD0000088", t: now - H * 1.5 },
    { id: "mv_r3", productId: "p_bank", qty: -1, reason: "sale", ref: "ORD0000087", t: now - H * 3 },
    { id: "mv_r4", productId: "p_wakye", qty: -2, reason: "sale", ref: "ORD0000086", t: now - H * 5 },
    { id: "mv_r5", productId: "p_rice_raw", qty: 20, reason: "purchase", ref: "Bulk order — rice", t: now - DAY * 3 },
    { id: "mv_r6", productId: "p_tomato_raw", qty: 8, reason: "purchase", ref: "Market run", t: now - DAY * 3 },
  ];

  const settings: Settings = {
    businessType: "restaurant",
    shopName: "Accra Kitchen & Grill",
    address: "5 Boundary Road, Osu, Accra",
    phone: "+233 30 274 9911",
    ownerId: "Owner",
    momoNumber: "0302749911",
    momoNetwork: "MTN MoMo",
    taxInclusive: true,
    taxRate: 0,
    receiptFooter: "Kudi yi — come again!",
    theme: "dark",
    nextOrderNo: 87,
    createdAt: now - DAY * 60,
    restaurantConfig: { tables: true, orderTypes: ["dine-in", "takeaway"] },
  };

  return {
    settings,
    categories,
    products,
    customers,
    orders,
    stockMoves,
    batches: [],
    recipes,
    tables,
  };
}

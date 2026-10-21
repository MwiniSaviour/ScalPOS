import type { Category, Customer, Order, OrderItem, Product, Settings, StockMove } from "./types";

const DAY = 86400000;
const H = 3600000;

export function seedData(): {
  settings: Settings;
  categories: Category[];
  products: Product[];
  customers: Customer[];
  orders: Order[];
  stockMoves: StockMove[];
} {
  const now = Date.now();
  const today0 = now - (now % DAY) - new Date().getTimezoneOffset() * 0 - H * 6; // ~6am today

  const categories: Category[] = [
    { id: "c_elec", name: "Electronics", color: "#2563eb" },
    { id: "c_groc", name: "Groceries", color: "#059669" },
    { id: "c_home", name: "Home & Kitchen", color: "#d97706" },
    { id: "c_cloth", name: "Clothing", color: "#7c3aed" },
    { id: "c_care", name: "Personal Care", color: "#e11d48" },
  ];

  const products: Product[] = [
    { id: "p_earbuds", name: "Wireless Earbuds", categoryId: "c_elec", cost: 55, price: 85, stock: 42, lowStockAt: 10, unit: "pcs", sku: "ELEC-001", barcode: "GD1111101", imageUrl: "/products/earbuds.jpg", description: "Bluetooth 5.2, 22h playtime, charging case", active: true, createdAt: now - DAY * 30, updatedAt: now - DAY },
    { id: "p_charger", name: "Phone Charger 20W", categoryId: "c_elec", cost: 28, price: 45, stock: 96, lowStockAt: 15, unit: "pcs", sku: "ELEC-002", barcode: "GD1111102", imageUrl: "/products/charger.jpg", description: "Type-C fast charger", active: true, createdAt: now - DAY * 30, updatedAt: now - DAY },
    { id: "p_powerbank", name: "Power Bank 10,000mAh", categoryId: "c_elec", cost: 85, price: 120, stock: 27, lowStockAt: 8, unit: "pcs", sku: "ELEC-003", barcode: "GD1111103", imageUrl: "/products/powerbank.jpg", description: "Dual USB output", active: true, createdAt: now - DAY * 25, updatedAt: now - DAY },
    { id: "p_cable", name: "USB-C Cable", categoryId: "c_elec", cost: 8, price: 15, stock: 140, lowStockAt: 25, unit: "pcs", sku: "ELEC-004", barcode: "GD1111104", imageUrl: "/products/usbcable.jpg", description: "1m braided cable", active: true, createdAt: now - DAY * 25, updatedAt: now - DAY },
    { id: "p_rice", name: "Rice 5kg", categoryId: "c_groc", cost: 95, price: 120, stock: 39, lowStockAt: 10, unit: "bag", sku: "GROC-001", barcode: "GD2222201", imageUrl: "/products/rice.jpg", description: "Premium perfumed rice", active: true, createdAt: now - DAY * 40, updatedAt: now },
    { id: "p_oil", name: "Cooking Oil 1L", categoryId: "c_groc", cost: 25, price: 32, stock: 58, lowStockAt: 12, unit: "ltr", sku: "GROC-002", barcode: "GD2222202", imageUrl: "/products/oil.jpg", description: "Vegetable cooking oil", active: true, createdAt: now - DAY * 40, updatedAt: now },
    { id: "p_indomie", name: "Indomie Noodles", categoryId: "c_groc", cost: 2.2, price: 3.5, stock: 240, lowStockAt: 50, unit: "pack", sku: "GROC-003", barcode: "GD2222203", imageUrl: "/products/noodles.jpg", description: "Instant fried noodles, 70g", active: true, createdAt: now - DAY * 40, updatedAt: now },
    { id: "p_sugar", name: "Sugar 1kg", categoryId: "c_groc", cost: 12, price: 16, stock: 8, lowStockAt: 12, unit: "pack", sku: "GROC-004", barcode: "GD2222204", imageUrl: "/products/sugar.jpg", description: "Granulated white sugar", active: true, createdAt: now - DAY * 20, updatedAt: now },
    { id: "p_mug", name: "Coffee Mug", categoryId: "c_home", cost: 15, price: 25, stock: 64, lowStockAt: 10, unit: "pcs", sku: "HOME-001", barcode: "GD3333301", imageUrl: "/products/mug.jpg", description: "Ceramic, 350ml", active: true, createdAt: now - DAY * 20, updatedAt: now },
    { id: "p_towel", name: "Kitchen Towel", categoryId: "c_home", cost: 8, price: 12, stock: 90, lowStockAt: 20, unit: "pcs", sku: "HOME-002", barcode: "GD3333302", imageUrl: "/products/towel.jpg", description: "2-ply, roll of 60 sheets", active: true, createdAt: now - DAY * 20, updatedAt: now },
    { id: "p_jeans", name: "Denim Jeans", categoryId: "c_cloth", cost: 120, price: 180, stock: 6, lowStockAt: 6, unit: "pcs", sku: "CLOTH-001", barcode: "GD4444401", imageUrl: "/products/jeans.jpg", description: "Slim fit, sizes 30–38", active: true, createdAt: now - DAY * 15, updatedAt: now },
    { id: "p_socks", name: "Sports Socks", categoryId: "c_cloth", cost: 9, price: 15, stock: 92, lowStockAt: 15, unit: "pcs", sku: "CLOTH-002", barcode: "GD4444402", imageUrl: "/products/socks.jpg", description: "3-pair pack, cotton blend", active: true, createdAt: now - DAY * 15, updatedAt: now },
    { id: "p_sani", name: "Hand Sanitizer", categoryId: "c_care", cost: 11, price: 18, stock: 2, lowStockAt: 8, unit: "pcs", sku: "CARE-001", barcode: "GD5555501", imageUrl: "/products/detergent.jpg", description: "70% alcohol, 250ml", active: true, createdAt: now - DAY * 12, updatedAt: now },
    { id: "p_soap", name: "Bathing Soap", categoryId: "c_care", cost: 6.5, price: 10, stock: 130, lowStockAt: 25, unit: "pcs", sku: "CARE-002", barcode: "GD5555502", imageUrl: "/products/soap.jpg", description: "Antibacterial, 125g", active: true, createdAt: now - DAY * 12, updatedAt: now },
  ];

  const customers: Customer[] = [
    { id: "k_ama", name: "Ama Serwaa", phone: "244 555 1020", address: "Osu Badu St, Accra", note: "", createdAt: now - DAY * 60 },
    { id: "k_kwame", name: "Kwame Mensah", phone: "551 883 4044", address: "Haatso, Accra", note: "Prefers MoMo payment", createdAt: now - DAY * 45 },
    { id: "k_akua", name: "Akua Owusu", phone: "209 447 7121", address: "Circle, Accra", note: "", createdAt: now - DAY * 25 },
    { id: "k_kofi", name: "Kofi Boateng", phone: "244 100 6630", address: "Madina, Accra", note: "", createdAt: now - DAY * 18 },
    { id: "k_esi", name: "Esi Appiah", phone: "246 205 5512", address: "Tetteh Quarshie, Accra", note: "Teacher at Grace Prep", createdAt: now - DAY * 9 },
    { id: "k_yaw", name: "Yaw Darko", phone: "532 771 9230", address: "Kaneshie, Accra", note: "", createdAt: now - DAY * 4 },
  ];

  const it = (pid: string, qty: number): OrderItem => {
    const p = products.find((x) => x.id === pid)!;
    return { productId: p.id, name: p.name, imageUrl: p.imageUrl, qty, price: p.price, cost: p.cost };
  };

  const mk = (
    n: number,
    ago: number,
    items: OrderItem[],
    pay: { method: Order["payments"][0]["method"]; amount: number; ago: number; ref?: string }[],
    status: Order["status"],
    customerId: string | null = null,
    discount = 0,
  ): Order => {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0) - discount;
    const total = subtotal;
    return {
      id: `ORD${String(n).padStart(7, "0")}`,
      items,
      customerId,
      subtotal: total,
      discount,
      total,
      // seed settings carry taxRate 0, so seeded sales carry no tax
      tax: 0,
      status,
      payments: pay.map((p) => ({
        id: "py_" + n + "_" + p.method,
        method: p.method,
        amount: p.amount,
        t: now - ago,
        ref: p.ref,
      })),
      payStatus:
        status === "refunded"
          ? "refunded"
          : pay.reduce((s, p) => s + p.amount, 0) >= total
            ? "paid"
            : pay.length && pay[0].amount > 0
              ? "partial"
              : "unpaid",
      createdAt: now - ago,
      completedAt: status === "completed" ? now - ago : null,
    };
  };

  const orders: Order[] = [
    mk(201, H * 2, [it("p_indomie", 4), it("p_oil", 1)], [{ method: "cash", amount: 46.0, ago: H * 2 }], "completed"),
    mk(200, H * 4, [it("p_charger", 1), it("p_cable", 2)], [{ method: "momo", amount: 75.0, ago: H * 4, ref: "MTN-TX001" }], "completed", "k_ama"),
    mk(199, H * 7, [it("p_rice", 2), it("p_sugar", 2), it("p_soap", 2)], [{ method: "cash", amount: 100, ago: H * 7 }], "completed", "k_kwame", 10),
    mk(198, H * 26, [it("p_earbuds", 1), it("p_mug", 1)], [{ method: "card", amount: 110, ago: H * 26 }], "completed"),
    mk(197, H * 28, [it("p_indomie", 10), it("p_sani", 2)], [{ method: "momo", amount: 40, ago: H * 28, ref: "VOD-TX418" }], "completed", "k_akua"),
    mk(196, H * 30, [it("p_towel", 1), it("p_socks", 1)], [{ method: "cash", amount: 27, ago: H * 30 }], "completed"),
    mk(195, H * 51, [it("p_jeans", 1)], [{ method: "cash", amount: 60, ago: H * 51 }], "pending", "k_kofi"),
    mk(194, H * 53, [it("p_powerbank", 1), it("p_sani", 1)], [{ method: "momo", amount: 138, ago: H * 53, ref: "MTN-TX882" }], "completed"),
    mk(193, H * 74, [it("p_rice", 1), it("p_oil", 2), it("p_indomie", 6)], [{ method: "cash", amount: 198, ago: H * 74 }], "completed"),
    mk(192, H * 96, [it("p_charger", 1)], [], "pending", "k_esi"),
    mk(191, H * 120, [it("p_mug", 2), it("p_towel", 2)], [{ method: "momo", amount: 74, ago: H * 120, ref: "MTN-TX103" }], "completed"),
    mk(190, H * 168, [it("p_socks", 2), it("p_cable", 3)], [{ method: "cash", amount: 75, ago: H * 168 }], "completed", "k_yaw"),
  ];

  const stockMoves: StockMove[] = [
    { id: "mv_s1", productId: "p_indomie", qty: -4, reason: "sale", ref: "ORD0000201", t: now - H * 2 },
    { id: "mv_s2", productId: "p_oil", qty: -1, reason: "sale", ref: "ORD0000201", t: now - H * 2 },
    { id: "mv_s3", productId: "p_charger", qty: -1, reason: "sale", ref: "ORD0000200", t: now - H * 4 },
    { id: "mv_s4", productId: "p_cable", qty: -2, reason: "sale", ref: "ORD0000200", t: now - H * 4 },
    { id: "mv_s5", productId: "p_rice", qty: -2, reason: "sale", ref: "ORD0000199", t: now - H * 7 },
    { id: "mv_a1", productId: "p_soap", qty: 50, reason: "purchase", ref: "Supplier trip", t: now - H * 30 },
    { id: "mv_a2", productId: "p_sani", qty: -1, reason: "damage", ref: "Broken bottle", t: now - H * 36 },
  ];

  const settings: Settings = {
    shopName: "Bright Corner Stores",
    address: "12 Osu Badu Street, Airport West, Accra",
    phone: "+233 24 555 1020",
    ownerId: "Owner",
    momoNumber: "0245551020",
    momoNetwork: "MTN MoMo",
    taxInclusive: true,
    taxRate: 0,
    receiptFooter: "Thank you for shopping with us!",
    theme: "dark",
    nextOrderNo: 202,
    createdAt: now - DAY * 60,
  };
  if (today0 <= 0) {
    settings.nextOrderNo = 202;
  }

  return { settings, categories, products, customers, orders, stockMoves };
}

/** convenience export for store rehydrate */
export function seededProduct(): Product | undefined {
  return seedData().products[0];
}

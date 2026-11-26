import test from "node:test";
import assert from "node:assert/strict";
import { poTotal, applyReceipt } from "../../lib/suppliers.ts";
import type { PurchaseOrder, Product } from "../../lib/types.ts";

const po: PurchaseOrder = {
  id: "po1",
  supplierId: "s1",
  status: "sent",
  lines: [
    { productId: "p1", packName: null, qty: 5, unitCost: 2 },
    { productId: "p2", packName: "box", qty: 2, unitCost: 10 },
  ],
  total: 30,
  receivedAt: null,
  createdAt: 1,
  updatedAt: 1,
};

test("purchase order total is the sum of line cost", () => {
  assert.equal(poTotal(po.lines), 30);
});

test("receiving a purchase order restocks products once", () => {
  const products: Product[] = [
    { id: "p1", name: "A", categoryId: null, cost: 1, price: 2, stock: 1, lowStockAt: 0, unit: "pcs", sku: "", barcode: "", imageUrl: "", description: "", active: true, createdAt: 0, updatedAt: 0 },
    { id: "p2", name: "B", categoryId: null, cost: 8, price: 12, stock: 4, lowStockAt: 0, unit: "pcs", sku: "", barcode: "", imageUrl: "", description: "", active: true, createdAt: 0, updatedAt: 0 },
  ];
  const first = applyReceipt(po, products, [], 100, (p) => `mv_${p}`);
  assert.equal(first.products.find((p) => p.id === "p1")?.stock, 6);
  assert.equal(first.products.find((p) => p.id === "p2")?.stock, 6);
  assert.equal(first.moves.length, 2);
  assert.equal(first.order.status, "received");
  assert.equal(first.order.receivedAt, 100);

  const second = applyReceipt(first.order, first.products, first.moves, 200, (p) => `mv2_${p}`);
  assert.equal(second.products.find((p) => p.id === "p1")?.stock, 6);
  assert.equal(second.moves.length, 2);
});

test("receiving a purchase order with an unknown product skips that line", () => {
  const partial = { ...po, lines: [{ productId: "missing", packName: null, qty: 3, unitCost: 1 }] };
  const result = applyReceipt(partial, [], [], 100, (p) => `mv_${p}`);
  assert.equal(result.moves.length, 0);
  assert.equal(result.order.status, "received");
});

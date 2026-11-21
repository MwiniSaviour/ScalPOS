import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { applyImportRows } from "../../lib/import/apply.ts";
import type { Category, Product, StockMove } from "../../lib/types.ts";

const options = { updateExisting: true, createCategories: true };

function product(over: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Old rice",
    categoryId: null,
    cost: 10,
    price: 20,
    stock: 7,
    lowStockAt: 2,
    unit: "bag",
    sku: "OLD",
    barcode: "111",
    imageUrl: "",
    description: "",
    active: true,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

describe("mobile import apply", () => {
  test("updates matched products without touching existing stock", () => {
    const applied = applyImportRows(
      [{
        name: "New rice",
        sku: "NEW",
        barcode: "111",
        price: 25,
        cost_price: 12,
        stock: 99,
        low_stock_at: 3,
        unit: "bag",
        description: "updated",
        category: "",
        active: true,
      }],
      options,
      [product()],
      [],
      [],
      100,
    );
    assert.equal(applied.result.updated, 1);
    assert.equal(applied.products[0].name, "New rice");
    assert.equal(applied.products[0].price, 25);
    assert.equal(applied.products[0].stock, 7);
    assert.equal(applied.products[0].sku, "NEW");
    assert.equal(applied.stockMoves.length, 0);
  });

  test("creates products, categories and opening stock moves", () => {
    const applied = applyImportRows(
      [{
        name: "Milo",
        sku: "MILO",
        barcode: "222",
        price: 15,
        cost_price: 9,
        stock: 12,
        low_stock_at: 5,
        unit: "pack",
        description: "",
        category: "Drinks",
        active: true,
      }],
      options,
      [],
      [] as Category[],
      [] as StockMove[],
      100,
    );
    assert.equal(applied.result.created, 1);
    assert.equal(applied.categories.length, 1);
    assert.equal(applied.categories[0].name, "Drinks");
    assert.equal(applied.products[0].stock, 12);
    assert.equal(applied.products[0].categoryId, applied.categories[0].id);
    assert.equal(applied.stockMoves.length, 1);
    assert.equal(applied.stockMoves[0].reason, "opening");
    assert.equal(applied.stockMoves[0].ref, "import");
  });
});

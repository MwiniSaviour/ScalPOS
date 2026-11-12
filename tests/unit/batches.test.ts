import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  batchStock,
  batchesOf,
  cartLineKey,
  daysToExpiry,
  expiryBucket,
  feofAllocate,
  isExpired,
  linePackName,
  packFactor,
  planRestock,
  planSale,
  sellableStock,
} from "../../lib/batches.ts";
import type { Batch, CartLine, OrderItem, Product } from "../../lib/types.ts";

const mkBatch = (over: Partial<Batch> & { id: string }): Batch => ({
  productId: "p1",
  batchNo: "",
  expiry: "",
  qty: 0,
  cost: 0,
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe("cart line keys", () => {
  test("base unit line is keyed by product id", () => {
    assert.equal(cartLineKey({ productId: "p1" }), "p1");
    assert.equal(cartLineKey({ productId: "p1", packIdx: undefined }), "p1");
  });

  test("pack lines are keyed by product id + pack index", () => {
    assert.equal(cartLineKey({ productId: "p1", packIdx: 0 }), "p1#0");
    assert.equal(cartLineKey({ productId: "p1", packIdx: 2 }), "p1#2");
  });
});

describe("pack factors", () => {
  const product: Product = {
    id: "p1",
    name: "Paracetamol",
    categoryId: null,
    cost: 1,
    price: 2,
    stock: 100,
    lowStockAt: 5,
    unit: "pcs",
    sku: "",
    barcode: "",
    imageUrl: "",
    description: "",
    active: true,
    createdAt: 0,
    updatedAt: 0,
    packs: [
      { name: "Box", factor: 10 },
      { name: "Carton", factor: 100 },
    ],
  };

  test("no pack means one base unit", () => {
    assert.equal(packFactor(product, undefined), 1);
    assert.equal(packFactor(undefined, undefined), 1);
  });

  test("pack factor comes from the pack row", () => {
    assert.equal(packFactor(product, 0), 10);
    assert.equal(packFactor(product, 1), 100);
  });

  test("a broken factor falls back to one", () => {
    const broken: Product = { ...product, packs: [{ name: "Bad", factor: 0 }] };
    assert.equal(packFactor(broken, 0), 1);
    assert.equal(packFactor(broken, 9), 1);
  });

  test("pack name is read from the pack row", () => {
    assert.equal(linePackName(product, 0), "Box");
    assert.equal(linePackName(product, undefined), undefined);
  });
});

describe("FEFO allocation", () => {
  const batches: Batch[] = [
    mkBatch({ id: "b-late", expiry: "2027-01-31", qty: 50, createdAt: 1 }),
    mkBatch({ id: "b-early", expiry: "2026-12-31", qty: 20, createdAt: 2 }),
    mkBatch({ id: "b-none", expiry: "", qty: 30, createdAt: 3 }),
    mkBatch({ id: "b-empty", expiry: "2026-01-01", qty: 0, createdAt: 4 }),
  ];

  test("batches sort by expiry, no-expiry last", () => {
    assert.deepEqual(
      batchesOf(batches, "p1").map((b) => b.id),
      ["b-empty", "b-early", "b-late", "b-none"],
    );
  });

  test("stock of a product is the sum of its batches", () => {
    assert.equal(batchStock(batches, "p1"), 100);
    assert.equal(batchStock(batches, "other"), 0);
  });

  test("allocation takes from the earliest expiry first", () => {
    const r = feofAllocate(batches, "p1", 25);
    assert.deepEqual(r.allocations, [
      { batchId: "b-early", qty: 20 },
      { batchId: "b-late", qty: 5 },
    ]);
    assert.equal(r.taken, 25);
  });

  test("allocation skips empty batches", () => {
    const r = feofAllocate(batches, "p1", 1);
    assert.deepEqual(r.allocations, [{ batchId: "b-early", qty: 1 }]);
  });

  test("allocation reports a shortfall when stock runs out", () => {
    const r = feofAllocate(batches, "p1", 500);
    assert.equal(r.taken, 100);
    assert.equal(r.allocations.length, 3);
  });

  test("allocation of zero takes nothing", () => {
    const r = feofAllocate(batches, "p1", 0);
    assert.deepEqual(r.allocations, []);
    assert.equal(r.taken, 0);
  });
});

describe("expiry buckets", () => {
  const now = Date.UTC(2026, 10, 12); // 2026-11-12

  test("days to expiry counts whole days", () => {
    assert.equal(daysToExpiry("2026-11-22", now), 10);
    assert.equal(daysToExpiry("2026-11-01", now), -11);
    assert.equal(daysToExpiry("", now), null);
  });

  test("batches land in the right bucket", () => {
    assert.equal(expiryBucket("2026-11-01", now), "expired");
    assert.equal(expiryBucket("2026-11-20", now), "soon30");
    assert.equal(expiryBucket("2026-12-01", now), "soon30");
    assert.equal(expiryBucket("2027-01-11", now), "soon90");
    assert.equal(expiryBucket("2027-06-01", now), "later");
    assert.equal(expiryBucket("", now), "later");
  });
});

const mkProduct = (over: Partial<Product> & { id: string }): Product => ({
  name: "Product",
  categoryId: null,
  cost: 1,
  price: 2,
  stock: 100,
  lowStockAt: 5,
  unit: "pcs",
  sku: "",
  barcode: "",
  imageUrl: "",
  description: "",
  active: true,
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe("sale planning", () => {
  const batched = mkProduct({ id: "p-batched", stock: 60, cost: 2 });
  const plain = mkProduct({ id: "p-plain", stock: 30, cost: 1 });
  const packs = mkProduct({
    id: "p-packs",
    stock: 100,
    cost: 1,
    price: 2,
    packs: [{ name: "Box", factor: 10 }],
  });

  const batches: Batch[] = [
    mkBatch({ id: "b-early", productId: "p-batched", expiry: "2026-12-31", qty: 20 }),
    mkBatch({ id: "b-late", productId: "p-batched", expiry: "2027-06-30", qty: 40 }),
  ];

  test("a batched product is drawn FEFO and its stock is not touched directly", () => {
    const plan = planSale([{ productId: "p-batched", qty: 25 }], [batched], batches);
    assert.equal(plan.shortfall, 0);
    assert.deepEqual(plan.lines[0].allocations, [
      { batchId: "b-early", qty: 20 },
      { batchId: "b-late", qty: 5 },
    ]);
    assert.equal(plan.batchDraw.get("b-early"), 20);
    assert.equal(plan.batchDraw.get("b-late"), 5);
    assert.equal(plan.productSold.size, 0);
  });

  test("a plain product is sold from its own stock", () => {
    const plan = planSale([{ productId: "p-plain", qty: 4 }], [plain], batches);
    assert.equal(plan.productSold.get("p-plain"), 4);
    assert.equal(plan.batchDraw.size, 0);
    assert.deepEqual(plan.lines[0].allocations, []);
  });

  test("a pack line consumes factor times the base units", () => {
    const plan = planSale(
      [{ productId: "p-packs", qty: 2, packIdx: 0, price: 25 }],
      [packs],
      [],
    );
    assert.equal(plan.lines[0].baseQty, 20);
    assert.equal(plan.lines[0].factor, 10);
    assert.equal(plan.lines[0].packName, "Box");
    assert.equal(plan.productSold.get("p-packs"), 20);
  });

  test("two packs of the same product draw from the same batch pool", () => {
    const plan = planSale(
      [{ productId: "p-batched", qty: 1, packIdx: 0, price: 50 }],
      [{ ...batched, packs: [{ name: "Box", factor: 10 }] }],
      batches,
    );
    assert.equal(plan.lines[0].baseQty, 10);
    assert.deepEqual(plan.lines[0].allocations, [{ batchId: "b-early", qty: 10 }]);
  });

  test("a shortfall is reported instead of overselling", () => {
    const plan = planSale([{ productId: "p-batched", qty: 100 }], [batched], batches);
    assert.equal(plan.shortfall, 40);
    assert.equal(plan.shortageProduct, "Product");
  });

  test("a missing product in the cart is skipped", () => {
    const plan = planSale([{ productId: "ghost", qty: 1 }], [plain], batches);
    assert.equal(plan.lines.length, 0);
  });
});

describe("restock planning", () => {
  const items: OrderItem[] = [
    {
      productId: "p-batched",
      name: "Batched",
      imageUrl: "",
      qty: 25,
      price: 2,
      cost: 1,
      baseQty: 25,
      batchAllocations: [
        { batchId: "b-early", qty: 20 },
        { batchId: "b-late", qty: 5 },
      ],
    },
    {
      productId: "p-plain",
      name: "Plain",
      imageUrl: "",
      qty: 3,
      price: 2,
      cost: 1,
      baseQty: 3,
    },
  ];

  test("batched lines go back to their own batches", () => {
    const plan = planRestock(items);
    assert.equal(plan.batchBack.get("b-early"), 20);
    assert.equal(plan.batchBack.get("b-late"), 5);
    assert.equal(plan.productBack.get("p-batched"), undefined);
  });

  test("plain lines go back onto the product, in base units", () => {
    const plan = planRestock(items);
    assert.equal(plan.productBack.get("p-plain"), 3);
  });

  test("a pack line returns its base units, not its pack count", () => {
    const plan = planRestock([
      {
        productId: "p-packs",
        name: "Packs",
        imageUrl: "",
        qty: 2,
        price: 25,
        cost: 10,
        baseQty: 20,
      },
    ]);
    assert.equal(plan.productBack.get("p-packs"), 20);
  });
});

describe("expired stock is never sold", () => {
  const now = Date.UTC(2026, 10, 12); // 2026-11-12

  const batches: Batch[] = [
    mkBatch({ id: "b-gone", expiry: "2026-10-01", qty: 5 }),
    mkBatch({ id: "b-today", expiry: "2026-11-12", qty: 7 }),
    mkBatch({ id: "b-soon", expiry: "2026-12-15", qty: 20 }),
  ];

  test("a batch is expired only from the day after its expiry date", () => {
    assert.equal(isExpired("2026-10-01", now), true);
    assert.equal(isExpired("2026-11-12", now), false);
    assert.equal(isExpired("2026-12-15", now), false);
    assert.equal(isExpired("", now), false);
  });

  test("sellable stock excludes expired batches", () => {
    assert.equal(sellableStock(batches, "p1", now), 27);
    assert.equal(batchStock(batches, "p1"), 32);
  });

  test("allocation skips expired batches", () => {
    const r = feofAllocate(batches, "p1", 10, now);
    assert.deepEqual(r.allocations, [
      { batchId: "b-today", qty: 7 },
      { batchId: "b-soon", qty: 3 },
    ]);
    assert.equal(r.taken, 10);
  });

  test("a sale cannot be covered by expired stock alone", () => {
    const onlyExpired = [mkBatch({ id: "b-gone", expiry: "2026-10-01", qty: 5 })];
    const r = feofAllocate(onlyExpired, "p1", 5, now);
    assert.deepEqual(r.allocations, []);
    assert.equal(r.taken, 0);
  });

  test("a planned sale reports a shortfall instead of selling expired stock", () => {
    const product = mkProduct({ id: "p1", stock: 5 });
    const onlyExpired = [mkBatch({ id: "b-gone", expiry: "2026-10-01", qty: 5 })];
    const plan = planSale([{ productId: "p1", qty: 3 }], [product], onlyExpired, now);
    assert.equal(plan.shortfall, 3);
    assert.equal(plan.lines[0].allocations.length, 0);
  });
});

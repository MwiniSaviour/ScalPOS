import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isUnavailableToday,
  itemConsumption,
  mergeTabItems,
  planRestockIngredients,
  recipeDelta,
  recipeDraw,
  sameOptions,
} from "../../lib/restaurant.ts";
import { planRestock } from "../../lib/batches.ts";
import type { CartLine, OrderItem, Product, Recipe } from "../../lib/types.ts";

const mkProduct = (over: Partial<Product> & { id: string }): Product => ({
  name: "Dish",
  categoryId: null,
  cost: 5,
  price: 20,
  stock: 0,
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

const mkRecipe = (over: Partial<Recipe> & { id: string; productId: string }): Recipe => ({
  lines: [],
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe("menu options", () => {
  test("the same dish with the same options matches", () => {
    assert.ok(sameOptions({ productId: "p1" }, { productId: "p1" }));
    assert.ok(
      sameOptions(
        { productId: "p1", variantId: "v1", modifierIds: ["a", "b"] },
        { productId: "p1", variantId: "v1", modifierIds: ["b", "a"] },
      ),
    );
  });

  test("a different variant or modifier is a different dish", () => {
    assert.ok(!sameOptions({ productId: "p1", variantId: "v1" }, { productId: "p1" }));
    assert.ok(
      !sameOptions(
        { productId: "p1", modifierIds: ["a"] },
        { productId: "p1", modifierIds: ["a", "b"] },
      ),
    );
    assert.ok(!sameOptions({ productId: "p1" }, { productId: "p2" }));
  });
});

describe("recipes draw ingredients", () => {
  const recipes = [
    mkRecipe({
      id: "r1",
      productId: "dish",
      lines: [
        { ingredientProductId: "rice", qty: 150 },
        { ingredientProductId: "chicken", qty: 100, wastePct: 10 },
      ],
    }),
  ];

  test("one dish takes its ingredient quantities", () => {
    const c = itemConsumption({ productId: "dish", qty: 1 }, recipes);
    assert.deepEqual(c, [
      { productId: "rice", qty: 150 },
      { productId: "chicken", qty: 110 },
    ]);
  });

  test("two dishes take twice as much", () => {
    const c = itemConsumption({ productId: "dish", qty: 2 }, recipes);
    assert.equal(c[0].qty, 300);
    assert.equal(c[1].qty, 220);
  });

  test("a dish without a recipe takes nothing", () => {
    assert.deepEqual(itemConsumption({ productId: "water", qty: 3 }, recipes), []);
  });

  test("the draw of a whole order is summed per ingredient", () => {
    const draw = recipeDraw([{ productId: "dish", qty: 2 }], recipes);
    assert.equal(draw.get("rice"), 300);
    assert.equal(draw.get("chicken"), 220);
  });

  test("the delta between two versions of an order is the change", () => {
    const before = [{ productId: "dish", qty: 1 }];
    const after = [{ productId: "dish", qty: 3 }];
    const d = recipeDelta(before, after, recipes);
    assert.equal(d.get("rice"), 300);
    assert.equal(d.get("chicken"), 220);
  });

  test("a shrinking order returns ingredients", () => {
    const d = recipeDelta([{ productId: "dish", qty: 2 }], [{ productId: "dish", qty: 1 }], recipes);
    assert.equal(d.get("rice"), -150);
    assert.equal(d.get("chicken"), -110);
  });
});

describe("open tabs", () => {
  const dish = mkProduct({ id: "dish", name: "Jollof", price: 20, cost: 5 });
  const existing: OrderItem[] = [
    {
      productId: "dish",
      name: "Jollof",
      imageUrl: "",
      qty: 2,
      price: 20,
      cost: 5,
      baseQty: 2,
    },
  ];

  test("a cart that repeats a tab line raises the tab quantity", () => {
    const cart: CartLine[] = [{ productId: "dish", qty: 3 }];
    const merged = mergeTabItems(existing, cart, [dish]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].qty, 3);
  });

  test("a cart that lowers a tab line lowers it on the tab", () => {
    const cart: CartLine[] = [{ productId: "dish", qty: 1 }];
    const merged = mergeTabItems(existing, cart, [dish]);
    assert.equal(merged[0].qty, 1);
  });

  test("a line that is not on the tab yet is appended", () => {
    const other = mkProduct({ id: "soup", name: "Soup", price: 12, cost: 3 });
    const cart: CartLine[] = [{ productId: "soup", qty: 1 }];
    const merged = mergeTabItems(existing, cart, [dish, other]);
    assert.equal(merged.length, 2);
    assert.equal(merged[1].name, "Soup");
  });

  test("a tab line reduced to zero is dropped", () => {
    const cart: CartLine[] = [{ productId: "dish", qty: 0 }];
    const merged = mergeTabItems(existing, cart, [dish]);
    assert.equal(merged.length, 0);
  });

  test("a different variant is a different tab line", () => {
    const cart: CartLine[] = [{ productId: "dish", qty: 1, variantId: "v-large" }];
    const merged = mergeTabItems(existing, cart, [dish]);
    assert.equal(merged.length, 2);
    assert.equal(merged[1].variantId, "v-large");
  });
});

describe("refunding ingredients", () => {
  const item: OrderItem = {
    productId: "dish",
    name: "Jollof",
    imageUrl: "",
    qty: 2,
    price: 20,
    cost: 5,
    baseQty: 2,
    recipeConsumption: [{ productId: "rice", qty: 300 }],
  };

  test("a plated dish is not put back on its own shelf", () => {
    const plan = planRestock([item]);
    assert.equal(plan.productBack.get("dish"), undefined);
  });

  test("the ingredients are credited back", () => {
    const back = planRestockIngredients([item]);
    assert.equal(back.get("rice"), 300);
  });

  test("an ordinary item still goes back on its shelf", () => {
    const plan = planRestock([
      { ...item, recipeConsumption: undefined, productId: "water" },
    ]);
    assert.equal(plan.productBack.get("water"), 2);
  });
});

describe("daily availability", () => {
  const now = Date.UTC(2026, 10, 12); // 2026-11-12

  test("an item marked unavailable today is off the menu today", () => {
    const p = mkProduct({ id: "p1", unavailableUntil: "2026-11-12" });
    assert.equal(isUnavailableToday(p, now), true);
  });

  test("an item blocked until a later date is off today too", () => {
    const p = mkProduct({ id: "p1", unavailableUntil: "2026-11-13" });
    assert.equal(isUnavailableToday(p, now), true);
  });

  test("an item marked for yesterday is back on the menu", () => {
    const p = mkProduct({ id: "p1", unavailableUntil: "2026-11-11" });
    assert.equal(isUnavailableToday(p, now), false);
  });

  test("an item with no date is always available", () => {
    assert.equal(isUnavailableToday(mkProduct({ id: "p1" }), now), false);
  });
});

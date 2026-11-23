import test from "node:test";
import assert from "node:assert/strict";
import { DEPS, computeRanks } from "../../lib/sync/deps.ts";

test("purchase orders are pushed after products and suppliers", () => {
  const r = computeRanks();
  assert.ok(r.purchase_orders > r.products);
  assert.ok(r.purchase_orders > r.suppliers);
});

test("suppliers have no dependencies", () => {
  assert.deepEqual(DEPS.suppliers, []);
});

test("all dependency targets are registered tables", () => {
  for (const [table, deps] of Object.entries(DEPS)) {
    for (const dep of deps) {
      assert.ok(DEPS[dep], `${table} depends on unregistered ${dep}`);
    }
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { convertLegacyOrders, needsMigration } from "./migrate-legacy.ts";

test("legacy local order keeps its id and local invoice number", () => {
  const rows = convertLegacyOrders([
    { id: "ORD-20261122-0001", invoice_no: "ORD-20261122-0001", total: 5, created_at: "2026-11-22T10:00:00.000Z" },
  ]);
  assert.equal(rows[0].id, "ORD-20261122-0001");
  assert.equal(rows[0].invoiceNo, "ORD-20261122-0001");
  assert.equal(rows[0].total, 5);
  assert.equal(rows[0].createdAt, Date.parse("2026-11-22T10:00:00.000Z"));
});

test("migration is skipped once the marker is set", () => {
  const store: Record<string, string> = { "desk-pos-migrated-v1": "1" };
  assert.equal(needsMigration((k) => store[k] ?? null), false);
});

test("migration is needed when the legacy flag is present", () => {
  const store: Record<string, string> = { "desk-pos-local-shop-v1": "1" };
  assert.equal(needsMigration((k) => store[k] ?? null), true);
});

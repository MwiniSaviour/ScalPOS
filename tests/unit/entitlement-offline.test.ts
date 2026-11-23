import test from "node:test";
import assert from "node:assert/strict";
import { insideOfflineGrace, OFFLINE_GRACE_MS } from "../../lib/entitlement-grace.ts";

test("cached active plan survives an offline window", () => {
  assert.equal(
    insideOfflineGrace(
      { status: "active", expiresAt: 1000, fetchedAt: 900 },
      1000 + OFFLINE_GRACE_MS - 1,
    ),
    true,
  );
});

test("access ends after the offline grace expires", () => {
  assert.equal(
    insideOfflineGrace({ status: "active", expiresAt: 1000, fetchedAt: 900 }, 1000 + OFFLINE_GRACE_MS),
    false,
  );
});

test("no expiry falls back to fetchedAt plus grace", () => {
  assert.equal(
    insideOfflineGrace({ status: "trialing", expiresAt: null, fetchedAt: 5000 }, 5000 + OFFLINE_GRACE_MS - 1),
    true,
  );
});

test("a server answer of expired is never overridden offline", () => {
  assert.equal(
    insideOfflineGrace({ status: "expired", expiresAt: 1000, fetchedAt: 900 }, 1000),
    false,
  );
});

test("pending and none are never granted offline", () => {
  assert.equal(insideOfflineGrace({ status: "pending", expiresAt: 1000, fetchedAt: 900 }, 1000), false);
  assert.equal(insideOfflineGrace({ status: "none", expiresAt: 1000, fetchedAt: 900 }, 1000), false);
});

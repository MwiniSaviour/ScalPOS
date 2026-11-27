import test from "node:test";
import assert from "node:assert/strict";
import { shopForConnection } from "../../apps/desktop/src/lib/auth/linked-shop.ts";

test("linked cloud account uses its real org id for billing and sync", () => {
  assert.deepEqual(shopForConnection({ org_id: "org_123", org_name: "Saviour Shop" }), {
    id: "org_123",
    name: "Saviour Shop",
    role: "owner",
  });
});

test("unlinked desktop falls back to the local shop", () => {
  assert.deepEqual(shopForConnection(null), {
    id: "local",
    name: "This computer",
    role: "owner",
  });
});

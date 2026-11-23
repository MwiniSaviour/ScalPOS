import test from "node:test";
import assert from "node:assert/strict";
import { shouldUseLocalOnly } from "./local-mode.ts";

test("a local shop with no cloud connection runs in local-only mode", () => {
  assert.equal(shouldUseLocalOnly(true, null), true);
});

test("a linked cloud shop is not local-only", () => {
  assert.equal(shouldUseLocalOnly(true, { org_id: "org_1" }), false);
});

test("an empty device is not local-only", () => {
  assert.equal(shouldUseLocalOnly(false, null), false);
});

test("sign-in state does not decide local-only mode", () => {
  assert.equal(shouldUseLocalOnly(true, null), true);
  assert.equal(shouldUseLocalOnly(true, { org_id: "org_1" }), false);
});

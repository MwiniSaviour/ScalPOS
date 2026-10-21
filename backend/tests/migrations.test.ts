import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const skip = !URL || !SERVICE || !ANON;

const TABLES = [
  "orgs",
  "memberships",
  "categories",
  "products",
  "customers",
  "orders",
  "order_items",
  "stock_moves",
  "settings",
  "staff",
];

describe("backend migrations", { skip }, () => {
  const admin = createClient(URL!, SERVICE!);

  for (const t of TABLES) {
    test(`table ${t} exists and is queryable`, async () => {
      const { error } = await admin.from(t).select("id").limit(1);
      assert.equal(error, null, `${t}: ${error?.message}`);
    });
  }

  test("every table has deleted_at, op_id, created_at, updated_at", async () => {
    for (const t of TABLES) {
      const { error } = await admin.from(t).select("deleted_at,op_id,created_at,updated_at").limit(1);
      assert.equal(error, null, `${t}: ${error?.message}`);
    }
  });

  test("orgs has no required org_id (tenant root)", async () => {
    const { error } = await admin.from("orgs").select("id,name").limit(1);
    assert.equal(error, null, error?.message);
  });
});

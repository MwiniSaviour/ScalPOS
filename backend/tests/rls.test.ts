import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const skip = !URL || !SERVICE || !ANON;

describe("RLS multi-tenant isolation", { skip }, () => {
  const admin = createClient(URL!, SERVICE!);
  let orgA: string;
  let orgB: string;
  let userA: { id: string; email: string; password: string };
  let userB: { id: string; email: string; password: string };
  let cashier: { id: string; email: string; password: string };
  let clientA: ReturnType<typeof createClient>;
  let clientB: ReturnType<typeof createClient>;
  let clientCashier: ReturnType<typeof createClient>;

  before(async () => {
    const stamp = Date.now();
    const mkUser = async (label: string) => {
      const email = `rls-${label}-${stamp}@example.com`;
      const password = `Pw-${stamp}-${label}!`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error || !data.user) throw new Error(error?.message ?? "user create failed");
      return { id: data.user.id, email, password };
    };

    userA = await mkUser("a");
    userB = await mkUser("b");
    cashier = await mkUser("cashier");

    const { data: oA, error: eA } = await admin
      .from("orgs")
      .insert({ name: "Org A" })
      .select("id")
      .single();
    if (eA || !oA) throw new Error(eA?.message);
    orgA = oA.id;

    const { data: oB, error: eB } = await admin
      .from("orgs")
      .insert({ name: "Org B" })
      .select("id")
      .single();
    if (eB || !oB) throw new Error(eB?.message);
    orgB = oB.id;

    await admin.from("memberships").insert([
      { org_id: orgA, user_id: userA.id, role: "owner" },
      { org_id: orgB, user_id: userB.id, role: "owner" },
      { org_id: orgA, user_id: cashier.id, role: "cashier" },
    ]);
    await admin.from("settings").insert([{ org_id: orgA }, { org_id: orgB }]);

    // product in org A
    await admin.from("products").insert({ org_id: orgA, name: "Widget A", price: 10 });

    const signIn = async (u: { email: string; password: string }) => {
      const c = createClient(URL!, ANON!);
      const { error } = await c.auth.signInWithPassword({ email: u.email, password: u.password });
      if (error) throw new Error(error.message);
      return c;
    };
    clientA = await signIn(userA);
    clientB = await signIn(userB);
    clientCashier = await signIn(cashier);
  });

  after(async () => {
    // best-effort cleanup
    await admin.from("products").delete().in("org_id", [orgA, orgB]);
    await admin.from("settings").delete().in("org_id", [orgA, orgB]);
    await admin.from("memberships").delete().in("org_id", [orgA, orgB]);
    await admin.from("orgs").delete().in("id", [orgA, orgB]);
    for (const u of [userA, userB, cashier]) {
      await admin.auth.admin.deleteUser(u.id);
    }
  });

  test("user A cannot read org B products", async () => {
    const { data, error } = await clientA.from("products").select("*").eq("org_id", orgB);
    assert.equal(error, null);
    assert.deepEqual(data, []);
  });

  test("user B cannot read org A products", async () => {
    const { data, error } = await clientB.from("products").select("*").eq("org_id", orgA);
    assert.equal(error, null);
    assert.deepEqual(data, []);
  });

  test("cashier cannot insert products", async () => {
    const { error } = await clientCashier
      .from("products")
      .insert({ org_id: orgA, name: "Nope", price: 1 });
    assert.ok(error, "expected insert to be blocked");
  });

  test("cashier cannot update products", async () => {
    const { data: rows } = await admin.from("products").select("id").eq("org_id", orgA).limit(1);
    const pid = rows![0].id;
    const { error } = await clientCashier.from("products").update({ price: 999 }).eq("id", pid);
    // RLS filters row -> no rows updated; supabase returns no error but 0 rows. Check price unchanged.
    const { data: after } = await admin.from("products").select("price").eq("id", pid).single();
    assert.equal(Number(after!.price), 10);
    // error may be null; that's acceptable (RLS silently filters). Ensure not updated.
    void error;
  });

  test("soft delete works via UPDATE deleted_at", async () => {
    const { data: rows } = await admin.from("products").select("id").eq("org_id", orgA).limit(1);
    const pid = rows![0].id;
    const { error } = await clientA.from("products").update({ deleted_at: new Date().toISOString() }).eq("id", pid);
    assert.equal(error, null, error?.message);
    // row still exists (soft delete)
    const { data: still } = await admin.from("products").select("id,deleted_at").eq("id", pid).single();
    assert.ok(still!.deleted_at);
  });

  test("hard delete is blocked", async () => {
    const { data: rows } = await admin.from("products").select("id").eq("org_id", orgA).limit(1);
    const pid = rows![0].id;
    const { error } = await clientA.from("products").delete().eq("id", pid);
    // Either error or zero rows; verify row still exists
    const { data: still } = await admin.from("products").select("id").eq("id", pid).maybeSingle();
    assert.ok(still, "hard delete should not remove row");
    void error;
  });
});

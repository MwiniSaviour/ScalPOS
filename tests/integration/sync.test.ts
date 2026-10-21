import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const skipEnv = !URL || !SERVICE || !ANON;

let hasFakeIdb = false;
try {
  await import("fake-indexeddb/auto");
  hasFakeIdb = typeof (globalThis as { indexedDB?: unknown }).indexedDB !== "undefined";
} catch {
  hasFakeIdb = false;
}

type OutboxModule = typeof import("../../lib/sync/outbox");
let outboxModule: OutboxModule | null = null;
if (hasFakeIdb) {
  outboxModule = await import("../../lib/sync/outbox");
}

type SbClient = ReturnType<typeof createClient>;

describe("sync integration (multi-user)", { skip: skipEnv }, () => {
  const admin = createClient(URL!, SERVICE!);
  let orgId = "";
  const userA = { id: "", email: "", password: "" };
  const userB = { id: "", email: "", password: "" };
  let clientA!: SbClient;
  let clientB!: SbClient;
  let productId = "";

  before(async () => {
    const stamp = Date.now();
    const mkUser = async (label: string) => {
      const email = `sync-${label}-${stamp}@example.com`;
      const password = `Pw-${stamp}-${label}!`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error || !data.user) throw new Error(error?.message ?? "user create failed");
      return { id: data.user.id, email, password };
    };
    const a = await mkUser("a");
    const b = await mkUser("b");
    userA.id = a.id;
    userA.email = a.email;
    userA.password = a.password;
    userB.id = b.id;
    userB.email = b.email;
    userB.password = b.password;

    const { data: o, error: oe } = await admin
      .from("orgs")
      .insert({ name: "Sync Org" })
      .select("id")
      .single();
    if (oe || !o) throw new Error(oe?.message ?? "org create failed");
    orgId = (o as { id: string }).id;

    await admin.from("memberships").insert([
      { org_id: orgId, user_id: userA.id, role: "owner" },
      { org_id: orgId, user_id: userB.id, role: "owner" },
    ]);
    await admin.from("settings").insert({ org_id: orgId });

    const signIn = async (u: { email: string; password: string }) => {
      const c = createClient(URL!, ANON!);
      const { error } = await c.auth.signInWithPassword({ email: u.email, password: u.password });
      if (error) throw new Error(error.message);
      return c;
    };
    clientA = await signIn(userA);
    clientB = await signIn(userB);
  });

  after(async () => {
    if (productId) await admin.from("products").delete().eq("id", productId);
    if (orgId) {
      await admin.from("settings").delete().eq("org_id", orgId);
      await admin.from("memberships").delete().eq("org_id", orgId);
      await admin.from("orgs").delete().eq("id", orgId);
    }
    for (const u of [userA, userB]) {
      if (u.id) await admin.auth.admin.deleteUser(u.id);
    }
  });

  test("A inserts product via REST; B pulls and sees it", async () => {
    const { data, error } = await clientA
      .from("products")
      .insert({ org_id: orgId, name: "SyncWidget", price: 5 })
      .select("id")
      .single();
    assert.equal(error, null, error?.message);
    productId = (data as { id: string }).id;

    const { data: rows, error: e2 } = await clientB
      .from("products")
      .select("id,name")
      .eq("org_id", orgId);
    assert.equal(e2, null, e2?.message);
    assert.ok(
      Array.isArray(rows) && rows.some((r: { id: string }) => r.id === productId),
      "B should see A's product",
    );
  });

  test("A soft-deletes; B sees deleted_at set", async () => {
    const { error } = await clientA
      .from("products")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", productId);
    assert.equal(error, null, error?.message);

    const { data, error: e2 } = await clientB
      .from("products")
      .select("deleted_at")
      .eq("id", productId)
      .single();
    assert.equal(e2, null, e2?.message);
    assert.ok((data as { deleted_at: string | null }).deleted_at, "deleted_at should be set");
  });
});

describe("offline outbox", { skip: hasFakeIdb ? false : "fake-indexeddb not installed; skipping IndexedDB-dependent assertions" }, () => {
  test("enqueue while offline, then drain applies ops", async () => {
    const om = outboxModule!;
    await om.clear();
    await om.enqueue({
      op_id: "op-offline-1",
      table: "products",
      kind: "upsert",
      row: { id: "p-offline", name: "Offline" },
      created_at: Date.now(),
    });
    const before = await om.peek();
    assert.equal(before.length, 1, "op should be queued while offline");

    const res = await om.drain(async () => {
      return;
    });
    assert.equal(res.applied, 1, "drain should apply one op");
    assert.equal(res.failed.length, 0, "no failures expected");
    const after = await om.peek();
    assert.equal(after.length, 0, "queue should be empty after drain");
  });
});

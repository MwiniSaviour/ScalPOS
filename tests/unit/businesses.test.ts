import test from "node:test";
import assert from "node:assert/strict";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  clear(): void {
    this.data.clear();
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  get length(): number {
    return this.data.size;
  }
}

const storage = new MemoryStorage();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: storage,
  location: { reload: () => {} },
};

function blob(name: string, businessType: string): string {
  return JSON.stringify({
    state: {
      settings: { shopName: name, businessType },
      products: [{ id: `p_${name}`, name: `${name} product` }],
      financeEntries: [{ id: `f_${name}`, note: `${name} entry` }],
    },
    version: 0,
  });
}

test("switching businesses preserves each app's data and email", async () => {
  storage.clear();
  const { readRegistry, createBusiness, switchBusiness } = await import("../../lib/businesses.ts");

  storage.setItem("nova-pos-v1", blob("Retail", "retail"));
  storage.setItem(
    "nova-pos-sync-v1",
    JSON.stringify({ org_id: "org1", user_id: "u1", access_token: "t1", email: "retail@example.com" }),
  );

  readRegistry();
  const personal = createBusiness({ name: "Personal", businessType: "personal", email: "personal@example.com" });

  const activeAfterCreate = JSON.parse(storage.getItem("nova-pos-v1")!);
  assert.equal(activeAfterCreate.state.settings.businessType, "personal");

  storage.setItem("nova-pos-v1", blob("Personal", "personal"));
  storage.setItem(
    "nova-pos-sync-v1",
    JSON.stringify({ org_id: "org2", user_id: "u2", access_token: "t2", email: "personal@example.com" }),
  );

  switchBusiness("primary");

  const retail = JSON.parse(storage.getItem("nova-pos-v1")!);
  const retailConn = JSON.parse(storage.getItem("nova-pos-sync-v1")!);
  assert.equal(retail.state.settings.businessType, "retail");
  assert.equal(retail.state.products[0].name, "Retail product");
  assert.equal(retailConn.email, "retail@example.com");

  switchBusiness(personal.id);

  const back = JSON.parse(storage.getItem("nova-pos-v1")!);
  const backConn = JSON.parse(storage.getItem("nova-pos-sync-v1")!);
  assert.equal(back.state.settings.businessType, "personal");
  assert.equal(back.state.financeEntries[0].note, "Personal entry");
  assert.equal(backConn.email, "personal@example.com");
});

test("repeated switching keeps both business snapshots intact", async () => {
  storage.clear();
  const { readRegistry, createBusiness, switchBusiness, updateBusinessEmail } =
    await import("../../lib/businesses.ts");

  storage.setItem("nova-pos-v1", blob("Shop", "retail"));
  readRegistry();
  const personal = createBusiness({ name: "Personal", businessType: "personal", email: "" });

  const snapshots = () => ({
    shop: JSON.parse(storage.getItem("nova-pos-v1:primary")!),
    personal: JSON.parse(storage.getItem(`nova-pos-v1:${personal.id}`)!),
  });

  for (let i = 0; i < 3; i++) {
    storage.setItem("nova-pos-v1", blob(`Personal edit ${i}`, "personal"));
    switchBusiness("primary");
    assert.equal(
      JSON.parse(storage.getItem("nova-pos-v1")!).state.settings.businessType,
      "retail",
    );
    storage.setItem("nova-pos-v1", blob(`Shop edit ${i}`, "retail"));
    switchBusiness(personal.id);
    assert.equal(
      JSON.parse(storage.getItem("nova-pos-v1")!).state.settings.businessType,
      "personal",
    );
    assert.equal(snapshots().shop.state.settings.shopName, `Shop edit ${i}`);
    assert.equal(
      JSON.parse(storage.getItem("nova-pos-v1")!).state.settings.shopName,
      `Personal edit ${i}`,
    );
  }

  storage.setItem(
    "nova-pos-sync-v1",
    JSON.stringify({ org_id: "org2", user_id: "u2", access_token: "t2", email: "old@example.com" }),
  );
  updateBusinessEmail(personal.id, "saved@example.com");
  switchBusiness("primary");
  switchBusiness(personal.id);
  assert.equal(JSON.parse(storage.getItem("nova-pos-sync-v1")!).email, "saved@example.com");
});

test("editing another business's email keeps its own org and token", async () => {
  storage.clear();
  const { readRegistry, createBusiness, switchBusiness, updateBusinessEmail } =
    await import("../../lib/businesses.ts");

  storage.setItem("nova-pos-v1", blob("Retail", "retail"));
  storage.setItem(
    "nova-pos-sync-v1",
    JSON.stringify({ org_id: "org-retail", user_id: "u1", access_token: "tok-retail", email: "r@x.com" }),
  );
  readRegistry();
  const personal = createBusiness({ name: "Personal", businessType: "personal", email: "" });
  switchBusiness(personal.id);
  storage.setItem(
    "nova-pos-sync-v1",
    JSON.stringify({ org_id: "org-personal", user_id: "u2", access_token: "tok-personal", email: "p@x.com" }),
  );
  switchBusiness("primary");

  updateBusinessEmail(personal.id, "new@x.com");
  switchBusiness(personal.id);

  const conn = JSON.parse(storage.getItem("nova-pos-sync-v1")!);
  assert.equal(conn.org_id, "org-personal");
  assert.equal(conn.access_token, "tok-personal");
  assert.equal(conn.email, "new@x.com");
});

test("signing out a business is preserved across switches", async () => {
  storage.clear();
  const { readRegistry, createBusiness, switchBusiness } =
    await import("../../lib/businesses.ts");

  storage.setItem("nova-pos-v1", blob("Retail", "retail"));
  storage.setItem(
    "nova-pos-sync-v1",
    JSON.stringify({ org_id: "org1", user_id: "u1", access_token: "t1", email: "r@x.com" }),
  );
  readRegistry();
  const personal = createBusiness({ name: "Personal", businessType: "personal", email: "" });
  switchBusiness(personal.id);

  storage.removeItem("nova-pos-sync-v1");
  switchBusiness("primary");
  switchBusiness(personal.id);

  assert.equal(storage.getItem("nova-pos-sync-v1"), null);
});

test("removing an existing sync connection is preserved across switches", async () => {
  storage.clear();
  const { readRegistry, createBusiness, switchBusiness } =
    await import("../../lib/businesses.ts");

  storage.setItem("nova-pos-v1", blob("Retail", "retail"));
  storage.setItem(
    "nova-pos-sync-v1",
    JSON.stringify({ org_id: "org1", user_id: "u1", access_token: "t1", email: "r@x.com" }),
  );
  readRegistry();
  const personal = createBusiness({ name: "Personal", businessType: "personal", email: "p@x.com" });

  switchBusiness(personal.id);
  storage.setItem(
    "nova-pos-sync-v1",
    JSON.stringify({ org_id: "org2", user_id: "u2", access_token: "t2", email: "p@x.com" }),
  );
  switchBusiness("primary");
  switchBusiness(personal.id);

  storage.removeItem("nova-pos-sync-v1");
  switchBusiness("primary");
  switchBusiness(personal.id);

  assert.equal(storage.getItem("nova-pos-sync-v1"), null);
});

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  commissionOf,
  creditPrice,
  creditsOf,
  isServiceLine,
  primaryStaffOf,
  restoreCredits,
  spendCredits,
  voidCredits,
} from "../../lib/salon.ts";
import type { Customer, OrderItem } from "../../lib/types.ts";
import type { Staff } from "../../lib/staff.ts";

const staff = (id: string, pct?: number): Staff =>
  ({ id, name: id, role: "stylist", active: true, ...(pct !== undefined ? { commissionPct: pct } : {}) });

const cust = (credits?: { packageId: string; remaining: number }[]): Customer =>
  ({ id: "c1", name: "Ama", ...(credits ? { packageCredits: credits } : {}) });

const line = (over: Partial<OrderItem> = {}): OrderItem =>
  ({
    productId: "p1",
    name: "Braids",
    qty: 1,
    price: 100,
    ...over,
  });

describe("creditsOf", () => {
  test("sums every entry of the package", () => {
    assert.equal(creditsOf(cust([{ packageId: "pka", remaining: 2 }, { packageId: "pka", remaining: 3 }]), "pka"), 5);
  });

  test("ignores other packages and clamps negatives", () => {
    assert.equal(creditsOf(cust([{ packageId: "pka", remaining: 2 }, { packageId: "pkb", remaining: 9 }]), "pka"), 2);
    assert.equal(creditsOf(cust([{ packageId: "pka", remaining: -4 }]), "pka"), 0);
  });

  test("no customer or no credits means zero", () => {
    assert.equal(creditsOf(null, "pka"), 0);
    assert.equal(creditsOf(cust(), "pka"), 0);
  });
});

describe("spendCredits", () => {
  test("spends from the oldest entry first", () => {
    const out = spendCredits(
      [{ packageId: "pka", remaining: 1 }, { packageId: "pka", remaining: 3 }],
      new Map([["pka", 2]]),
    );
    assert.deepEqual(out, [{ packageId: "pka", remaining: 0 }, { packageId: "pka", remaining: 2 }]);
  });

  test("never goes below zero — over-spend is ignored", () => {
    const out = spendCredits([{ packageId: "pka", remaining: 1 }], new Map([["pka", 5]]));
    assert.deepEqual(out, [{ packageId: "pka", remaining: 0 }]);
  });

  test("leaves untouched packages and entries alone", () => {
    const entries = [{ packageId: "pka", remaining: 2 }, { packageId: "pkb", remaining: 4 }];
    const out = spendCredits(entries, new Map([["pkb", 1]]));
    assert.deepEqual(out, [{ packageId: "pka", remaining: 2 }, { packageId: "pkb", remaining: 3 }]);
  });
});

describe("restoreCredits", () => {
  test("returns credits to the same package entry", () => {
    const out = restoreCredits([{ packageId: "pka", remaining: 1 }], new Map([["pka", 2]]));
    assert.deepEqual(out, [{ packageId: "pka", remaining: 3 }]);
  });

  test("recreates an entry when the package was fully consumed", () => {
    const out = restoreCredits([{ packageId: "pkb", remaining: 0 }], new Map([["pka", 2]]));
    assert.deepEqual(out, [
      { packageId: "pkb", remaining: 0 },
      { packageId: "pka", remaining: 2 },
    ]);
  });

  test("ignores zero restores and does not mutate the input", () => {
    const entries = [{ packageId: "pka", remaining: 1 }];
    const out = restoreCredits(entries, new Map([["pka", 0]]));
    assert.deepEqual(out, [{ packageId: "pka", remaining: 1 }]);
    assert.deepEqual(entries, [{ packageId: "pka", remaining: 1 }]);
  });
});

describe("voidCredits", () => {
  test("zeroes only the refunded package — spent credits stay spent", () => {
    const out = voidCredits(
      [{ packageId: "pka", remaining: 2 }, { packageId: "pkb", remaining: 4 }],
      "pka",
    );
    assert.deepEqual(out, [{ packageId: "pka", remaining: 0 }, { packageId: "pkb", remaining: 4 }]);
  });
});

describe("primaryStaffOf", () => {
  test("the staff who served most lines owns the visit", () => {
    assert.equal(
      primaryStaffOf([line({ serviceStaffId: "s1" }), line({ serviceStaffId: "s2", qty: 3 })]),
      "s2",
    );
  });

  test("ties go to the first one seen", () => {
    assert.equal(
      primaryStaffOf([line({ serviceStaffId: "s1" }), line({ serviceStaffId: "s2" })]),
      "s1",
    );
  });

  test("product lines without staff are skipped", () => {
    assert.equal(primaryStaffOf([line(), line()]), undefined);
  });
});

describe("commissionOf", () => {
  test("pays on the whole line (price × qty)", () => {
    assert.equal(commissionOf({ price: 100, qty: 2, serviceStaffId: "s1" }, [staff("s1", 10)]), 20);
  });

  test("no staff or no rate means nothing", () => {
    assert.equal(commissionOf({ price: 100, qty: 2 }, [staff("s1", 10)]), 0);
    assert.equal(commissionOf({ price: 100, qty: 2, serviceStaffId: "s1" }, [staff("s1")]), 0);
    assert.equal(commissionOf({ price: 100, qty: 2, serviceStaffId: "s1" }, []), 0);
  });

  test("rounds to two decimals", () => {
    assert.equal(commissionOf({ price: 33.33, qty: 1, serviceStaffId: "s1" }, [staff("s1", 15)]), 5.0);
    assert.equal(commissionOf({ price: 19.99, qty: 1, serviceStaffId: "s1" }, [staff("s1", 12.5)]), 2.5);
  });
});

describe("creditPrice", () => {
  test("a full credit prices the line at zero", () => {
    assert.equal(creditPrice(100, 1, 1), 0);
  });

  test("no credit keeps the normal price", () => {
    assert.equal(creditPrice(100, 1, 0), 100);
  });

  test("a partial credit prices the uncovered units", () => {
    assert.equal(creditPrice(100, 4, 1), 75);
  });
});

describe("isServiceLine", () => {
  test("only the kind snapshot counts", () => {
    assert.equal(isServiceLine(line({ kind: "service" })), true);
    assert.equal(isServiceLine(line()), false);
    assert.equal(isServiceLine(line({ serviceStaffId: "s1" })), false);
  });
});

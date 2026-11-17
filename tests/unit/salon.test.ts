import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  commissionOf,
  commissionReport,
  creditAwareUnitPrices,
  creditPrice,
  creditValueOf,
  creditsOf,
  isServiceLine,
  lineLabels,
  packageContents,
  primaryStaffOf,
  restoreCredits,
  spendCredits,
  staffInitials,
  voidCredits,
  voidCreditsFrom,
} from "../../lib/salon.ts";
import type { Customer, Order, OrderItem } from "../../lib/types.ts";
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

describe("voidCreditsFrom", () => {
  const entries = [
    { packageId: "pka", remaining: 3, sourceOrderId: "o1" },
    { packageId: "pka", remaining: 4, sourceOrderId: "o2" },
    { packageId: "pkb", remaining: 1, sourceOrderId: "o2" },
  ];

  test("refunding one purchase keeps the other's credits", () => {
    assert.deepEqual(voidCreditsFrom(entries, "pka", "o2"), [
      { packageId: "pka", remaining: 3, sourceOrderId: "o1" },
      { packageId: "pka", remaining: 0, sourceOrderId: "o2" },
      { packageId: "pkb", remaining: 1, sourceOrderId: "o2" },
    ]);
  });

  test("other packages are untouched", () => {
    assert.deepEqual(voidCreditsFrom(entries, "pkb", "o2"), [
      { packageId: "pka", remaining: 3, sourceOrderId: "o1" },
      { packageId: "pka", remaining: 4, sourceOrderId: "o2" },
      { packageId: "pkb", remaining: 0, sourceOrderId: "o2" },
    ]);
  });

  test("an order older than the bookkeeping voids the whole package", () => {
    assert.deepEqual(voidCreditsFrom(entries, "pka", "o9"), [
      { packageId: "pka", remaining: 0, sourceOrderId: "o1" },
      { packageId: "pka", remaining: 0, sourceOrderId: "o2" },
      { packageId: "pkb", remaining: 1, sourceOrderId: "o2" },
    ]);
    assert.deepEqual(voidCreditsFrom(entries, "pka", undefined), [
      { packageId: "pka", remaining: 0, sourceOrderId: "o1" },
      { packageId: "pka", remaining: 0, sourceOrderId: "o2" },
      { packageId: "pkb", remaining: 1, sourceOrderId: "o2" },
    ]);
  });

  test("spent credits stay spent — only the balance is zeroed", () => {
    const spent = [{ packageId: "pka", remaining: 0, sourceOrderId: "o2" }];
    assert.deepEqual(voidCreditsFrom(spent, "pka", "o2"), spent);
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

describe("creditAwareUnitPrices", () => {
  test("a plain line keeps its price", () => {
    const out = creditAwareUnitPrices([{ qty: 2, normalPrice: 100 }], cust());
    assert.deepEqual(out, [100]);
  });

  test("a covered credit line prices at zero", () => {
    const out = creditAwareUnitPrices(
      [{ qty: 1, useCredit: true, packageId: "pka", normalPrice: 100 }],
      cust([{ packageId: "pka", remaining: 3 }]),
    );
    assert.deepEqual(out, [0]);
  });

  test("credits beyond the line are not wasted on it", () => {
    const out = creditAwareUnitPrices(
      [{ qty: 1, useCredit: true, packageId: "pka", normalPrice: 100 }],
      cust([{ packageId: "pka", remaining: 3 }]),
    );
    assert.deepEqual(out, [0]);
  });

  test("the uncovered part of a line is priced normally", () => {
    const out = creditAwareUnitPrices(
      [{ qty: 4, useCredit: true, packageId: "pka", normalPrice: 100 }],
      cust([{ packageId: "pka", remaining: 1 }]),
    );
    assert.deepEqual(out, [75]);
  });

  test("two credit lines never claim the same credit", () => {
    const out = creditAwareUnitPrices(
      [
        { qty: 2, useCredit: true, packageId: "pka", normalPrice: 100 },
        { qty: 1, useCredit: true, packageId: "pka", normalPrice: 100 },
      ],
      cust([{ packageId: "pka", remaining: 2 }]),
    );
    assert.deepEqual(out, [0, 100]);
  });

  test("without a client or a package the line is priced normally", () => {
    const out = creditAwareUnitPrices(
      [
        { qty: 1, useCredit: true, packageId: "pka", normalPrice: 100 },
        { qty: 1, useCredit: true, normalPrice: 80 },
      ],
      cust([{ packageId: "pka", remaining: 3 }]),
    );
    assert.deepEqual(out, [0, 80]);
    assert.deepEqual(
      creditAwareUnitPrices([{ qty: 1, useCredit: true, packageId: "pka", normalPrice: 100 }], null),
      [100],
    );
  });

  test("a line price override wins over the shelf price", () => {
    const out = creditAwareUnitPrices([{ qty: 1, price: 60, normalPrice: 100 }], cust());
    assert.deepEqual(out, [60]);
  });
});

describe("staffInitials", () => {
  test("a first and a last name give two letters", () => {
    assert.equal(staffInitials("Akua Mensah"), "AM");
  });

  test("a single name gives its first two letters", () => {
    assert.equal(staffInitials("Nana"), "NA");
  });

  test("an empty name gives nothing", () => {
    assert.equal(staffInitials("   "), "");
  });
});

describe("creditValueOf", () => {
  test("a credited line is worth the catalogue price of the covered units", () => {
    assert.equal(creditValueOf({ useCredit: true, creditedQty: 2 }, 70), 140);
  });

  test("a line paid for normally has no credit value", () => {
    assert.equal(creditValueOf({ creditedQty: 2 }, 70), 0);
    assert.equal(creditValueOf({ useCredit: true }, 70), 0);
  });
});

describe("packageContents", () => {
  test("a package lists what it holds", () => {
    assert.equal(
      packageContents(
        { credits: [{ productId: "p_mani", qty: 4 }, { productId: "p_trim", qty: 1 }] },
        [
          { id: "p_mani", name: "Manicure" },
          { id: "p_trim", name: "Cut & Trim" },
        ],
      ),
      "4 × Manicure, 1 × Cut & Trim",
    );
  });

  test("a deleted service still shows up", () => {
    assert.equal(packageContents({ credits: [{ productId: "gone", qty: 2 }] }, []), "2 × Service");
  });
});

describe("lineLabels", () => {
  const ctx = {
    staff: [{ id: "s1", name: "Akua Mensah" }],
    packages: [{ id: "pk1", credits: [{ productId: "p_mani", qty: 4 }] }],
    products: [{ id: "p_mani", name: "Manicure" }],
  };

  test("a service line names its stylist", () => {
    const labels = lineLabels(
      { productId: "p_mani", name: "Manicure", qty: 1, price: 70, kind: "service", serviceStaffId: "s1" },
      ctx,
    );
    assert.equal(labels.staffInitials, "AM");
    assert.equal(labels.credit, false);
  });

  test("a credit line is tagged as credit", () => {
    const labels = lineLabels(
      {
        productId: "p_mani",
        name: "Manicure",
        qty: 1,
        price: 0,
        kind: "service",
        serviceStaffId: "s1",
        useCredit: true,
        creditedQty: 1,
        packageId: "pk1",
      },
      ctx,
    );
    assert.equal(labels.credit, true);
    assert.equal(labels.staffInitials, "AM");
    assert.equal(labels.packageSummary, undefined);
  });

  test("a package purchase lists what it holds", () => {
    const labels = lineLabels(
      { productId: "pk1", name: "Nails ×4", qty: 1, price: 280, packageId: "pk1" },
      ctx,
    );
    assert.equal(labels.packageSummary, "4 × Manicure");
  });
});

describe("commissionReport", () => {
  const order = (id: string, items: OrderItem[], createdAt = 1): Order =>
    ({
      id,
      items,
      customerId: null,
      subtotal: 0,
      discount: 0,
      total: 0,
      status: "completed",
      payments: [],
      payStatus: "paid",
      createdAt,
      completedAt: createdAt,
    }) as Order;

  const staffList = [
    { id: "s1", name: "Akua Mensah" },
    { id: "s2", name: "Nana Yaa" },
  ];
  const products = [
    { id: "p_mani", price: 70 },
    { id: "p_trim", price: 60 },
  ];

  test("counts visits, revenue, credit value and commission per stylist", () => {
    const report = commissionReport(
      [
        order("o1", [
          { productId: "p_mani", name: "Manicure", qty: 1, price: 70, kind: "service", serviceStaffId: "s1", commissionAmt: 17.5 },
          { productId: "p_trim", name: "Cut & Trim", qty: 1, price: 60, kind: "service", serviceStaffId: "s2", commissionAmt: 12 },
        ]),
        order("o2", [
          { productId: "p_mani", name: "Manicure", qty: 1, price: 70, kind: "service", serviceStaffId: "s1", commissionAmt: 17.5 },
        ]),
      ],
      staffList,
      products,
    );
    assert.equal(report.rows.length, 2);
    const akua = report.rows.find((r) => r.staffId === "s1");
    assert.equal(akua?.visits, 2);
    assert.equal(akua?.revenue, 140);
    assert.equal(akua?.commission, 35);
    assert.equal(report.totals.commission, 47);
  });

  test("a credited line counts the value the credits covered", () => {
    const report = commissionReport(
      [
        order("o1", [
          {
            productId: "p_mani",
            name: "Manicure",
            qty: 1,
            price: 0,
            kind: "service",
            serviceStaffId: "s1",
            useCredit: true,
            creditedQty: 1,
            commissionAmt: 0,
          },
        ]),
      ],
      staffList,
      products,
    );
    assert.equal(report.rows[0].revenue, 0);
    assert.equal(report.rows[0].creditValue, 70);
  });

  test("a refunded order earns nothing", () => {
    const refunded = {
      ...order("o1", [
        { productId: "p_mani", name: "Manicure", qty: 1, price: 70, kind: "service", serviceStaffId: "s1", commissionAmt: 17.5 },
      ]),
      status: "refunded" as const,
    };
    const report = commissionReport([refunded], staffList, products);
    assert.equal(report.rows.length, 0);
    assert.equal(report.totals.commission, 0);
  });

  test("a line without a stylist earns nothing", () => {
    const report = commissionReport(
      [order("o1", [{ productId: "p_mani", name: "Manicure", qty: 1, price: 70, kind: "service" }])],
      staffList,
      products,
    );
    assert.equal(report.rows.length, 0);
  });
});

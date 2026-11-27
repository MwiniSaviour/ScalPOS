import test from "node:test";
import assert from "node:assert/strict";
import { crumbsForPath } from "../../apps/desktop/src/lib/breadcrumbs.ts";

test("dashboard is a single plain crumb", () => {
  assert.deepEqual(crumbsForPath("/dashboard"), [{ label: "Dashboard" }]);
});

test("desktop list page shows Dashboard as a link", () => {
  assert.deepEqual(crumbsForPath("/dashboard/products"), [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Products" },
  ]);
});

test("desktop dynamic route includes parent and current crumb", () => {
  assert.deepEqual(crumbsForPath("/dashboard/customers/c_1"), [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Customers", href: "/dashboard/customers" },
    { label: "Customer detail" },
  ]);
});

test("query strings and trailing slashes are ignored", () => {
  assert.deepEqual(crumbsForPath("/dashboard/orders/?status=paid"), [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Orders" },
  ]);
});

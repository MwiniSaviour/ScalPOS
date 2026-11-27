import test from "node:test";
import assert from "node:assert/strict";
import { crumbsForPath } from "../../lib/breadcrumbs.ts";

test("home is a single plain crumb", () => {
  assert.deepEqual(crumbsForPath("/home"), [{ label: "Home" }]);
});

test("list page shows Home as a link and the page as current", () => {
  assert.deepEqual(crumbsForPath("/inventory"), [
    { label: "Home", href: "/home" },
    { label: "Inventory" },
  ]);
});

test("detail page includes the parent list link", () => {
  assert.deepEqual(crumbsForPath("/inventory/detail?id=p_1"), [
    { label: "Home", href: "/home" },
    { label: "Inventory", href: "/inventory" },
    { label: "Product detail" },
  ]);
});

test("query strings and trailing slashes are ignored", () => {
  assert.deepEqual(crumbsForPath("/orders/detail/?id=ORD-1"), [
    { label: "Home", href: "/home" },
    { label: "Orders", href: "/orders" },
    { label: "Order detail" },
  ]);
});

test("static export .html URLs map like clean paths", () => {
  assert.deepEqual(crumbsForPath("/inventory/detail.html?id=p1"), [
    { label: "Home", href: "/home" },
    { label: "Inventory", href: "/inventory" },
    { label: "Product detail" },
  ]);
});

test("unknown paths fall back to a plain Home crumb", () => {
  assert.deepEqual(crumbsForPath("/not-a-page"), [{ label: "Home" }]);
});

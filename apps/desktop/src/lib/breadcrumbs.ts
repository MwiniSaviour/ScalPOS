export type Crumb = { label: string; href?: string };

const LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/products": "Products",
  "/dashboard/categories": "Categories",
  "/dashboard/customers": "Customers",
  "/dashboard/orders": "Orders",
  "/dashboard/pos": "POS",
  "/dashboard/analytics": "Analytics",
  "/dashboard/appointments": "Appointments",
  "/dashboard/kitchen": "Kitchen",
  "/dashboard/packages": "Packages",
  "/dashboard/suppliers": "Suppliers",
  "/dashboard/purchase-orders": "Purchase orders",
  "/dashboard/employees": "Employees",
  "/dashboard/billing": "Billing",
  "/dashboard/billing/callback": "Billing callback",
  "/dashboard/billing/pay": "Payment",
  "/dashboard/more": "More",
};

const DYNAMIC: { pattern: RegExp; parent: string; label: string }[] = [
  { pattern: /^\/dashboard\/customers\/[^/]+$/, parent: "/dashboard/customers", label: "Customer detail" },
  { pattern: /^\/dashboard\/orders\/[^/]+$/, parent: "/dashboard/orders", label: "Order detail" },
];

export function crumbsForPath(pathname: string): Crumb[] {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/dashboard";
  const dashboard: Crumb = { label: "Dashboard", href: "/dashboard" };
  if (path === "/dashboard") return [{ label: "Dashboard" }];

  const exact = LABELS[path];
  if (exact) return [dashboard, { label: exact }];

  const dynamic = DYNAMIC.find((entry) => entry.pattern.test(path));
  if (dynamic) {
    return [
      dashboard,
      { label: LABELS[dynamic.parent] ?? "Back", href: dynamic.parent },
      { label: dynamic.label },
    ];
  }
  return [dashboard, { label: "Page" }];
}

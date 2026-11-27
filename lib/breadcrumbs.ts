export type Crumb = { label: string; href?: string };

const LABELS: Record<string, string> = {
  "/": "Home",
  "/home": "Home",
  "/sell": "Sell",
  "/pay": "Payment",
  "/inventory": "Inventory",
  "/inventory/detail": "Product detail",
  "/inventory/edit": "Product editor",
  "/categories": "Categories",
  "/customers": "Customers",
  "/customers/detail": "Customer detail",
  "/orders": "Orders",
  "/orders/detail": "Order detail",
  "/reports": "Reports",
  "/settings": "Settings",
  "/settings/shop": "Shop settings",
  "/more": "More",
  "/notifications": "Notifications",
  "/billing": "Plans & billing",
  "/connect": "Connect",
  "/account": "Account",
  "/staff": "Staff",
  "/packages": "Packages",
  "/appointments": "Appointments",
  "/kitchen": "Kitchen",
  "/stock": "Stock history",
  "/security": "Security",
  "/backup": "Backup",
  "/conflicts": "Conflicts",
  "/onboarding": "Setup",
  "/shop/create": "Create shop",
  "/auth": "Sign in",
  "/auth/code": "Sign in",
  "/auth/callback": "Sign in",
  "/paystack/pay": "Payment",
  "/paystack/callback": "Payment",
  "/pin": "PIN",
  "/pin/forgot": "Reset PIN",
  "/data-deletion": "Data deletion",
  "/legal": "Legal",
};

const PARENTS: Record<string, string> = {
  "/inventory/detail": "/inventory",
  "/inventory/edit": "/inventory",
  "/customers/detail": "/customers",
  "/orders/detail": "/orders",
  "/settings/shop": "/settings",
  "/pin/forgot": "/pin",
  "/paystack/pay": "/pay",
  "/paystack/callback": "/pay",
};

export function crumbsForPath(pathname: string): Crumb[] {
  const path = pathname.split(/[?#]/)[0].replace(/\.html$/, "").replace(/\/+$/, "") || "/";
  const label = LABELS[path];
  if (!label) return [{ label: "Home" }];
  if (path === "/" || path === "/home") return [{ label: "Home" }];

  const parent = PARENTS[path];
  const home: Crumb = { label: "Home", href: "/home" };
  if (!parent) return [home, { label }];
  return [home, { label: LABELS[parent] ?? "Back", href: parent }, { label }];
}

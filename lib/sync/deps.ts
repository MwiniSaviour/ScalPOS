export const DEPS: Record<string, string[]> = {
  orgs: [],
  memberships: ["orgs"],
  categories: [],
  products: ["categories"],
  product_batches: ["products"],
  recipes: ["products"],
  restaurant_tables: [],
  customers: [],
  orders: ["customers"],
  order_items: ["orders", "products"],
  stock_moves: ["products", "orders", "product_batches"],
  settings: [],
  staff: [],
  appointments: ["customers", "staff"],
  packages: [],
  suppliers: [],
  purchase_orders: ["products", "suppliers"],
};

export function computeRanks(): Record<string, number> {
  const rank: Record<string, number> = {};
  const visiting = new Set<string>();
  function visit(t: string): number {
    if (Object.prototype.hasOwnProperty.call(rank, t)) return rank[t];
    if (visiting.has(t)) return 0;
    visiting.add(t);
    const deps = DEPS[t] ?? [];
    const r = deps.length ? Math.max(...deps.map(visit)) + 1 : 0;
    visiting.delete(t);
    rank[t] = r;
    return r;
  }
  for (const t of Object.keys(DEPS)) visit(t);
  return rank;
}

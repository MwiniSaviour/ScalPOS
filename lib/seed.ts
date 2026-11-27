import type {
  Appointment,
  Batch,
  BusinessType,
  Category,
  Customer,
  Order,
  Package,
  Product,
  Recipe,
  RestaurantTable,
  Settings,
  StockMove,
} from "./types";
import type { Staff } from "./staff";
import { salonSeed } from "./seeds/salon";
import { pharmacySeed } from "./seeds/pharmacy";
import { restaurantSeed } from "./seeds/restaurant";
import { retailSeed } from "./seeds/retail";
import type { SeedBundle } from "./seeds/shared";

export function defaultSettings(businessType: BusinessType = "retail"): Settings {
  const now = Date.now();
  return {
    businessType,
    shopName: "My Shop",
    address: "",
    phone: "",
    ownerId: "Owner",
    momoNumber: "",
    momoNetwork: "",
    taxInclusive: true,
    taxRate: 0,
    receiptFooter: "",
    theme: "dark",
    nextOrderNo: 1,
    createdAt: now,
  };
}

export type DemoState = {
  settings: Settings;
  categories: Category[];
  products: Product[];
  customers: Customer[];
  orders: Order[];
  stockMoves: StockMove[];
  batches: Batch[];
  recipes: Recipe[];
  tables: RestaurantTable[];
  staff: Staff[];
  appointments: Appointment[];
  packages: Package[];
  financeCategories: [];
  financeEntries: [];
  financeBudgets: [];
  financeGoals: [];
  financeSources: [];
  cart: [];
  cartCustomerId: null;
  cartDiscount: number;
  cartUpdatedAt: number;
};

/**
 * The demo shops, one per business type. A shop that sells medicine needs
 * batches and expiry dates; a shop that serves food needs a kitchen, tables
 * and recipes; a salon needs stylists, the book and packages — so each
 * business type gets the shop it actually runs.
 */
const SEEDS: Partial<Record<BusinessType, (now: number) => SeedBundle>> = {
  retail: retailSeed,
  pharmacy: pharmacySeed,
  restaurant: restaurantSeed,
  salon: salonSeed,
};

/** The business types that have a demo shop of their own. */
export function demoBusinessTypes(): BusinessType[] {
  return Object.keys(SEEDS) as BusinessType[];
}

/** A ready-to-load demo shop for one business type. */
export function demoData(businessType: BusinessType = "retail"): DemoState {
  const now = Date.now();
  const build = SEEDS[businessType] ?? retailSeed;
  const bundle = build(now);
  return {
    ...bundle,
    financeCategories: [],
    financeEntries: [],
    financeBudgets: [],
    financeGoals: [],
    financeSources: [],
    cart: [],
    cartCustomerId: null,
    cartDiscount: 0,
    cartUpdatedAt: 0,
  };
}

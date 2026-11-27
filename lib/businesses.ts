"use client";

import { defaultSettings } from "./seed";
import type { BusinessType } from "./types";

export const DEFAULT_BUSINESS_ID = "primary";
const REGISTRY_KEY = "nova-pos-businesses-v1";

export type BusinessSubscription = {
  status: "trialing" | "active" | "locked" | "none";
  plan: "standard" | "enterprise" | null;
  expiresAt: number | null;
};

export type BusinessProfile = {
  id: string;
  name: string;
  businessType: BusinessType;
  email: string;
  color: string;
  createdAt: number;
  subscription: BusinessSubscription | null;
};

export type BusinessRegistry = {
  activeId: string;
  businesses: BusinessProfile[];
};

const MANAGED_KEYS = [
  "nova-pos-v1",
  "nova-pos-sync-v1",
  "nova-pos-entitlement-v1",
  "nova-pos-trial-start",
  "nova-pos-idmap-v1",
  "nova-pos-first-push-v1",
  "nova-pos-last-pull",
] as const;

function parse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function settingsFromStore(): { name: string; businessType: BusinessType } {
  const state = parse<{ state?: { settings?: { shopName?: string; businessType?: BusinessType } } }>(
    window.localStorage.getItem("nova-pos-v1"),
  );
  return {
    name: state?.state?.settings?.shopName?.trim() || "My Business",
    businessType: state?.state?.settings?.businessType ?? "retail",
  };
}

function emailFromSync(): string {
  const conn = parse<{ email?: string }>(window.localStorage.getItem("nova-pos-sync-v1"));
  return conn?.email?.trim() ?? "";
}

export function readRegistry(): BusinessRegistry {
  if (typeof window === "undefined") {
    return {
      activeId: DEFAULT_BUSINESS_ID,
      businesses: [{ id: DEFAULT_BUSINESS_ID, name: "My Business", businessType: "retail", email: "", color: "#4c8dff", createdAt: 0, subscription: null }],
    };
  }
  const existing = parse<BusinessRegistry>(window.localStorage.getItem(REGISTRY_KEY));
  if (existing?.activeId && existing.businesses?.length) return existing;
  const info = settingsFromStore();
  const initial: BusinessRegistry = {
    activeId: DEFAULT_BUSINESS_ID,
    businesses: [
      {
        id: DEFAULT_BUSINESS_ID,
        name: info.name,
        businessType: info.businessType,
        email: emailFromSync(),
        color: "#4c8dff",
        createdAt: Date.now(),
        subscription: null,
      },
    ],
  };
  window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(initial));
  return initial;
}

export function activeId(): string {
  try {
    return readRegistry().activeId;
  } catch {
    return DEFAULT_BUSINESS_ID;
  }
}

export function businessKey(key: string, id = activeId()): string {
  if (typeof window === "undefined" || id === DEFAULT_BUSINESS_ID) return key;
  return `${key}:${id}`;
}

export function listBusinesses(): BusinessProfile[] {
  return readRegistry().businesses;
}

export function getBusiness(id: string): BusinessProfile | null {
  return readRegistry().businesses.find((row) => row.id === id) ?? null;
}

function writeRegistry(registry: BusinessRegistry): void {
  window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

function copyKey(base: string, from: string, to: string): void {
  const source = businessKey(base, from);
  const target = businessKey(base, to);
  const value = window.localStorage.getItem(source);
  if (value === null) window.localStorage.removeItem(target);
  else window.localStorage.setItem(target, value);
}

function emptyData(name: string, businessType: BusinessType): string {
  const settings = { ...defaultSettings(businessType), shopName: name };
  return JSON.stringify({
    state: {
      products: [],
      categories: [],
      orders: [],
      customers: [],
      stockMoves: [],
      batches: [],
      recipes: [],
      tables: [],
      staff: [],
      currentStaffId: null,
      appointments: [],
      packages: [],
      suppliers: [],
      purchaseOrders: [],
      financeCategories: [],
      financeEntries: [],
      financeBudgets: [],
      financeGoals: [],
      financeSources: [],
      settings,
      cart: [],
      cartCustomerId: null,
      cartDiscount: 0,
      cartUpdatedAt: 0,
      cartOrderType: null,
      cartTableId: null,
      cartTabOrderId: null,
    },
    version: 0,
  });
}

function install(id: string): void {
  for (const key of MANAGED_KEYS) copyKey(key, id, DEFAULT_BUSINESS_ID);
}

function preserve(id: string): void {
  for (const key of MANAGED_KEYS) copyKey(key, DEFAULT_BUSINESS_ID, id);
}

export function createBusiness(input: {
  name: string;
  businessType: BusinessType;
  email: string;
}): BusinessProfile {
  const registry = readRegistry();
  preserve(registry.activeId);
  const id = `biz_${Date.now().toString(36)}`;
  const business: BusinessProfile = {
    id,
    name: input.name.trim() || "My Business",
    businessType: input.businessType,
    email: input.email.trim(),
    color: "#a78bfa",
    createdAt: Date.now(),
    subscription: { status: "trialing", plan: null, expiresAt: null },
  };
  window.localStorage.setItem(businessKey("nova-pos-v1", id), emptyData(business.name, business.businessType));
  window.localStorage.setItem(
    businessKey("nova-pos-trial-start", id),
    String(Date.now()),
  );
  writeRegistry({ activeId: id, businesses: [...registry.businesses, business] });
  install(id);
  window.location.reload();
  return business;
}

export function switchBusiness(id: string): void {
  const registry = readRegistry();
  if (!registry.businesses.some((row) => row.id === id) || id === registry.activeId) return;
  preserve(registry.activeId);
  writeRegistry({ ...registry, activeId: id });
  install(id);
  window.location.reload();
}

export function updateBusinessEmail(id: string, email: string): void {
  const registry = readRegistry();
  writeRegistry({
    ...registry,
    businesses: registry.businesses.map((row) =>
      row.id === id ? { ...row, email: email.trim() } : row,
    ),
  });
  if (id === registry.activeId) {
    const conn = parse<Record<string, unknown>>(
      window.localStorage.getItem("nova-pos-sync-v1"),
    );
    if (conn) {
      window.localStorage.setItem(
        "nova-pos-sync-v1",
        JSON.stringify({ ...conn, email: email.trim() }),
      );
    }
  }
}

export function updateBusinessSubscription(id: string, subscription: BusinessSubscription): void {
  const registry = readRegistry();
  writeRegistry({
    ...registry,
    businesses: registry.businesses.map((row) =>
      row.id === id ? { ...row, subscription } : row,
    ),
  });
}

export function removeBusiness(id: string): void {
  const registry = readRegistry();
  if (registry.businesses.length < 2 || id === DEFAULT_BUSINESS_ID) return;
  const next = registry.businesses.filter((row) => row.id !== id);
  for (const key of MANAGED_KEYS) window.localStorage.removeItem(businessKey(key, id));
  writeRegistry({
    activeId: registry.activeId === id ? DEFAULT_BUSINESS_ID : registry.activeId,
    businesses: next,
  });
  if (registry.activeId === id) {
    install(DEFAULT_BUSINESS_ID);
    window.location.reload();
  }
}

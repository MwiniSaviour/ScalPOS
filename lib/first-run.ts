import { useSyncExternalStore } from "react";

const ONBOARD_KEY = "nova-pos-onboarded";
const STORE_KEY = "nova-pos-v1";
const ONBOARD_EVENT = "nova-pos-onboarded-change";

type PersistedShop = {
  products?: unknown[];
  categories?: unknown[];
  customers?: unknown[];
  orders?: unknown[];
  stockMoves?: unknown[];
  settings?: {
    shopName?: unknown;
    ownerId?: unknown;
    phone?: unknown;
    address?: unknown;
    momoNumber?: unknown;
  };
};

/**
 * Android restores WebView storage from cloud backup on reinstall. That can
 * leave the "onboarded" flag behind while the shop rows are gone, which used
 * to skip setup and drop the user into an empty register. Only treat the
 * device as onboarded when the persisted store still holds a real shop.
 */
function shopDataExists(): boolean {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return false;
    const state = (JSON.parse(raw) as { state?: PersistedShop })?.state;
    if (!state) return false;
    const hasRows = [state.products, state.categories, state.customers, state.orders, state.stockMoves].some(
      (list) => Array.isArray(list) && list.length > 0,
    );
    if (hasRows) return true;
    const s = state.settings ?? {};
    return (
      (typeof s.shopName === "string" && s.shopName.trim() !== "" && s.shopName !== "My Shop") ||
      (typeof s.ownerId === "string" && s.ownerId.trim() !== "" && s.ownerId !== "Owner") ||
      (typeof s.phone === "string" && s.phone.trim() !== "") ||
      (typeof s.address === "string" && s.address.trim() !== "") ||
      (typeof s.momoNumber === "string" && s.momoNumber.trim() !== "")
    );
  } catch {
    return false;
  }
}

export function hasOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.localStorage.getItem(ONBOARD_KEY) !== "1") return false;
    return shopDataExists();
  } catch {
    return true;
  }
}

export function markOnboarded(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARD_KEY, "1");
    window.dispatchEvent(new Event(ONBOARD_EVENT));
  } catch {}
}

function subscribeOnboarded(cb: () => void): () => void {
  window.addEventListener("storage", cb);
  window.addEventListener(ONBOARD_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(ONBOARD_EVENT, cb);
  };
}

function onboardedSnapshot(): boolean {
  return hasOnboarded();
}

/** React-safe onboarded flag: server snapshot is "not onboarded" so the
 * static prerender renders the form; the gate resolves after hydration. */
export function useHasOnboarded(): boolean {
  return useSyncExternalStore(subscribeOnboarded, onboardedSnapshot, () => false);
}

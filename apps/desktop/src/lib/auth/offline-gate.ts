import { readConnection } from "@pos/api/bootstrap";
import { shouldUseLocalOnly } from "./local-mode";

export function desktopHasLocalShop(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("nova-pos-onboarded") === "1";
  } catch {
    return false;
  }
}

export function desktopCanBootLocally(): boolean {
  return desktopHasLocalShop();
}

export function desktopLocalMode(): boolean {
  return shouldUseLocalOnly(desktopHasLocalShop(), readConnection());
}

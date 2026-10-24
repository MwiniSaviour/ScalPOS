import type { Settings } from "./types";

export function defaultSettings(): Settings {
  const now = Date.now();
  return {
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

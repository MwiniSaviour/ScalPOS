import { Capacitor, registerPlugin } from "@capacitor/core";

export type PrinterDevice = {
  name: string;
  address: string;
};

type ListResult = {
  enabled: boolean;
  devices: (PrinterDevice & { isThermal?: boolean })[];
};

type BluetoothPrintPlugin = {
  listPaired(): Promise<ListResult>;
  print(o: { address: string; data: string }): Promise<void>;
};

const BluetoothPrint = registerPlugin<BluetoothPrintPlugin>("BluetoothPrint", {
  web: () => ({
    listPaired: async () => {
      throw new Error("Bluetooth printing is available in the Android app");
    },
    print: async () => {
      throw new Error("Bluetooth printing is available in the Android app");
    },
  }),
});

export function bluetoothAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export async function listPaired(): Promise<PrinterDevice[]> {
  const result = await BluetoothPrint.listPaired();
  if (!result.enabled) return [];
  return result.devices.map((d) => ({ name: d.name, address: d.address }));
}

export async function printRaw(address: string, bytes: Uint8Array): Promise<void> {
  await BluetoothPrint.print({ address, data: base64Of(bytes) });
}

function base64Of(bytes: Uint8Array): string {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(out);
}

const PRINTER_KEY = "nova-pos-printer";

export function getSavedPrinter(): PrinterDevice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PRINTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.address === "string") {
      return { name: String(parsed.name ?? parsed.address), address: parsed.address };
    }
  } catch {}
  return null;
}

export function savePrinter(p: PrinterDevice): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRINTER_KEY, JSON.stringify(p));
  } catch {}
}

export function clearSavedPrinter(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PRINTER_KEY);
  } catch {}
}

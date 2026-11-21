import { Capacitor, registerPlugin } from "@capacitor/core";

export type HidState = {
  supported: boolean;
  registered: boolean;
  connected: boolean;
  name: string | null;
};

type BluetoothHid = {
  isSupported(): Promise<{ supported: boolean }>;
  register(): Promise<{ registered: boolean }>;
  connect(o: { address: string }): Promise<void>;
  disconnect(): Promise<void>;
  getState(): Promise<HidState>;
  sendText(o: { text: string }): Promise<{ sent: number }>;
  addListener(
    eventName: "stateChange",
    listenerFunc: (state: Partial<HidState>) => void,
  ): Promise<{ remove: () => void }>;
};

const plugin = registerPlugin<BluetoothHid>("BluetoothHid", {
  web: () => ({
    isSupported: async () => ({ supported: false }),
    register: async () => {
      throw new Error("Bluetooth HID is available in the Android app");
    },
    connect: async () => {
      throw new Error("Bluetooth HID is available in the Android app");
    },
    disconnect: async () => {},
    getState: async () => ({
      supported: false,
      registered: false,
      connected: false,
      name: null,
    }),
    sendText: async () => {
      throw new Error("Bluetooth HID is available in the Android app");
    },
    addListener: async () => ({ remove: () => {} }),
  }),
});

export function hidAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export function hidSupported(): Promise<boolean> {
  if (!hidAvailable()) return Promise.resolve(false);
  return plugin
    .isSupported()
    .then((r) => r.supported)
    .catch(() => false);
}

export function hidState(): Promise<HidState> {
  if (!hidAvailable()) {
    return Promise.resolve({
      supported: false,
      registered: false,
      connected: false,
      name: null,
    });
  }
  return plugin.getState();
}

export async function registerHid(): Promise<void> {
  await plugin.register();
}

export async function connectHid(address: string): Promise<void> {
  await plugin.connect({ address });
}

export async function disconnectHid(): Promise<void> {
  await plugin.disconnect();
}

export async function sendHidBarcode(code: string): Promise<void> {
  await plugin.sendText({ text: code });
}

export function onHidStateChange(cb: (state: Partial<HidState>) => void) {
  if (!hidAvailable()) return Promise.resolve({ remove: () => {} });
  return plugin.addListener("stateChange", cb);
}

const DESKTOP_KEY = "nova-pos-hid-desktop";

export function getSavedDesktop() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DESKTOP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.address === "string") {
      return { name: String(parsed.name ?? parsed.address), address: parsed.address };
    }
  } catch {}
  return null;
}

export function saveDesktop(device: { name: string; address: string }) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DESKTOP_KEY, JSON.stringify(device));
  } catch {}
}

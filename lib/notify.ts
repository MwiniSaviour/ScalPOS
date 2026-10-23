import { Capacitor, registerPlugin } from "@capacitor/core";

type NovaAlertsPluginShape = {
  show(o: { title: string; body: string; id?: number }): Promise<{ shown: boolean; granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
};

const NovaAlerts = registerPlugin<NovaAlertsPluginShape>("NovaAlerts");

const DEDUPE_KEY = "nova-pos-alerts-shown";

function dayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function shownToday(key: string): boolean {
  try {
    const map = JSON.parse(localStorage.getItem(DEDUPE_KEY) ?? "{}") as Record<string, string>;
    return map[key] === dayStamp();
  } catch {
    return false;
  }
}

function markShown(key: string): void {
  if (!key) return;
  try {
    const map = JSON.parse(localStorage.getItem(DEDUPE_KEY) ?? "{}") as Record<string, string>;
    map[key] = dayStamp();
    for (const k of Object.keys(map)) {
      if (map[k] !== dayStamp()) delete map[k];
    }
    localStorage.setItem(DEDUPE_KEY, JSON.stringify(map));
  } catch {
    /* dedupe state is best effort */
  }
}

export async function hasAlertPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    return (await NovaAlerts.requestPermission()).granted;
  } catch {
    return false;
  }
}

export async function notifyLocal(title: string, body: string, dedupeKey = ""): Promise<void> {
  if (!title || !body) return;
  if (dedupeKey && shownToday(dedupeKey)) return;
  markShown(dedupeKey);
  if (!Capacitor.isNativePlatform()) return;
  try {
    await NovaAlerts.show({ title, body });
  } catch {
    if (await hasAlertPermission()) {
      try {
        await NovaAlerts.show({ title, body });
      } catch {
        /* alert is best effort */
      }
    }
  }
}

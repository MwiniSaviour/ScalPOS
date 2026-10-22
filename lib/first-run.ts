const ONBOARD_KEY = "nova-pos-onboarded";

export function hasOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(ONBOARD_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboarded(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARD_KEY, "1");
  } catch {}
}

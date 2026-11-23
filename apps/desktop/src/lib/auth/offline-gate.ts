export function desktopCanBootLocally(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("nova-pos-onboarded") === "1";
  } catch {
    return false;
  }
}

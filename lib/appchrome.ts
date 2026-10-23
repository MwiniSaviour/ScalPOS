import { Capacitor, registerPlugin } from "@capacitor/core";

/** local Android plugin that paints the window chrome (bar zones + decor) */
const AppChrome = registerPlugin<{
  setBarBackgroundColor(o: { color: string }): Promise<void>;
  openUrl(o: { url: string }): Promise<void>;
}>("AppChrome");

export const appChrome = {
  async setBarBackgroundColor(o: { color: string }): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await AppChrome.setBarBackgroundColor(o);
  },
  async openUrl(o: { url: string }): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      window.open(o.url, "_blank", "noopener");
      return;
    }
    await AppChrome.openUrl(o);
  },
};

import { Capacitor, registerPlugin } from "@capacitor/core";

/** local Android plugin that paints the window chrome (bar zones + decor) */
const AppChrome = registerPlugin<{ setBarBackgroundColor(o: { color: string }): Promise<void> }>(
  "AppChrome",
);

export const appChrome = {
  async setBarBackgroundColor(o: { color: string }): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await AppChrome.setBarBackgroundColor(o);
  },
};

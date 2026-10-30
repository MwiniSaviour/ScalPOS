import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.scalmint.pos",
  appName: "ScalPOS",
  webDir: "out",
  backgroundColor: "#0A0E17",
  plugins: {
    SystemBars: {
      insetsHandling: "native",
    },
  },
};

export default config;

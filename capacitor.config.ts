import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "gg.novapos.app",
  appName: "Nova POS",
  webDir: "out",
  backgroundColor: "#0A0E17",
  plugins: {
    SystemBars: {
      insetsHandling: "native",
    },
  },
};

export default config;

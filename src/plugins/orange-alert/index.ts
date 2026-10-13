import { fileURLToPath } from "node:url";
import type { PluginDescriptor } from "emdash";

export function orangeAlertPlugin(): PluginDescriptor {
  return {
    id: "orange-alert",
    version: "1.0.0",
    entrypoint: fileURLToPath(new URL("./plugin.ts", import.meta.url)),
    options: {},
  };
}

import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${fileURLToPath(new URL("./", import.meta.url))}/` },
      { find: /^react-native$/, replacement: "react-native-web" },
    ],
  },
  test: {
    environment: "node",
  },
});

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./vitest.setup.ts"],
        include: ["**/*.test.{ts,tsx}"],
    },
    oxc: {
        jsx: "automatic",
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
});

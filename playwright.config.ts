import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
  use: { baseURL: "http://localhost:3000" },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
    { name: "iphone-13", use: { ...devices["iPhone 13"], browserName: "webkit" } },
    { name: "pixel-7", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "tablet", use: { browserName: "chromium", viewport: { width: 820, height: 1180 } } },
  ],
});

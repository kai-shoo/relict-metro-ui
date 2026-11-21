import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { browserCommands } from './tests/browser-commands.mjs';

const browser = process.env.METRO_BROWSER || 'chromium';
const executablePath = process.env.METRO_BROWSER_PATH
  || (browser === 'chromium' ? process.env.METRO_CHROMIUM_PATH : undefined);

export default defineConfig({
  optimizeDeps: {
    include: ['lit', 'lit/directives/if-defined.js', 'lit/directives/live.js', 'lit/directives/repeat.js'],
  },
  test: {
    // Several suites exercise clipboard, popups or multi-touch in live browser windows.
    maxWorkers: 1,
    include: ['tests/**/*.browser.test.{ts,js}'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: { executablePath },
        // Keep the entire 980 × 760 test frame inside the headless window for pointer input.
        contextOptions: browser === 'chromium' ? { viewport: { width: 1280, height: 800 } } : {},
      }),
      instances: [{ browser, viewport: { width: 980, height: 760 } }],
      commands: browserCommands,
    },
  },
});

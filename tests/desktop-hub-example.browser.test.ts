import { expect, test } from 'vitest';
import { commands } from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    desktopHubExample(): Promise<Record<string, boolean>>;
  }
}

test('Desktop Hub loads visible help independently and restores the anchor after reflow and Back', async () => {
  expect(await commands.desktopHubExample()).toEqual({
    initiallyDeferred: true, overviewDidNotNavigate: true, cardOpenedWhileLoading: true,
    cardBack: true, retried: true, reflowRestored: true,
  });
}, 15000);

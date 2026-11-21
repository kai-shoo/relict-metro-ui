import { expect, test } from 'vitest';
import { commands } from 'vitest/browser';

test('project navigation resolves Back in order and restores the focused link and scroll', async () => {
  expect(await commands.navigationExample()).toEqual({
    deepLink: true, menuFirst: true, peersReplace: true, restored: true,
    compactMenuFirst: true, compactRestored: true, breadcrumbRestored: true,
  });
});

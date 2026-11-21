import { expect, test } from 'vitest';
import { commands, server } from 'vitest/browser';

test.each([false, true])('Hub → map → place restores the viewport, location denial, and return focus (removed=%s)', async removed => {
  const result = await commands.mapExample(removed);
  expect(result.beforePermission).toBe(0);
  expect(result.requests).toBe(1);
  expect(result.selectedOnMap).toBe('map');
  expect(result.saved.view.longitude).not.toBeCloseTo(-0.095, 5);
  expect(result.saved.view.zoom).toBe(15);
  expect(result.returned.view).toEqual(result.saved.view);
  expect(result.returned.bounds).toEqual(result.saved.bounds);
  expect(result.selected).toBe(removed ? '' : 'library');
  expect(result.section).toBe('nearby');
});

test.skipIf(server.browser !== 'chromium')('emulated touch moves Hub over its preview and pans only the interactive map', async () => {
  const result = await commands.mapExampleTouch();
  expect(result.afterPreview).toBe('hub');
  expect(result.route).toBe('map');
  expect(result.after.zoom).toBe(result.before.zoom);
  expect(result.after.longitude).toBeGreaterThan(result.before.longitude);
});

import { commands } from 'vitest/browser';
import { expect, test } from 'vitest';

const restoredGallery = {
  photoPreserved: true,
  oneVisit: true,
  scrollRestored: true,
  sectionRestored: true,
  menuSynchronized: true,
  captionsFit: true,
};

test('Photos returns keyboard focus and exact feed scroll on browser Back', async () => {
  expect(await commands.photosExample(false)).toEqual(restoredGallery);
}, 15000);

test('Photos transfers an open photo and restores the same card in the desktop layout', async () => {
  expect(await commands.photosExample(true)).toEqual(restoredGallery);
}, 15000);

test('Photos restores the card offset when enlarged captions reflow the feed at the same width', async () => {
  expect(await commands.photosExample(false, true)).toEqual(restoredGallery);
}, 15000);

test.each([320, 390])('Photos switches a %i px gallery to one column when text size doubles', async width => {
  expect(await commands.photosGridAtLargeText(width)).toEqual({
    normal: 2, enlarged: 1, captionFits: true,
  });
}, 15000);

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cdp, commands, page, server, userEvent } from 'vitest/browser';
import '../src/media-player.js';
import '../src/multi-scale-image.js';
import '../src/person-picture.js';
import { sampleRecording } from '../examples/media/sound.js';
import { brokenImage, testImage } from './media/browser-fixture.js';

declare module 'vitest/browser' {
  interface BrowserCommands {
    personPictureLoading(): Promise<{ initialsWhileLoading: boolean; width: number; initials: boolean; label: string }>;
  }
}

const urls: string[] = [];
function recording(seconds = 5) {
  const url = URL.createObjectURL(sampleRecording(seconds));
  urls.push(url);
  return url;
}

beforeEach(() => { document.body.replaceChildren(); });
afterEach(() => {
  document.body.replaceChildren();
  urls.splice(0).forEach(url => URL.revokeObjectURL(url));
  vi.restoreAllMocks();
});

test('MediaPlayer decodes audio, shares native playback state, and preserves position while controls change', async () => {
  const player = document.createElement('metro-media-player');
  player.kind = 'audio';
  player.src = recording(6);
  document.body.append(player);
  const states: typeof player.state[] = [];
  player.addEventListener('metro-media-state', event => states.push(event.detail));
  await expect.poll(() => player.state.duration).toBe(6);
  const media = player.media;
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(() => player.state.playing).toBe(true);
  await expect.poll(() => player.state.position).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect.poll(() => player.state.playing).toBe(false);

  expect(player.seek(3)).toBe(true);
  await expect.poll(() => player.state.position).toBeCloseTo(3);
  await page.getByRole('button', { name: 'Mute', exact: true }).click();
  await expect.element(page.getByRole('button', { name: 'Unmute' })).toBeVisible();
  expect(player.state.muted).toBe(true);

  player.nativeControls = true;
  await player.updateComplete;
  expect(player.media).toBe(media);
  expect(player.media?.controls).toBe(true);
  expect(player.state.position).toBeCloseTo(3);
  expect(states.some(state => state.playing && state.phase === 'ready')).toBe(true);
  expect(states.some(state => state.position > 0)).toBe(true);
});

test('MediaPlayer returns focus to Play when the source no longer supports seeking', async () => {
  const player = document.createElement('metro-media-player');
  player.kind = 'audio';
  player.src = recording(6);
  const after = document.createElement('button');
  after.textContent = 'Next section';
  document.body.append(player, after);

  const seek = page.getByRole('slider');
  const play = page.getByRole('button', { name: 'Play', exact: true });
  await expect.element(seek).toBeEnabled();
  (seek.element() as HTMLElement).focus();
  player.src = '';
  await expect.element(seek).toBeDisabled();
  await expect.poll(() => player.shadowRoot?.activeElement).toBe(play.element());

  after.focus();
  player.src = recording(4);
  await expect.element(seek).toBeEnabled();
  expect(document.activeElement).toBe(after);
  (play.element() as HTMLElement).focus();
  await userEvent.keyboard('{Enter}');
  const pause = page.getByRole('button', { name: 'Pause', exact: true });
  await expect.element(pause).toBeVisible();
  expect(player.shadowRoot?.activeElement).toBe(pause.element());
  player.pause();
});

test.skipIf(!document.fullscreenEnabled)('MediaPlayer returns focus to Play when audio replaces video', async () => {
  const player = document.createElement('metro-media-player');
  player.kind = 'video';
  document.body.append(player);
  const fullscreen = page.getByRole('button', { name: 'Full screen', exact: true });
  await expect.element(fullscreen).toBeVisible();
  (fullscreen.element() as HTMLElement).focus();
  player.kind = 'audio';
  await expect.element(fullscreen).not.toBeInTheDocument();
  const play = page.getByRole('button', { name: 'Play', exact: true });
  await expect.poll(() => player.shadowRoot?.activeElement).toBe(play.element());
});

test('MediaPlayer scales the glyphs with their circular controls on an enlarged phone', async () => {
  const player = document.createElement('metro-media-player');
  player.kind = 'audio';
  player.style.inlineSize = '320px';
  document.body.append(player);
  const size = document.documentElement.style.fontSize;
  document.documentElement.style.fontSize = '200%';
  try {
    const play = page.getByRole('button', { name: 'Play', exact: true });
    await expect.element(play).toBeVisible();
    const controls = player.shadowRoot!.querySelector('[part="controls"]')!;
    for (const button of controls.querySelectorAll('button')) {
      const bounds = button.getBoundingClientRect();
      const icon = button.querySelector('metro-icon')!.getBoundingClientRect();
      expect(bounds.width).toBeCloseTo(bounds.height, 0);
      expect(icon.width / bounds.width).toBeGreaterThan(.4);
      expect(icon.width / bounds.width).toBeLessThan(.6);
      expect(icon.left + icon.width / 2).toBeCloseTo(bounds.left + bounds.width / 2, 0);
      expect(icon.top + icon.height / 2).toBeCloseTo(bounds.top + bounds.height / 2, 0);
    }
    expect(controls.scrollWidth).toBeLessThanOrEqual(controls.clientWidth);
  } finally {
    document.documentElement.style.fontSize = size;
  }
});

test('a changed media source list is loaded on the existing element and a bad source yields an explicit error', async () => {
  const player = document.createElement('metro-media-player');
  player.kind = 'audio';
  player.sources = [{ src: recording(2), type: 'audio/wav' }];
  document.body.append(player);
  await expect.poll(() => player.state.duration).toBe(2);
  const element = player.media;
  player.sources = [{ src: recording(4), type: 'audio/wav' }];
  await expect.poll(() => player.state.duration).toBe(4);
  expect(player.media).toBe(element);

  const errors: string[] = [];
  player.addEventListener('metro-media-error', event => errors.push(event.detail.stage));
  player.src = 'data:audio/wav;base64,bm90IGF1ZGlv';
  await expect.poll(() => player.state.phase).toBe('error');
  expect(errors).toEqual(['source']);
  await expect.element(page.getByRole('status')).toHaveTextContent('Media could not be played');
});

test('a late play failure cannot mark a newer source as failed', async () => {
  const player = document.createElement('metro-media-player');
  player.kind = 'audio';
  const before = recording(2);
  const after = recording(4);
  player.src = before;
  document.body.append(player);
  await expect.poll(() => player.state.duration).toBe(2);
  const media = player.media!;
  const urlsPlayed: string[] = [];
  let rejectPrevious!: (error: Error) => void;
  vi.spyOn(media, 'play').mockImplementationOnce(() => {
    urlsPlayed.push(media.src);
    return new Promise((_, reject) => { rejectPrevious = reject; });
  }).mockImplementationOnce(async () => { urlsPlayed.push(media.src); });
  const errors: string[] = [];
  player.addEventListener('metro-media-error', event => errors.push(event.detail.stage));
  const pending = player.play();
  const rejected = pending.catch(error => error);
  await expect.poll(() => urlsPlayed).toEqual([before]);
  player.src = after;
  await player.play();
  await expect.poll(() => player.state.duration).toBe(4);
  expect(urlsPlayed).toEqual([before, after]);

  const error = new DOMException('Playback denied', 'NotAllowedError');
  rejectPrevious(error);
  expect(await rejected).toBe(error);
  expect(player.state.phase).toBe('ready');
  expect(errors).toEqual([]);
});

test('each exhausted source load publishes one error and a viable fallback recovers', async () => {
  const bad = { src: 'data:audio/wav;base64,bm90IGF1ZGlv', type: 'audio/wav' };
  const player = document.createElement('metro-media-player');
  player.kind = 'audio';
  player.sources = [bad, { src: 'data:audio/wav;base64,YmFk', type: 'audio/wav' }];
  const errors: string[] = [];
  player.addEventListener('metro-media-error', event => errors.push(event.detail.stage));
  document.body.append(player);

  await expect.poll(() => player.state.phase).toBe('error');
  await expect.element(page.getByRole('status')).toHaveTextContent('Media could not be played');
  expect(errors).toEqual(['source']);

  const element = player.media;
  element?.load();
  await expect.poll(() => errors).toEqual(['source', 'source']);
  player.sources = [bad, { src: recording(3), type: 'audio/wav' }];
  await expect.poll(() => player.state.duration).toBe(3);
  expect(player.media).toBe(element);
  expect(player.state.phase).toBe('ready');
  expect(errors).toEqual(['source', 'source']);
});

test('Image exposes dimensions and accessible fallback and a person keeps their name when a portrait fails', async () => {
  const image = document.createElement('metro-image');
  image.src = testImage;
  image.alt = 'Purple swatch';
  image.width = 100;
  image.height = 60;
  const fallback = document.createElement('span');
  fallback.slot = 'fallback';
  fallback.textContent = 'Swatch unavailable';
  image.append(fallback);
  const dimensions: number[][] = [];
  image.addEventListener('metro-image-load', event => dimensions.push([event.detail.width, event.detail.height]));
  document.body.append(image);
  await expect.poll(() => dimensions).toEqual([[300, 180]]);
  await expect.element(page.getByRole('img', { name: 'Purple swatch' })).toBeVisible();
  expect(image.getBoundingClientRect().width).toBe(100);
  image.src = brokenImage;
  await expect.element(page.getByText('Swatch unavailable')).toBeVisible();
  expect(image.getBoundingClientRect().height).toBe(60);
  image.src = testImage;
  await expect.poll(() => dimensions.length).toBe(2);
  await expect.element(page.getByText('Swatch unavailable')).not.toBeVisible();

  const avatar = document.createElement('metro-person-picture');
  avatar.name = 'Ёлка Фомина';
  avatar.src = brokenImage;
  document.body.append(avatar);
  await expect.element(page.getByRole('img', { name: 'Ёлка Фомина' })).toBeVisible();
  await expect.element(page.getByText('ЁФ')).toBeVisible();
});

test('Image shows its alternative text when loading fails without a custom fallback', async () => {
  const image = document.createElement('metro-image');
  image.alt = 'Route photograph';
  image.width = 110;
  image.height = 56;
  image.src = brokenImage;
  document.body.append(image);
  const alternative = page.getByText('Route photograph', { exact: true });
  await expect.element(alternative).toBeVisible();
  await expect.element(page.getByRole('img', { name: 'Route photograph' })).toBeVisible();
  expect(image.getBoundingClientRect().toJSON()).toMatchObject({ width: 110, height: 56 });

  image.src = testImage;
  await expect.poll(() => image.image?.naturalWidth).toBe(300);
  await expect.element(alternative).not.toBeInTheDocument();
  image.src = '';
  await expect.element(alternative).toBeVisible();
});

test.each(['ltr', 'rtl'])('PersonPicture keeps its photo, initials and badge aligned in a compact %s avatar', async direction => {
  document.body.innerHTML = `<style>:root { font-size: 200%; }</style>
    <metro-person-picture dir="${direction}" name="Шура Щукина"
      style="display:block; width:160px; --metro-person-size: 32px">
      <span slot="badge" aria-label="Online" style="display:block; width:8px; height:8px"></span>
    </metro-person-picture>`;
  const avatar = document.querySelector('metro-person-picture')!;
  const picture = page.getByRole('img', { name: 'Шура Щукина' });
  await expect.element(picture).toBeVisible();
  const bounds = picture.element().getBoundingClientRect();
  expect(bounds.toJSON()).toMatchObject({ width: 32, height: 32 });
  const badge = avatar.querySelector('[slot="badge"]')!;
  const badgeBounds = badge.getBoundingClientRect();
  expect(badgeBounds.bottom).toBe(bounds.bottom);
  expect(direction === 'rtl' ? badgeBounds.left : badgeBounds.right).toBe(direction === 'rtl' ? bounds.left : bounds.right);

  function checkInitials() {
    const text = avatar.shadowRoot!.querySelector('[part~="initials"]')!;
    const range = document.createRange();
    range.selectNodeContents(text);
    const glyphs = range.getBoundingClientRect();
    expect(glyphs.left).toBeGreaterThan(bounds.left + 2);
    expect(glyphs.right).toBeLessThan(bounds.right - 2);
    expect((glyphs.left + glyphs.right) / 2).toBeCloseTo((bounds.left + bounds.right) / 2, 0);
  }

  await expect.element(page.getByText('ШЩ', { exact: true })).toBeVisible();
  checkInitials();
  avatar.src = testImage;
  await expect.poll(() => {
    const photo = avatar.shadowRoot?.querySelector('metro-image:not([hidden])');
    return photo?.shadowRoot?.querySelector('img')?.naturalWidth;
  }).toBe(300);
  const photo = avatar.shadowRoot!.querySelector('metro-image')!.image!;
  expect(photo.getBoundingClientRect().toJSON()).toMatchObject({ width: 32, height: 32 });
  expect(getComputedStyle(photo).objectFit).toBe('cover');
  avatar.src = brokenImage;
  await expect.element(page.getByText('ШЩ', { exact: true })).toBeVisible();
  checkInitials();
  await expect.element(picture).toHaveAccessibleName('Шура Щукина');
});

test('PersonPicture shows initials during loading and displays only the current portrait after replacement', async () => {
  expect(await commands.personPictureLoading()).toEqual({
    initialsWhileLoading: true, width: 120, initials: false, label: 'Анна Ветрова',
  });
});

test('the image viewer zooms through buttons and keyboard and restores the scaled view across container resize', async () => {
  const viewer = document.createElement('metro-multi-scale-image');
  viewer.src = testImage;
  viewer.alt = 'Purple card';
  viewer.style.width = '360px';
  document.body.append(viewer);
  const positions: typeof viewer.view[] = [];
  viewer.addEventListener('metro-image-view-change', event => positions.push(event.detail));
  await page.getByRole('button', { name: 'Zoom in' }).click();
  expect(viewer.view.zoom).toBe(1.5);
  const viewport = page.getByRole('region', { name: 'Image viewer' });
  (viewport.element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(viewer.view.x).toBeLessThan(0);
  const selected = viewer.view;
  viewer.style.width = '500px';
  await expect.poll(() => viewport.element().getBoundingClientRect().width).toBe(500);
  expect(viewer.view).toEqual(selected);
  expect(positions).toHaveLength(2);
  viewer.view = { zoom: 3, x: .2, y: .1 };
  await expect.element(page.getByText('300%', { exact: true })).toBeVisible();
  expect(positions).toHaveLength(2);
  await page.getByRole('button', { name: 'Reset zoom' }).click();
  expect(viewer.view).toEqual({ zoom: 1, x: 0, y: 0 });
});

test('keeps a failed photo at normal text size and restores its saved view when the source recovers', async () => {
  const viewer = document.createElement('metro-multi-scale-image');
  viewer.style.width = '240px';
  viewer.src = testImage;
  viewer.alt = 'Lighthouse on the coast';
  viewer.view = { zoom: 3, x: .35, y: .25 };
  const changes = vi.fn();
  viewer.addEventListener('metro-image-view-change', changes);
  document.body.append(viewer);

  const viewport = page.getByRole('region', { name: 'Image viewer' });
  const zoomIn = page.getByRole('button', { name: 'Zoom in' });
  const zoomOut = page.getByRole('button', { name: 'Zoom out' });
  const reset = page.getByRole('button', { name: 'Reset zoom' });
  await expect.element(zoomIn).toBeEnabled();
  (zoomIn.element() as HTMLButtonElement).focus();
  viewer.src = brokenImage;
  await expect.element(page.getByText('Lighthouse on the coast', { exact: true })).toBeVisible();
  await expect.element(zoomIn).toBeDisabled();
  await expect.element(zoomOut).toBeDisabled();
  await expect.element(reset).toBeDisabled();
  await expect.element(page.getByText('300%', { exact: true })).not.toBeInTheDocument();
  expect(viewer.shadowRoot!.activeElement).toBe(viewport.element());
  const fallback = viewer.shadowRoot!.querySelector('metro-image')!.shadowRoot!.querySelector('[part="fallback"]')!;
  expect(fallback.getBoundingClientRect().width).toBeCloseTo(viewport.element().getBoundingClientRect().width, 0);
  await userEvent.keyboard('={ArrowRight}');
  expect(viewer.view).toEqual({ zoom: 3, x: .35, y: .25 });
  expect(changes).not.toHaveBeenCalled();

  viewer.src = testImage;
  await expect.poll(() => viewer.shadowRoot!.querySelector('metro-image')!.image?.naturalWidth).toBe(300);
  await expect.element(page.getByText('300%', { exact: true })).toBeVisible();
  await expect.element(page.getByText('Lighthouse on the coast', { exact: true })).not.toBeInTheDocument();
  await expect.element(zoomIn).toBeEnabled();
  expect(viewer.view).toEqual({ zoom: 3, x: .35, y: .25 });
  expect(viewer.shadowRoot!.activeElement).toBe(viewport.element());
  expect(changes).not.toHaveBeenCalled();
});

test.each(['ltr', 'rtl'])('the %s image viewer keeps zoom controls together at 200% and restores focus at limits', async direction => {
  document.body.innerHTML = `<style>:root { font-size: 200%; }</style>
    <metro-multi-scale-image dir="${direction}" zoom="1.5" max-zoom="2"
      style="width: 257px"></metro-multi-scale-image>`;
  const viewer = document.querySelector('metro-multi-scale-image')!;
  const zoomIn = page.getByRole('button', { name: 'Zoom in' });
  const zoomOut = page.getByRole('button', { name: 'Zoom out' });
  const reset = page.getByRole('button', { name: 'Reset zoom' });
  await expect.element(zoomIn).toBeEnabled();
  const root = viewer.shadowRoot!;
  const bounds = viewer.getBoundingClientRect();
  const output = root.querySelector('output')!;
  const center = (element: Element) => {
    const rect = element.getBoundingClientRect();
    return (rect.top + rect.bottom) / 2;
  };
  expect(Math.abs(center(zoomIn.element()) - center(output))).toBeLessThanOrEqual(1);
  expect(Math.abs(center(zoomOut.element()) - center(output))).toBeLessThanOrEqual(1);
  expect(Math.abs(center(reset.element()) - center(output))).toBeLessThanOrEqual(1);
  for (const control of [zoomIn.element(), zoomOut.element(), output, reset.element()]) {
    const rect = control.getBoundingClientRect();
    expect(rect.left).toBeGreaterThanOrEqual(bounds.left - 1);
    expect(rect.right).toBeLessThanOrEqual(bounds.right + 1);
    if (control !== output) {
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
    }
  }

  const viewport = root.querySelector<HTMLElement>('.viewport')!;
  viewport.focus();
  await userEvent.keyboard('{Tab}{Tab}');
  expect(root.activeElement).toBe(zoomIn.element());
  await userEvent.keyboard('{Enter}');
  await expect.element(zoomIn).toBeDisabled();
  expect(root.activeElement).toBe(viewport);
  expect(getComputedStyle(root.activeElement!, '::after').borderTopWidth).toBe('2px');
  await userEvent.keyboard('-');
  expect(viewer.view.zoom).toBeCloseTo(4 / 3);

  (reset.element() as HTMLElement).focus();
  await userEvent.keyboard(' ');
  await expect.element(reset).toBeDisabled();
  expect(root.activeElement).toBe(viewport);
  expect(viewer.view.zoom).toBe(1);
});

test.each(['view', 'zoom'] as const)('assigning image %s during a pan discards the in-flight gesture', async property => {
  const viewer = document.createElement('metro-multi-scale-image');
  viewer.src = testImage;
  viewer.style.inlineSize = '360px';
  viewer.view = { zoom: 2, x: 0, y: 0 };
  document.body.append(viewer);
  const changes = vi.fn();
  viewer.addEventListener('metro-image-view-change', changes);
  const viewport = page.getByRole('region', { name: 'Image viewer' });
  await expect.element(viewport).toBeVisible();
  const box = viewport.element().getBoundingClientRect();
  const point = { x: box.left + 145, y: box.top + 90 };
  await userEvent.pointer([{ keys: '[MouseLeft>]', coords: point }, { coords: { x: point.x + 40, y: point.y } }]);
  const restored = property === 'view' ? { zoom: 3, x: -.25, y: .25 } : { zoom: 3, x: 0, y: 0 };
  try {
    expect(viewer.view.x).toBeGreaterThan(0);
    if (property === 'view') viewer.view = restored;
    else viewer.zoom = restored.zoom;
    await userEvent.pointer({ coords: { x: point.x + 90, y: point.y } });
  } finally {
    await userEvent.pointer('[/MouseLeft]');
  }
  expect(viewer.view).toEqual(restored);
  await viewer.updateComplete;
  expect(viewer.getAttribute('zoom')).toBe('3');
  expect(changes).not.toHaveBeenCalled();
});

test.each(['shortcut', 'button'] as const)('image viewer commits a zoom %s without carrying over an unfinished pan', async action => {
  const viewer = document.createElement('metro-multi-scale-image');
  viewer.src = testImage;
  viewer.style.inlineSize = '360px';
  viewer.view = { zoom: 2, x: 0, y: 0 };
  document.body.append(viewer);
  const changes = vi.fn();
  viewer.addEventListener('metro-image-view-change', event => changes(event.detail));
  const region = page.getByRole('region', { name: 'Image viewer' });
  await expect.element(region).toBeVisible();
  const viewport = region.element() as HTMLElement;
  const box = viewport.getBoundingClientRect();
  const start = { x: box.left + 140, y: box.top + 80 };
  await userEvent.pointer([{ keys: '[MouseLeft>]', coords: start }, { coords: { x: start.x + 40, y: start.y } }]);
  try {
    expect(viewer.view.x).toBeGreaterThan(0);
    if (action === 'shortcut') {
      viewport.focus();
      await userEvent.keyboard('=');
    } else {
      (page.getByRole('button', { name: 'Zoom in' }).element() as HTMLElement).focus();
      await userEvent.keyboard('{Enter}');
    }
    expect(viewer.view).toEqual({ zoom: 3, x: 0, y: 0 });
    expect(changes).toHaveBeenCalledExactlyOnceWith(viewer.view);
    await userEvent.pointer({ coords: { x: start.x + 80, y: start.y } });
  } finally {
    await userEvent.pointer('[/MouseLeft]');
  }
  expect(viewer.view).toEqual({ zoom: 3, x: 0, y: 0 });
  expect(changes).toHaveBeenCalledTimes(1);
});

test.each(['resize', 'source', 'pointercancel', 'lost capture'] as const)('image viewer rolls back an in-flight pan after %s', async cause => {
  const viewer = document.createElement('metro-multi-scale-image');
  viewer.src = testImage;
  viewer.style.inlineSize = '360px';
  viewer.view = { zoom: 2, x: 0, y: 0 };
  document.body.append(viewer);
  const changes = vi.fn();
  viewer.addEventListener('metro-image-view-change', changes);
  const region = page.getByRole('region', { name: 'Image viewer' });
  await expect.element(region).toBeVisible();
  const viewport = region.element();
  const box = viewport.getBoundingClientRect();
  const start = { x: box.left + 140, y: box.top + 80 };
  let pointer = 0;
  viewport.addEventListener('pointerdown', event => { pointer = event.pointerId; }, { once: true });
  await userEvent.pointer([{ keys: '[MouseLeft>]', coords: start }, { coords: { x: start.x + 40, y: start.y } }]);
  try {
    expect(viewer.view.x).toBeGreaterThan(0);
    expect(viewport.hasPointerCapture(pointer)).toBe(true);
    if (cause === 'resize') viewer.style.inlineSize = '460px';
    else if (cause === 'source') viewer.src = brokenImage;
    else if (cause === 'pointercancel') viewport.dispatchEvent(new PointerEvent('pointercancel', { pointerId: pointer, bubbles: true }));
    else {
      viewport.releasePointerCapture(pointer);
      await userEvent.pointer({ coords: { x: start.x + 50, y: start.y } });
    }
    await expect.poll(() => viewer.view).toEqual({ zoom: 2, x: 0, y: 0 });
    expect(viewport.hasPointerCapture(pointer)).toBe(false);
  } finally {
    await userEvent.pointer('[/MouseLeft]');
  }
  expect(changes).not.toHaveBeenCalled();
});

test.skipIf(server.browser !== 'chromium')(
  'two emulated touches roll back on cancellation and commit the next pinch after release',
  async () => {
    const viewer = document.createElement('metro-multi-scale-image');
    viewer.style.width = '400px';
    viewer.src = testImage;
    document.body.append(viewer);
    const commits: number[] = [];
    viewer.addEventListener('metro-image-view-change', event => commits.push(event.detail.zoom));
    const viewport = page.getByRole('region', { name: 'Image viewer' });
    await expect.element(viewport).toBeVisible();
    const box = viewport.element().getBoundingClientRect();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const touch = (id: number, offset: number) => ({ id, x: Math.round(x + offset), y: Math.round(y) });
    const session = cdp();
    await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
    try {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch(1, -35), touch(2, 35)] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [touch(1, -80), touch(2, 80)] });
      await expect.poll(() => viewer.view.zoom).toBeGreaterThan(1.5);
      expect(commits).toEqual([]);
      await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      await expect.poll(() => viewer.view).toEqual({ zoom: 1, x: 0, y: 0 });
      expect(commits).toEqual([]);
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch(1, -35), touch(2, 35)] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [touch(1, -80), touch(2, 80)] });
      await expect.poll(() => viewer.view.zoom).toBeGreaterThan(1.5);
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.poll(() => commits).toEqual([viewer.view.zoom]);
    } finally {
      await session.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    }
  },
);

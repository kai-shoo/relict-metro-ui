import { afterEach, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import '../src/live-tile.js';
import '../src/hub-tile.js';
import { publishMetroLockScreen, requestMetroSecondaryTile, unpinMetroSecondaryTile, type MetroShellHost } from '../src/shell-host.js';

function fixture(markup: string) {
  const host = document.createElement('div');
  host.dataset.liveTileTest = '';
  host.innerHTML = markup;
  document.body.append(host);
  return host;
}

function wait(interval: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, interval)); }

afterEach(() => document.querySelectorAll('[data-live-tile-test]').forEach(host => host.remove()));

it.each(['metro-live-tile', 'metro-hub-tile'] as const)('honors the native hidden state on %s', async tag => {
  const host = fixture(`<${tag} label="Mail" href="/mail"></${tag}>`);
  const tile = host.querySelector(tag)!;
  const link = page.getByRole('link', { name: 'Mail' });
  await expect.element(link).toBeVisible();
  tile.hidden = true;
  expect(getComputedStyle(tile).display).toBe('none');
  expect(tile.getClientRects()).toHaveLength(0);
  tile.hidden = false;
  await expect.element(link).toBeVisible();
  await expect.element(link).toHaveAttribute('href', '/mail');
});

it('uses the four HubTile sizes from Toolkit and keeps the wide aspect in a narrow container', async () => {
  const host = fixture('<metro-hub-tile label="Journal"></metro-hub-tile>');
  const tile = host.querySelector('metro-hub-tile')!;
  tile.publish({ version: 1, back: { text: 'New entries' } });
  await tile.updateComplete;
  expect(getComputedStyle(tile.shadowRoot!.querySelector('.flip')!).transitionDuration).toBe('0.85s');
  for (const [size, width, height] of [['default', 173, 173], ['small', 99, 99], ['medium', 210, 210], ['large', 432, 210]] as const) {
    tile.size = size;
    await tile.updateComplete;
    await tile.shadowRoot!.querySelector('metro-tile')!.updateComplete;
    const rect = tile.getBoundingClientRect();
    expect(rect.width).toBeCloseTo(width, 0);
    expect(rect.height).toBeCloseTo(height, 0);
  }
  host.style.inlineSize = '180px';
  const rect = tile.getBoundingClientRect();
  expect(rect.width).toBe(180);
  expect(rect.width / rect.height).toBeCloseTo(432 / 210, 2);
});

it('publishes ordered tile snapshots, retains omitted fields and resolves overrides without changing the link', async () => {
  const host = fixture(`<metro-live-tile size="small" mode="iconic" label="Mail" href="/mail" target="_blank" rel="noopener"></metro-live-tile>`);
  const tile = host.querySelector('metro-live-tile')!;
  const front = { title: 'Inbox', iconName: 'mail' as const };
  expect(tile.publish({ version: 1, front, count: 140, status: 'New inbox activity', sizes: {
    wide: { count: 3, front: { title: 'Wide inbox', text: 'New messages', iconName: 'mail' } },
  } })).toBe(true);
  front.title = 'Mutated outside the component';
  const link = page.getByRole('link', { name: 'Mail' });
  await expect.element(link).toHaveAttribute('href', '/mail');
  await expect.element(link).toHaveAttribute('target', '_blank');
  await expect.element(link).toHaveAttribute('rel', 'noopener');
  await expect.element(page.getByRole('status')).toHaveTextContent('New inbox activity');
  expect(tile.shadowRoot!.querySelector('[part="count"]')!.textContent).toBe('99');
  expect(tile.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('Inbox');

  tile.size = 'wide';
  await tile.updateComplete;
  expect(tile.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('Wide inbox');
  expect(tile.shadowRoot!.querySelector('[part="count"]')!.textContent).toBe('3');
  expect(tile.publish({ version: 1, count: 0 })).toBe(false);
  expect(tile.publish({ version: 2, count: null, status: null, sizes: { wide: null } })).toBe(true);
  await tile.updateComplete;
  expect(tile.shadowRoot!.querySelector('[part="count"]')).toBeNull();
  expect(tile.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('Inbox');
  expect(tile.content?.front?.iconName).toBe('mail');
  expect(tile.version).toBe(2);
  await expect.element(link).toHaveAttribute('href', '/mail');
});

it('flips a visible HubTile and preserves its destination and status while explicitly paused', async () => {
  const host = fixture(`<metro-hub-tile label="Recent messages" interval="1000" href="/mail/recent"
    style="--metro-tile-flip-motion: 5s"></metro-hub-tile>`);
  const tile = host.querySelector('metro-hub-tile')!;
  tile.content = { version: 1, front: { title: 'Recent' }, back: { text: 'A new message' }, count: 1 };
  const link = page.getByRole('link', { name: 'Recent messages' });
  await expect.element(link).toBeVisible();
  expect(Math.round(tile.getBoundingClientRect().width)).toBe(173);
  await expect.poll(() => tile.frameIndex, { timeout: 2800 }).toBe(1);
  const flip = tile.shadowRoot!.querySelector('.flip')!;
  expect(flip.hasAttribute('data-back')).toBe(true);
  await expect.poll(() => flip.getAnimations().length).toBe(1);

  tile.paused = true;
  await tile.updateComplete;
  expect(flip.getAnimations()).toHaveLength(0);
  expect(tile.publish({ version: 2, count: 2 })).toBe(true);
  await tile.updateComplete;
  await wait(1200);
  expect(tile.frameIndex).toBe(1);
  await expect.element(link).toHaveAttribute('href', '/mail/recent');
  await expect.element(page.getByRole('status')).toHaveTextContent('2 notifications');
  expect(tile.publish({ version: 3, back: { text: 'A different message' } })).toBe(true);
  await tile.updateComplete;
  expect(tile.frameIndex).toBe(0);
});

it('lets status updates arrive during a cycle and stops the active fade on focus', async () => {
  const host = fixture('<metro-live-tile mode="cycle" interval="1000" label="Albums" href="/albums" target="_blank" rel="noopener" style="--metro-motion: 5s"></metro-live-tile>');
  const tile = host.querySelector('metro-live-tile')!;
  tile.publish({ version: 0, frames: [{ title: 'New albums' }, { title: 'Favorites' }] });
  const link = page.getByRole('link', { name: 'Albums' });
  await expect.element(link).toBeVisible();
  let version = 0;
  const updates = window.setInterval(() => tile.publish({ version: ++version, count: version }), 150);
  try {
    await expect.poll(() => tile.frameIndex, { timeout: 2800 }).toBe(1);
  } finally {
    window.clearInterval(updates);
  }
  expect(version).toBeGreaterThan(0);
  const frame = tile.shadowRoot!.querySelector('.cycle')!;
  expect(frame.getAnimations()).toHaveLength(1);
  tile.focus();
  expect(tile.matches(':focus-within')).toBe(true);
  expect(frame.getAnimations()).toHaveLength(0);
  expect(tile.frameIndex).toBe(1);
  await expect.element(link).toHaveAttribute('target', '_blank');
  await expect.element(link).toHaveAttribute('rel', 'noopener');
});

it('cycles only in view and returns to its first frame under reduced motion', async () => {
  const host = fixture(`<metro-live-tile mode="cycle" label="Albums" interval="1000" style="position:fixed;left:-100vw"></metro-live-tile>`);
  const tile = host.querySelector('metro-live-tile')!;
  tile.publish({ version: 0, frames: [{ title: 'New albums' }, { title: 'Favorites' }] });
  await tile.updateComplete;
  await wait(1150);
  expect(tile.frameIndex).toBe(0);
  tile.style.left = '0';
  await expect.poll(() => tile.frameIndex, { timeout: 2800 }).toBe(1);
  expect(tile.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('Favorites');

  try {
    await commands.setMetroMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => tile.frameIndex).toBe(0);
    const frame = tile.shadowRoot!.querySelector('.cycle')!;
    expect(getComputedStyle(frame).animationName).toBe('none');
    await wait(1150);
    expect(tile.frameIndex).toBe(0);
  } finally {
    await commands.setMetroMedia({ reducedMotion: null });
  }
});

it('only calls opted-in shell capabilities and reports unsupported when absent', async () => {
  const request = { id: 'park', label: 'Route to the park', destination: { href: '/routes', parameters: { id: 'park' } } };
  const update = { role: 'badge' as const, version: 1, count: 0 };
  expect(await requestMetroSecondaryTile(undefined, request)).toBe('unsupported');
  expect(await publishMetroLockScreen(undefined, update)).toBe('unsupported');

  const calls: unknown[] = [];
  const host: MetroShellHost = {
    secondaryTiles: {
      isPinned: () => false,
      requestPin(destination) { calls.push(destination); return 'declined'; },
      requestUnpin(id) { calls.push(id); return 'applied'; },
    },
    lockScreen: { roles: ['badge'], publish(state) { calls.push(state); return 'applied'; } },
  };
  expect(await requestMetroSecondaryTile(host, request)).toBe('declined');
  expect(await unpinMetroSecondaryTile(host, request.id)).toBe('applied');
  expect(await publishMetroLockScreen(host, { role: 'status', version: 1, text: 'Offline' })).toBe('unsupported');
  expect(await publishMetroLockScreen(host, update)).toBe('applied');
  expect(calls).toEqual([request, request.id, update]);
});

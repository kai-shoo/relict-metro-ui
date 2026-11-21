import { afterEach, expect, test, vi } from 'vitest';
import { commands, page, server, userEvent } from 'vitest/browser';
import '../src/info-badge.js';
import '../src/info-bar.js';
import '../src/button.js';
import '../src/progress-bar.js';
import '../src/progress-ring.js';

const container = document.createElement('div');
document.body.append(container);

afterEach(() => container.replaceChildren());

test('linear progress clamps its visual and accessible value within the configured range', async () => {
  container.innerHTML = '<metro-progress-bar label="Export" min="10" max="30" value="20"></metro-progress-bar>';
  const bar = container.querySelector('metro-progress-bar')!;
  const progress = page.getByRole('progressbar', { name: 'Export' });

  await expect.element(progress).toHaveAttribute('aria-valuemin', '10');
  await expect.element(progress).toHaveAttribute('aria-valuemax', '30');
  await expect.element(progress).toHaveAttribute('aria-valuenow', '20');
  expect(bar.shadowRoot?.querySelector<HTMLElement>('[part="fill"]')?.style.inlineSize).toBe('50%');

  bar.value = 80;
  await expect.element(progress).toHaveAttribute('aria-valuenow', '30');
  expect(bar.shadowRoot?.querySelector<HTMLElement>('[part="fill"]')?.style.inlineSize).toBe('100%');

  bar.max = 10;
  bar.value = -1;
  await expect.element(progress).toHaveAttribute('aria-valuemin', '0');
  await expect.element(progress).toHaveAttribute('aria-valuemax', '100');
  await expect.element(progress).toHaveAttribute('aria-valuenow', '0');
});

test('indeterminate progress has no numeric value and a pause or error stops the repeated motion', async () => {
  container.innerHTML = '<metro-progress-bar label="Transfer" indeterminate></metro-progress-bar>';
  const bar = container.querySelector('metro-progress-bar')!;
  const progress = page.getByRole('progressbar', { name: 'Transfer' });

  await expect.element(progress).not.toHaveAttribute('aria-valuenow');
  const indicator = bar.shadowRoot!.querySelector('[part="indicator"]')!;
  const dots = [...indicator.children];
  expect(dots).toHaveLength(5);
  for (const dot of dots) {
    const { width, height } = dot.getBoundingClientRect();
    expect([width, height]).toEqual([4, 4]);
  }
  const animations = dots.map(dot => dot.getAnimations()[0]?.effect?.getTiming());
  expect(animations.map(timing => [timing?.duration, timing?.delay]))
    .toEqual([0, 200, 400, 600, 800].map(delay => [4400, delay]));

  bar.state = 'paused';
  await expect.element(progress).toHaveAttribute('aria-valuetext', 'Paused');
  expect(indicator.getAnimations({ subtree: true })).toHaveLength(0);

  bar.state = 'error';
  bar.valueText = 'Download interrupted';
  await expect.element(progress).toHaveAttribute('aria-valuetext', 'Download interrupted');
  expect(getComputedStyle(bar.shadowRoot!.querySelector('[part="indicator"]')!).display).toBe('none');
});

test('progress ring exposes loading only while active and supports both control sizes', async () => {
  container.innerHTML = '<metro-progress-ring label="Updating" size="small"></metro-progress-ring>';
  const ring = container.querySelector('metro-progress-ring')!;
  const progress = page.getByRole('progressbar', { name: 'Updating' });

  await expect.element(progress).not.toBeInTheDocument();
  ring.active = true;
  await expect.element(progress).toBeVisible();
  await expect.element(progress).not.toHaveAttribute('aria-valuenow');
  const frame = ring.shadowRoot!.querySelector<HTMLElement>('[part="ring"]')!;
  const smallWidth = frame.offsetWidth;
  expect(smallWidth).toBeGreaterThan(0);

  ring.size = 'large';
  await ring.updateComplete;
  expect(frame.offsetWidth).toBeGreaterThan(smallWidth);

  ring.active = false;
  await expect.element(progress).not.toBeInTheDocument();
});

test('paused progress keeps five square dots visible on a short track at double text size', async () => {
  const root = document.documentElement;
  const previousSize = root.style.fontSize;
  root.style.fontSize = '200%';
  try {
    container.innerHTML = `
      <metro-progress-bar label="Waiting" style="inline-size:24px" state="paused" indeterminate></metro-progress-bar>
    `;
    await expect.element(page.getByRole('progressbar', { name: 'Waiting' })).toHaveAttribute('aria-valuetext', 'Paused');
    const track = container.querySelector('metro-progress-bar')!.shadowRoot!.querySelector('[part="track"]')!;
    const bounds = track.getBoundingClientRect();
    const dots = [...track.querySelector('[part="indicator"]')!.children].map(dot => dot.getBoundingClientRect());
    expect(dots).toHaveLength(5);
    for (const dot of dots) {
      expect(dot.width).toBeGreaterThan(1);
      expect(dot.width).toBeCloseTo(dot.height);
      expect(dot.left).toBeGreaterThanOrEqual(bounds.left - .25);
      expect(dot.right).toBeLessThanOrEqual(bounds.right + .25);
      expect(dot.top + dot.height / 2).toBeCloseTo(bounds.top + bounds.height / 2, 0);
    }
  } finally {
    root.style.fontSize = previousSize;
  }
});

test('fits the large ring in a 72 px column at 200% text and scales its Store 8.1 dots', async () => {
  container.innerHTML = '<div style="width:72px"><metro-progress-ring active label="Loading preview"></metro-progress-ring></div>';
  const root = document.documentElement;
  const size = root.style.fontSize;
  const progress = page.getByRole('progressbar', { name: 'Loading preview' });
  try {
    await expect.element(progress).toBeVisible();
    const visual = progress.element() as HTMLElement;
    const arm = visual.firstElementChild!;
    expect(parseFloat(getComputedStyle(visual).inlineSize)).toBeCloseTo(57.5);
    expect(parseFloat(getComputedStyle(arm, '::before').inlineSize)).toBeCloseTo(6.5);
    expect(parseFloat(getComputedStyle(arm, '::before').marginBlockStart)).toBeCloseTo(7.5);
    root.style.fontSize = '200%';
    expect(visual.offsetWidth).toBe(72);
    expect(visual.offsetHeight).toBe(72);
    const dot = getComputedStyle(arm, '::before');
    expect(parseFloat(dot.inlineSize)).toBeCloseTo(72 * 6.5 / 57.5, 1);
    expect(parseFloat(dot.marginBlockStart)).toBeCloseTo(72 * 7.5 / 57.5, 1);
    expect(visual.children).toHaveLength(6);
    for (const animation of visual.getAnimations()) {
      animation.pause();
      animation.currentTime = 225;
    }
    const column = container.firstElementChild!;
    expect(column.scrollWidth).toBe(column.clientWidth);
    await expect.element(progress).not.toHaveAttribute('aria-valuenow');
    container.querySelector('metro-progress-ring')!.active = false;
    await expect.element(progress).not.toBeInTheDocument();
  } finally {
    root.style.fontSize = size;
  }
});

test('reduced motion keeps indeterminate progress visible without starting animation', async () => {
  const markup = `
    <div role="group" aria-label="Transfer indicators"
      style="display:grid;inline-size:280px;gap:12px;padding:12px;background:#111;--metro-color-scheme:dark">
      <metro-progress-bar label="Completed bytes" value="48"></metro-progress-bar>
      <metro-progress-bar label="Paused transfer" state="paused" value="70"></metro-progress-bar>
      <metro-progress-bar label="Failed transfer" state="error"></metro-progress-bar>
      <metro-progress-bar label="Transfer" indeterminate></metro-progress-bar>
      <metro-progress-ring label="Loading" size="small" active></metro-progress-ring>
    </div>
    <metro-progress-bar label="Compact transfer" indeterminate style="inline-size:24px;--metro-progress-thickness:8px"></metro-progress-bar>`;
  expect(await commands.progressReducedMotion(markup)).toEqual({ reduced: true, noPreference: false,
    animationNames: Array(11).fill('none'), dots: 5, arms: 5, visibleDots: 5, compactDots: 5, stationary: true });

  if (server.browser === 'chromium') {
    await commands.setMetroMedia({ reducedMotion: 'reduce', colorScheme: null });
    try {
      container.innerHTML = markup;
      await expect.element(page.getByRole('group', { name: 'Transfer indicators' })).toMatchScreenshot('progress-states');
    } finally {
      await commands.setMetroMedia({ reducedMotion: null, colorScheme: null });
    }
  }
});

test.skipIf(server.browser !== 'chromium')('progress fill, pause and error stay distinct in forced colors', async () => {
  container.innerHTML = `
    <metro-progress-bar label="Bytes" value="50"></metro-progress-bar>
    <metro-progress-ring label="Wait" active></metro-progress-ring>`;
  try {
    await commands.setMetroMedia({ colorScheme: 'dark', forcedColors: 'active', reducedMotion: 'reduce' });
    expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    const bar = container.querySelector('metro-progress-bar')!;
    const progress = page.getByRole('progressbar', { name: 'Bytes' });
    await expect.element(progress).toHaveAttribute('aria-valuenow', '50');
    const track = progress.element();
    const fill = track.querySelector('[part="fill"]')!;
    const canvas = getComputedStyle(track).backgroundColor;
    const accent = getComputedStyle(fill).backgroundColor;
    expect(accent).not.toBe(canvas);
    expect(getComputedStyle(fill).opacity).toBe('1');
    bar.state = 'paused';
    await expect.element(progress).toHaveAttribute('aria-valuetext', 'Paused, 50%');
    expect(getComputedStyle(fill).opacity).toBe('0.5');
    bar.state = 'error';
    await expect.element(progress).toHaveAttribute('aria-valuetext', 'Error, 50%');
    expect(getComputedStyle(fill).display).toBe('none');
    expect(getComputedStyle(track).backgroundColor).not.toBe(canvas);
    expect(getComputedStyle(track).backgroundColor).not.toBe(accent);

    const ring = page.getByRole('progressbar', { name: 'Wait' }).element();
    expect(getComputedStyle(ring.querySelector('.arm')!, '::before').backgroundColor).not.toBe(canvas);
    expect(ring.getAnimations({ subtree: true })).toHaveLength(0);
  } finally {
    await commands.setMetroMedia({ colorScheme: null, forcedColors: null, reducedMotion: null });
  }
});

test('InfoBar exposes status and actions, then dismisses without losing the preceding focus', async () => {
  container.innerHTML = `
    <button id="refresh">Refresh</button>
    <metro-info-bar severity="info" heading="Checking" message="Please wait." dismissible>
      <button slot="action">Retry</button>
    </metro-info-bar>
  `;
  const refresh = container.querySelector<HTMLButtonElement>('#refresh')!;
  const banner = container.querySelector('metro-info-bar')!;
  await expect.element(page.getByRole('status')).toMatchTextContent('Checking');
  await expect.element(page.getByRole('button', { name: 'Retry' })).toBeVisible();

  banner.severity = 'error';
  banner.heading = 'Refresh failed';
  await expect.element(page.getByRole('alert')).toMatchTextContent('Refresh failed');

  const dismissed = vi.fn();
  container.addEventListener('metro-dismiss', dismissed, { once: true });
  banner.addEventListener('metro-dismiss', event => event.preventDefault(), { once: true });
  refresh.focus();
  const close = page.getByRole('button', { name: 'Dismiss' });

  await userEvent.click(close);
  await expect.element(close).toBeVisible();
  expect(banner.open).toBe(true);
  expect(dismissed).toHaveBeenCalledTimes(1);
  expect(dismissed.mock.calls[0][0].detail).toEqual({ reason: 'dismiss-button' });

  await userEvent.click(close);
  await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
  expect(banner.open).toBe(false);
  expect(document.activeElement).toBe(refresh);
});

test('InfoBadge displays a capped count and exposes the actual count or a supplied activity name', async () => {
  container.innerHTML = '<metro-info-badge value="103"></metro-info-badge>';
  const badge = container.querySelector('metro-info-badge')!;

  await expect.element(page.getByRole('img', { name: '103' })).toHaveTextContent('99+');
  badge.value = null;
  badge.label = 'Unread activity';
  await expect.element(page.getByRole('img', { name: 'Unread activity' })).toBeVisible();
  expect(badge.shadowRoot?.querySelector('[part="dot"]')).not.toBeNull();

  badge.innerHTML = '<span slot="icon">!</span>';
  await expect.element(page.getByText('!')).toBeVisible();
});

test('InfoBar keeps long actions inside a narrow banner at 200% text', async () => {
  container.innerHTML = `
    <metro-info-bar style="inline-size: 240px" severity="error" heading="Network unavailable" dismissible>
      <metro-button slot="action">Переподключить синхронизацию</metro-button>
    </metro-info-bar>`;
  const banner = container.querySelector('metro-info-bar')!;
  const action = page.getByRole('button', { name: 'Переподключить синхронизацию' });
  await expect.element(action).toBeVisible();
  const root = document.documentElement;
  const baseSize = root.style.fontSize;
  root.style.fontSize = '200%';
  try {
    const surface = banner.shadowRoot!.querySelector('[part="surface"]')!;
    const bounds = surface.getBoundingClientRect();
    const button = action.element().getBoundingClientRect();
    expect(button.left).toBeGreaterThanOrEqual(bounds.left);
    expect(button.right).toBeLessThanOrEqual(bounds.right);
    expect(surface.scrollWidth).toBeLessThanOrEqual(surface.clientWidth);
  } finally {
    root.style.fontSize = baseSize;
  }
});

test('InfoBar restores focus when the application removes its focused dismiss button', async () => {
  container.innerHTML = `
    <button id="retry">Retry upload</button>
    <metro-info-bar heading="Upload failed" dismissible></metro-info-bar>`;
  const retry = container.querySelector('button')!;
  const banner = container.querySelector('metro-info-bar')!;
  const dismiss = page.getByRole('button', { name: 'Dismiss' });
  await expect.element(dismiss).toBeVisible();
  retry.focus();
  await userEvent.keyboard('{Tab}');
  expect(banner.shadowRoot?.activeElement).toBe(dismiss.element());
  banner.dismissible = false;
  await banner.updateComplete;
  expect(document.activeElement).toBe(retry);
  expect(banner.open).toBe(true);
});

test.each(['ltr', 'rtl'])('InfoBar contains a long native action and its close button at double text size in %s', async direction => {
  const retry = 'Переподключитьсинхронизацию';
  container.innerHTML = `
    <button type="button">Загрузки</button>
    <metro-info-bar dir="${direction}" style="inline-size:320px" severity="error" dismissible
      dismiss-label="Закрыть" heading="Синхронизация"
      message="Проверьте подключение к сети и повторите загрузку.">
      <button slot="action" type="button" style="font:inherit">${retry}</button>
    </metro-info-bar>`;
  const banner = container.querySelector('metro-info-bar')!;
  const action = page.getByRole('button', { name: retry });
  const close = page.getByRole('button', { name: 'Закрыть' });
  const size = document.documentElement.style.fontSize;
  document.documentElement.style.fontSize = '200%';
  try {
    await expect.element(close).toBeVisible();
    await expect.element(page.getByRole('alert')).toMatchTextContent('Проверьте подключение к сети');
    const surface = banner.shadowRoot!.querySelector('[part="surface"]')!;
    const bounds = surface.getBoundingClientRect();
    const actionElement = action.element();
    const closeElement = close.element();
    for (const element of [actionElement, closeElement]) {
      const box = element.getBoundingClientRect();
      expect(box.left).toBeGreaterThanOrEqual(bounds.left - 1);
      expect(box.right).toBeLessThanOrEqual(bounds.right + 1);
    }
    expect(surface.scrollWidth).toBeLessThanOrEqual(surface.clientWidth + 1);
    const caption = surface.querySelector('[part="heading"]')!;
    const textLines = (element: Element, length: number) => {
      const text = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE)!;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, length);
      return range.getClientRects().length;
    };
    expect(textLines(caption, caption.textContent!.length)).toBe(1);
    const centerY = (box: DOMRect) => box.top + box.height / 2;
    const marker = surface.querySelector('[part="icon"]')!;
    expect(centerY(marker.getBoundingClientRect())).toBeCloseTo(centerY(caption.getBoundingClientRect()), 0);
    actionElement.textContent = 'Переподключить синхронизацию';
    expect(textLines(actionElement, 'Переподключить'.length)).toBe(1);
    const closeBounds = closeElement.getBoundingClientRect();
    const trailingGap = direction === 'rtl' ? closeBounds.left - bounds.left : bounds.right - closeBounds.right;
    expect(trailingGap).toBeLessThan(24);

    const source = container.querySelector('button')!;
    source.focus();
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(actionElement);
    await userEvent.keyboard('{Tab}{Enter}');
    await expect.element(close).not.toBeInTheDocument();
    expect(document.activeElement).toBe(source);
  } finally {
    document.documentElement.style.fontSize = size;
  }
});

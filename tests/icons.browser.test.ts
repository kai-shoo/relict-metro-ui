import { beforeEach, expect, test } from 'vitest';
import { commands, page } from 'vitest/browser';
import { metroIconNames } from '../src/icon.js';
import '../src/animated-icon.js';
import '../src/command-bar.js';
import '../src/hyperlink.js';

beforeEach(() => { document.body.replaceChildren(); });

test('icons use either a named drawing or a slotted glyph and expose only meaningful labels', async () => {
  document.body.innerHTML = `
    <metro-icon name="camera"></metro-icon>
    <metro-icon name="mail" label="New messages" style="--metro-icon-size: 30px"></metro-icon>
    <metro-icon name="company-mark" label="Company"><span>■</span></metro-icon>
  `;
  const [decoration, named, custom] = document.querySelectorAll('metro-icon');
  await expect.element(page.getByRole('img', { name: 'New messages' })).toBeVisible();
  await expect.element(page.getByRole('img', { name: 'Company' })).toBeVisible();
  expect(decoration.shadowRoot?.querySelector('.glyph')?.getAttribute('aria-hidden')).toBe('true');
  expect(named.getBoundingClientRect().width).toBe(30);
  expect(named.shadowRoot?.querySelector('path')?.getAttribute('d')).toContain('M3 5');
  expect(custom.shadowRoot?.querySelector('slot')?.assignedElements()[0]?.textContent).toBe('■');
  expect(metroIconNames).toEqual(expect.arrayContaining(['save', 'camera', 'pause', 'flag']));
});

test.each([20, 32])('a %s pixel hyperlink icon aligns with the capital letters beside it', async size => {
  document.body.innerHTML = `
    <metro-hyperlink href="/mail" style="font: 20px sans-serif; --metro-icon-size: ${size}px">
      <metro-icon name="mail"></metro-icon> Почта<span style="display: inline-block; height: 1cap"></span>
    </metro-hyperlink>
  `;
  await expect.element(page.getByRole('link', { name: 'Почта' })).toBeVisible();
  const link = document.querySelector('metro-hyperlink')!;
  const capital = link.querySelector('span')!.getBoundingClientRect();
  const drawing = link.querySelector('metro-icon')!.shadowRoot!.querySelector('path')!.getBoundingClientRect();
  expect(capital.height).toBeGreaterThan(0);
  expect(Math.abs((drawing.top + drawing.bottom) / 2 - (capital.top + capital.bottom) / 2)).toBeLessThanOrEqual(1);
});

test('mirrors only directional signs in RTL and removes hidden icons from layout', async () => {
  document.body.innerHTML = `
    <div dir="rtl">
      <metro-icon name="back" label="Back"></metro-icon>
      <metro-animated-icon name="next" label="Next"></metro-animated-icon>
      <metro-icon name="mail" label="Mail"></metro-icon>
    </div>
  `;
  const parent = document.querySelector('div')!;
  const [back, next, mail] = [...parent.children] as (HTMLElementTagNameMap['metro-icon'])[];
  await expect.element(page.getByRole('img', { name: 'Back' })).toBeVisible();
  await expect.element(page.getByRole('img', { name: 'Next' })).toBeVisible();
  const transform = (icon: typeof back) => getComputedStyle(icon.shadowRoot!.querySelector('svg')!).transform;
  expect(new DOMMatrixReadOnly(transform(back)).a).toBe(-1);
  expect(new DOMMatrixReadOnly(transform(next)).a).toBe(-1);
  expect(transform(mail)).toBe('none');
  parent.dir = 'ltr';
  expect(transform(back)).toBe('none');
  expect(transform(next)).toBe('none');
  for (const icon of [back, next]) {
    icon.hidden = true;
    expect(icon.getClientRects()).toHaveLength(0);
  }
});

test('cancels an animated sign when hidden or when motion is reduced mid-transition', async () => {
  await commands.setMetroMedia({ reducedMotion: 'no-preference' });
  const icon = document.createElement('metro-animated-icon');
  icon.duration = 10000;
  icon.name = 'play';
  document.body.append(icon);
  await icon.updateComplete;
  const glyph = icon.shadowRoot!.querySelector('.glyph')!;
  expect(glyph.getAnimations()).toHaveLength(0);
  try {
    icon.name = 'pause';
    await icon.updateComplete;
    const [first] = glyph.getAnimations();
    expect(first).toBeDefined();
    icon.name = 'stop';
    await icon.updateComplete;
    expect(first.playState).toBe('idle');
    expect(glyph.getAnimations()).toHaveLength(1);

    await commands.setMetroMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => glyph.getAnimations().length).toBe(0);
    await commands.setMetroMedia({ reducedMotion: 'no-preference' });
    await expect.poll(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false);
    expect(glyph.getAnimations()).toHaveLength(0);

    icon.name = 'mail';
    await icon.updateComplete;
    const [last] = glyph.getAnimations();
    expect(last).toBeDefined();
    icon.hidden = true;
    expect(last.playState).toBe('idle');
    icon.name = 'camera';
    await icon.updateComplete;
    icon.hidden = false;
    expect(glyph.getAnimations()).toHaveLength(0);

    icon.name = 'save';
    await icon.updateComplete;
    const [detached] = glyph.getAnimations();
    expect(detached).toBeDefined();
    icon.remove();
    expect(detached.playState).toBe('idle');
  } finally {
    await commands.setMetroMedia({ reducedMotion: 'no-preference' });
  }
});

test('animated icons swap their state with reduced motion and command labels remain accessible', async () => {
  await commands.setMetroMedia({ reducedMotion: 'reduce' });
  try {
    const icon = document.createElement('metro-animated-icon');
    icon.name = 'play';
    icon.label = 'Playing';
    const bar = document.createElement('metro-command-bar');
    bar.commands = [{ id: 'save', label: 'Save', iconName: 'save' }];
    document.body.append(icon, bar);
    await icon.updateComplete;
    const drawing = () => icon.shadowRoot?.querySelector('path')?.getAttribute('d');
    const previous = drawing();
    icon.name = 'pause';
    icon.label = 'Paused';
    await expect.element(page.getByRole('img', { name: 'Paused' })).toBeVisible();
    expect(drawing()).not.toBe(previous);
    expect(icon.shadowRoot?.querySelector('.glyph')?.getAnimations()).toHaveLength(0);
    const save = page.getByRole('button', { name: 'Save' });
    await expect.element(save).toBeVisible();
    expect(save.element().querySelector('metro-icon')?.getAttribute('name')).toBe('save');
  } finally {
    await commands.setMetroMedia({ reducedMotion: 'no-preference' });
  }
});

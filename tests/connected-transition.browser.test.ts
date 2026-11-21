import { afterEach, expect, test } from 'vitest';
import { commands } from 'vitest/browser';
import '../src/navigation-transition.js';
import '../src/frame.js';

let host: HTMLDivElement;
async function fixture() {
  host = document.createElement('div');
  host.innerHTML = `<metro-navigation-transition transition="connected" duration="1500" connected-key="a/b">
    <metro-frame value="list">
      <metro-page value="list"><div style="height:60px;overflow:auto;transform:translateX(0)">
        <button data-metro-connected="a/b" style="width:80px;height:48px">Open</button>
      </div></metro-page>
      <metro-page value="record"><div data-metro-connected="a/b" style="margin-left:60px;width:160px;height:96px">Cover</div></metro-page>
    </metro-frame></metro-navigation-transition>`;
  document.body.append(host);
  const frame = host.querySelector('metro-frame')!;
  await frame.updateComplete;
  await Promise.all([...host.querySelectorAll('metro-page')].map(page => page.updateComplete));
  return {
    frame, source: host.querySelector('button')!, target: host.querySelector<HTMLElement>('[value="record"] div')!,
    transition: host.querySelector('metro-navigation-transition')!, detail: host.querySelector('metro-page[value="record"]')!,
  };
}
afterEach(() => host?.remove());

test('connects two visible representations of a key and restores focus on Back', async () => {
  const { frame, source, target, transition, detail } = await fixture();
  source.focus();
  const start = source.getBoundingClientRect();
  frame.navigate('record');
  await expect.poll(() => target.getAnimations().length).toBe(1);
  const animation = target.getAnimations()[0];
  animation.pause();
  animation.currentTime = 0;
  const first = target.getBoundingClientRect();
  for (const dimension of ['x', 'y', 'width', 'height'] as const) expect(first[dimension]).toBeCloseTo(start[dimension], 1);
  expect(detail.getAnimations()).toHaveLength(0);
  transition.cancel();
  frame.back();
  await expect.poll(() => source.getAnimations().length).toBe(1);
  expect(document.activeElement).toBe(source);
  expect(target.getAnimations()).toHaveLength(0);
});

test('uses a page fade when a row is outside its scrollport, missing or has a different key', async () => {
  const { frame, source, target, detail } = await fixture();
  source.style.marginTop = '180px';
  frame.navigate('record');
  await expect.poll(() => detail.getAnimations().length).toBe(1);
  expect(target.getAnimations()).toHaveLength(0);
  frame.back();
  source.style.marginTop = '0px';
  target.dataset.metroConnected = 'other';
  frame.navigate('record');
  await expect.poll(() => detail.getAnimations().length).toBe(1);
  expect(target.getAnimations()).toHaveLength(0);
  frame.back();
  source.remove();
  target.dataset.metroConnected = 'a/b';
  frame.navigate('record');
  await expect.poll(() => detail.getAnimations().length).toBe(1);
  expect(target.getAnimations()).toHaveLength(0);
});

test('veto, rapid Back and reduced motion never delay the visit or leave an animation behind', async () => {
  const { frame, source, target } = await fixture();
  host.addEventListener('metro-before-navigate', event => event.preventDefault(), { once: true });
  expect(frame.navigate('record')).toBe(false);
  expect(source.getAnimations()).toHaveLength(0);
  expect(frame.navigate('record')).toBe(true);
  expect(frame.back()).toBe(true);
  await expect.poll(() => source.getAnimations().length).toBe(1);
  expect(target.getAnimations()).toHaveLength(0);
  try {
    await commands.setMetroMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => source.getAnimations().length).toBe(0);
    frame.navigate('record');
    await frame.updateComplete;
    await new Promise(requestAnimationFrame);
    expect(frame.value).toBe('record');
    expect(target.getAnimations()).toHaveLength(0);
    expect(frame.page!.getAnimations()).toHaveLength(0);
  } finally { await commands.setMetroMedia({ reducedMotion: null }); }
});

test('recycling an animated target for another object immediately releases it', async () => {
  const { frame, target } = await fixture();
  frame.navigate('record');
  await expect.poll(() => target.getAnimations().length).toBe(1);
  target.dataset.metroConnected = 'another-record';
  await expect.poll(() => target.getAnimations().length).toBe(0);
  expect(frame.value).toBe('record');
});

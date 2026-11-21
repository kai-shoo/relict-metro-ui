import { afterEach, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import '../src/frame.js';
import '../src/navigation-transition.js';
import '../src/slide-in-effect.js';
import '../src/tilt-effect.js';
import '../src/turnstile-feather-effect.js';

function fixture(markup: string) {
  const host = document.createElement('div');
  host.dataset.toolkitMotion = '';
  host.innerHTML = markup;
  document.body.append(host);
  return host;
}

function running(target: Element): KeyframeEffect | null {
  return (target.getAnimations()[0]?.effect as KeyframeEffect | undefined) ?? null;
}

afterEach(() => document.querySelectorAll('[data-toolkit-motion]').forEach(host => host.remove()));

it('plays SlideIn on a host event and cancels without changing focus, style or layout', async () => {
  const host = fixture(`
    <div style="display:flex;gap:8px">
      <metro-slide-in-effect event="metro-reveal" from="start" duration="600">
        <button style="inline-size:100px;transform:scale(.98)">Preview</button>
      </metro-slide-in-effect>
      <button>Other</button>
    </div>
  `);
  const effect = host.querySelector('metro-slide-in-effect')!;
  const button = host.querySelector('button')!;
  await effect.updateComplete;
  button.focus();
  button.dispatchEvent(new CustomEvent('metro-reveal', { bubbles: true, composed: true }));
  expect(getComputedStyle(effect).display).toBe('contents');
  expect(running(button)?.getKeyframes()[0].transform).toBe('translateX(-50px)');
  expect(button.offsetWidth).toBe(100);
  expect(document.activeElement).toBe(button);

  const previous = effect.play();
  const current = effect.play();
  await expect(previous).resolves.toBe(false);
  effect.remove();
  await expect(current).resolves.toBe(false);
  expect(button.getAnimations()).toHaveLength(0);
  expect(button.style.transform).toBe('scale(0.98)');
});

it('staggers marked Feather targets with the Toolkit angles and duration', async () => {
  const host = fixture(`
    <metro-turnstile-feather-effect direction="back" phase="exit">
      <h2>Keep this still</h2>
      <div><p data-metro-feather>First row</p><p data-metro-feather>Second row</p></div>
    </metro-turnstile-feather-effect>
  `);
  const effect = host.querySelector('metro-turnstile-feather-effect')!;
  await effect.updateComplete;
  const completed = effect.play();
  const [first, second] = Array.from(host.querySelectorAll('p')).map(target => running(target)!);
  expect(running(host.querySelector('h2')!)).toBeNull();
  expect(first.getTiming().duration).toBe(250);
  expect(first.getTiming().delay).toBe(0);
  expect(second.getTiming().delay).toBe(40);
  expect(second.getKeyframes()[1].transform).toContain('rotateY(-80deg)');
  await expect(completed).resolves.toBe(true);
  expect(Array.from(host.querySelectorAll('p')).every(target => !target.getAnimations().length)).toBe(true);
});

it.each(['metro-slide-in-effect', 'metro-turnstile-feather-effect', 'metro-navigation-transition'] as const)(
  'cancels %s immediately when its wrapper is hidden', async tag => {
    const host = fixture(`<${tag} duration="1000"><button>Open record</button></${tag}>`);
    const effect = host.querySelector(tag)!;
    const target = host.querySelector('button')!;
    await effect.updateComplete;
    const completed = 'transition' in effect ? effect.play(target) : effect.play();
    expect(target.getAnimations()).toHaveLength(1);
    effect.hidden = true;
    expect(target.getAnimations()).toHaveLength(0);
    effect.hidden = false;
    await expect(completed).resolves.toBe(false);
    expect(target.style.transform).toBe('');
  },
);

it('tilts for trusted pointer and keyboard holds while native controls activate once', async () => {
  const host = fixture(`
    <metro-tilt-effect>
      <button style="inline-size: 150px;block-size: 42px">Open record</button>
      <button data-metro-no-tilt>Plain</button>
    </metro-tilt-effect>
  `);
  const effect = host.querySelector('metro-tilt-effect')!;
  const button = host.querySelector('button')!;
  let activations = 0;
  button.addEventListener('click', () => activations++);
  const control = page.getByRole('button', { name: 'Open record' });
  const user = userEvent.setup();
  await user.pointer({ target: control, coords: { x: 25, y: 12 }, keys: '[MouseLeft>]' });
  try {
    expect(effect.pressed).toBe(true);
    expect(running(button)?.getKeyframes()[0].transform).toContain('rotateY(');
  } finally {
    await user.pointer({ target: control, coords: { x: 25, y: 12 }, keys: '[/MouseLeft]' });
  }
  expect(activations).toBe(1);
  expect(effect.pressed).toBe(false);
  await expect.poll(() => button.getAnimations().length).toBe(0);

  button.focus();
  await user.keyboard('[Space>]');
  try {
    expect(effect.pressed).toBe(true);
    expect(activations).toBe(1);
  } finally {
    await user.keyboard('[/Space]');
  }
  expect(activations).toBe(2);
  expect(document.activeElement).toBe(button);

  await page.getByRole('button', { name: 'Plain' }).click();
  expect(host.querySelector('button[data-metro-no-tilt]')!.getAnimations()).toHaveLength(0);
});

it('drops a held tilt when the wrapper is hidden, and leaves the next press usable', async () => {
  const host = fixture('<metro-tilt-effect><button>Open record</button></metro-tilt-effect>');
  const effect = host.querySelector('metro-tilt-effect')!;
  const button = host.querySelector('button')!;
  const control = page.getByRole('button', { name: 'Open record' });
  await userEvent.pointer({ target: control, keys: '[MouseLeft>]' });
  try {
    expect(effect.pressed).toBe(true);
    effect.hidden = true;
    expect(effect.pressed).toBe(false);
    expect(button.getAnimations()).toHaveLength(0);
  } finally {
    effect.hidden = false;
    await userEvent.pointer({ target: control, keys: '[/MouseLeft]' });
  }
  await userEvent.pointer({ target: control, keys: '[MouseLeft>]' });
  try {
    expect(effect.pressed).toBe(true);
  } finally {
    await userEvent.pointer({ target: control, keys: '[/MouseLeft]' });
  }
});

it('drops tilt when the pressed target is replaced before the pointer is released', async () => {
  const host = fixture('<metro-tilt-effect><button>Open record</button></metro-tilt-effect>');
  const effect = host.querySelector('metro-tilt-effect')!;
  const button = host.querySelector('button')!;
  const control = page.getByRole('button', { name: 'Open record' });
  await userEvent.pointer({ target: control, keys: '[MouseLeft>]' });
  try {
    expect(effect.pressed).toBe(true);
    button.replaceWith(button.cloneNode(true));
    await expect.poll(() => effect.pressed).toBe(false);
    expect(button.getAnimations()).toHaveLength(0);
  } finally {
    await userEvent.pointer({ target: control, keys: '[/MouseLeft]' });
  }
});

it('drops tilt when the pressed target becomes aria-disabled during a hold', async () => {
  const host = fixture('<metro-tilt-effect><button>Open record</button></metro-tilt-effect>');
  const effect = host.querySelector('metro-tilt-effect')!;
  const button = host.querySelector('button')!;
  const control = page.getByRole('button', { name: 'Open record' });
  await userEvent.pointer({ target: control, keys: '[MouseLeft>]' });
  try {
    expect(effect.pressed).toBe(true);
    button.setAttribute('aria-disabled', 'true');
    await expect.poll(() => effect.pressed).toBe(false);
    expect(button.getAnimations()).toHaveLength(0);
  } finally {
    await userEvent.pointer({ target: control, keys: '[/MouseLeft]' });
  }
});

it('stops a held tilt when reduced motion is enabled without consuming the activation', async () => {
  const host = fixture('<metro-tilt-effect><button>Open record</button></metro-tilt-effect>');
  const effect = host.querySelector('metro-tilt-effect')!;
  const control = page.getByRole('button', { name: 'Open record' });
  const button = host.querySelector('button')!;
  let activations = 0;
  button.addEventListener('click', () => activations++);
  await commands.setMetroMedia({ reducedMotion: 'no-preference' });
  try {
    await userEvent.pointer({ target: control, keys: '[MouseLeft>]' });
    try {
      expect(effect.pressed).toBe(true);
      await commands.setMetroMedia({ reducedMotion: 'reduce' });
      await expect.poll(() => effect.pressed).toBe(false);
      expect(button.getAnimations()).toHaveLength(0);
    } finally {
      await userEvent.pointer({ target: control, keys: '[/MouseLeft]' });
    }
    expect(activations).toBe(1);
  } finally {
    await commands.setMetroMedia({ reducedMotion: null });
  }
});

it('uses directions from committed Frame visits and releases its animation on reduced motion', async () => {
  const host = fixture(`
    <metro-navigation-transition duration="850">
      <metro-frame value="home">
        <metro-page value="home" label="Home"><button data-metro-focus="source">Open record</button></metro-page>
        <metro-page value="detail" label="Record"><input aria-label="Draft"></metro-page>
      </metro-frame>
    </metro-navigation-transition>
  `);
  const frame = host.querySelector('metro-frame')!;
  const source = host.querySelector('button')!;
  const home = host.querySelector('metro-page[value="home"]')!;
  const detail = host.querySelector('metro-page[value="detail"]')!;
  source.addEventListener('click', () => frame.navigate('detail'));
  await page.getByRole('button', { name: 'Open record' }).click();
  await expect.poll(() => running(detail)?.getKeyframes()[0].transform).toContain('rotateY(-80deg)');
  expect(frame.value).toBe('detail');
  expect(frame.back()).toBe(true);
  await expect.poll(() => running(home)?.getKeyframes()[0].transform).toContain('rotateY(50deg)');
  expect(detail.getAnimations()).toHaveLength(0);
  await expect.poll(() => document.activeElement).toBe(source);

  try {
    await commands.setMetroMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => home.getAnimations().length).toBe(0);
    expect(frame.navigate('detail')).toBe(true);
    const heading = page.getByRole('heading', { name: 'Record' });
    await expect.element(heading).toBeVisible();
    await expect.poll(() => detail.shadowRoot?.activeElement).toBe(heading.element());
    expect(detail.getAnimations()).toHaveLength(0);
  } finally {
    await commands.setMetroMedia({ reducedMotion: null });
  }
});

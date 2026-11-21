import { afterEach, describe, expect, test } from 'vitest';
import { commands, page, server, userEvent } from 'vitest/browser';
import '../src/slider.js';
import '../src/number-box.js';
import '../src/rating.js';

let fixture: HTMLDivElement | undefined;

function mount(markup: string) {
  fixture = document.createElement('div');
  fixture.style.inlineSize = '320px';
  fixture.innerHTML = markup;
  document.body.append(fixture);
  return fixture;
}

function observe(control: HTMLElement & { value: number | null }) {
  const events: [string, number | null][] = [];
  for (const type of ['input', 'change']) {
    control.parentElement!.addEventListener(type, event => {
      if (event.target === control) events.push([type, control.value]);
    });
  }
  return events;
}

afterEach(() => fixture?.remove());

interface TouchState {
  value: number;
  scrolled: number;
  events: [string, number][];
}

declare module 'vitest/browser' {
  interface BrowserCommands {
    sliderTouch(): Promise<{ canceled: TouchState; horizontal: TouchState; vertical: TouchState }>;
  }
}

test.each(['ltr', 'rtl'])('fits the enlarged rating preview and rolls it back when disabled in %s', async direction => {
  const container = mount(`<metro-rating dir="${direction}" label="Rating" max="20" step="0.5"
    show-value value="3" style="font-size:2rem"></metro-rating>`);
  const rating = container.querySelector('metro-rating')!;
  await rating.updateComplete;
  const events = observe(rating);
  const surface = rating.shadowRoot!.querySelector<HTMLElement>('[part="control"]')!;
  const popup = surface.querySelector('[part="value"]')!;
  const scale = surface.querySelector('[part="stars"]')!.getBoundingClientRect();
  const send = (type: string) => surface.dispatchEvent(new PointerEvent(type, {
    bubbles: true, pointerType: 'mouse', pointerId: 12, isPrimary: true,
    clientX: scale.left + scale.width * (direction === 'rtl' ? .04 : .96),
  }));
  send('pointerdown');
  await rating.updateComplete;
  expect(rating.value).toBe(19.5);
  expect(surface.hasAttribute('data-dragging')).toBe(true);
  const bounds = popup.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(popup);
  const line = range.getBoundingClientRect();
  expect(range.getClientRects()).toHaveLength(1);
  expect(line.left).toBeGreaterThanOrEqual(bounds.left);
  expect(line.right).toBeLessThanOrEqual(bounds.right);
  expect(bounds.left).toBeGreaterThanOrEqual(scale.left);
  expect(bounds.right).toBeLessThanOrEqual(scale.right);
  expect(bounds.bottom).toBeLessThanOrEqual(scale.top + 1);
  rating.disabled = true;
  rating.disabled = false;
  send('pointerup');
  expect(rating.value).toBe(3);
  await rating.updateComplete;
  expect(surface.hasAttribute('data-dragging')).toBe(false);
  expect(events).toEqual([['input', 19.5], ['input', 3]]);
});

describe('Metro Slider', () => {
  test('giving the slider a new value during a pointer preview ends that gesture', async () => {
    const container = mount('<form><metro-slider name="brightness" label="Brightness" value="2"></metro-slider></form>');
    const slider = container.querySelector('metro-slider')!;
    const events = observe(slider);
    await slider.updateComplete;
    const surface = slider.shadowRoot!.querySelector<HTMLElement>('[part="control"]')!;
    const track = slider.shadowRoot!.querySelector('[part="track"]')!.getBoundingClientRect();
    const send = (type: string, position: number) => surface.dispatchEvent(new PointerEvent(type, {
      bubbles: true, pointerType: 'mouse', pointerId: 12, isPrimary: true, clientX: track.left + track.width * position,
    }));
    send('pointerdown', .7);
    expect(slider.value).toBe(7);
    slider.value = 4;
    send('pointerup', .9);
    expect(slider.value).toBe(4);
    expect(events).toEqual([['input', 7]]);
    send('pointerdown', .5);
    send('pointerup', .5);
    expect(events.slice(1)).toEqual([['input', 5], ['change', 5]]);

    send('pointerdown', .8);
    const form = container.querySelector('form')!;
    form.reset();
    send('pointerup', .9);
    expect(slider.value).toBe(2);
    expect(new FormData(form).get('brightness')).toBe('2');
    expect(events.slice(3)).toEqual([['input', 8]]);

    send('pointerdown', .7);
    slider.disabled = true;
    slider.disabled = false;
    send('pointerup', .9);
    expect(slider.value).toBe(2);
    expect(events.slice(4)).toEqual([['input', 7], ['input', 2]]);
  });

  test('keeps native keyboard semantics, updates FormData, and resets silently', async () => {
    const container = mount(`<form>
      <label for="brightness">Brightness</label>
      <metro-slider id="brightness" name="brightness" min="-2" max="2" step="0.5" value="0" show-bounds></metro-slider>
    </form>`);
    const slider = container.querySelector('metro-slider')!;
    const form = container.querySelector('form')!;
    const input = page.getByRole('slider', { name: 'Brightness' });
    const events = observe(slider);
    await expect.element(input).toHaveValue('0');
    await userEvent.click(page.getByText('Brightness'));
    expect(slider.shadowRoot!.activeElement).toBe(input.element());
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(input).toHaveValue('0.5');
    expect(events).toEqual([['input', 0.5], ['change', 0.5]]);
    expect(new FormData(form).get('brightness')).toBe('0.5');
    await userEvent.keyboard('{Home}{End}');
    expect(events.slice(2)).toEqual([['input', -2], ['change', -2], ['input', 2], ['change', 2]]);

    slider.value = 1.2;
    expect(new FormData(form).get('brightness')).toBe('1');
    await expect.element(input).toHaveValue('1');
    form.reset();
    await expect.element(input).toHaveValue('0');
    expect(events).toHaveLength(6);
  });

  test('previews a horizontal gesture, rolls it back on cancel, and ignores perpendicular motion', async () => {
    const container = mount('<metro-slider label="Brightness" value="2"></metro-slider>');
    const slider = container.querySelector('metro-slider')!;
    const events = observe(slider);
    await slider.updateComplete;
    const surface = slider.shadowRoot!.querySelector<HTMLElement>('[part="control"]')!;
    const { left, width, top } = slider.shadowRoot!.querySelector('[part="track"]')!.getBoundingClientRect();
    const center = top + 6;
    const send = (type: string, position: number, y = center) => surface.dispatchEvent(new PointerEvent(type, {
      bubbles: true, pointerType: 'touch', pointerId: 12, isPrimary: true, clientX: left + width * position, clientY: y,
    }));

    expect(getComputedStyle(surface).touchAction).toBe('pan-y pinch-zoom');
    send('pointerdown', 0.2);
    send('pointermove', 0.2, center - 20);
    send('pointerup', 0.9, center - 20);
    expect(events).toEqual([]);
    expect(slider.value).toBe(2);

    send('pointerdown', 0.2);
    send('pointermove', 0.7);
    expect(slider.value).toBe(7);
    send('pointercancel', 0.7);
    expect(slider.value).toBe(2);
    expect(events).toEqual([['input', 7], ['input', 2]]);

    send('pointerdown', 0.2);
    send('pointerup', 0.2);
    expect(events).toHaveLength(2);
    send('pointerdown', 1);
    send('pointerup', 1);
    expect(events.slice(2)).toEqual([['input', 10], ['change', 10]]);
  });

  test('supports a vertical orientation and a slotted label', async () => {
    const container = mount(`<metro-slider orientation="vertical" value="4">
      <span slot="label">Level</span>
    </metro-slider>`);
    const slider = container.querySelector('metro-slider')!;
    const input = page.getByRole('slider', { name: 'Level' });
    await expect.element(input).toHaveAttribute('aria-orientation', 'vertical');
    slider.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(slider.value).toBe(5);
  });

  test.skipIf(server.browser !== 'chromium')('Chromium touch emulation commits horizontal gestures and preserves vertical scrolling', async () => {
    const { canceled, horizontal, vertical } = await commands.sliderTouch();
    expect(canceled.value).toBe(2);
    expect(canceled.events.length).toBeGreaterThan(1);
    expect(canceled.events.at(-1)).toEqual(['input', 2]);
    expect(canceled.events.every(([type]) => type === 'input')).toBe(true);
    expect(horizontal.value).toBe(8);
    expect(horizontal.scrolled).toBe(0);
    expect(horizontal.events.filter(([type]) => type === 'change')).toEqual([['change', 8]]);
    expect(vertical.scrolled).toBeGreaterThan(40);
    expect(vertical.value).toBe(8);
    expect(vertical.events).toEqual(horizontal.events);
  });
});

describe('Metro NumberBox', () => {
  test('keeps the value readable and paired step buttons reachable at 200% text', async () => {
    const container = mount('<metro-number-box label="Brightness" value="100" step="25" spin-buttons style="width:180px"></metro-number-box>');
    const box = container.querySelector('metro-number-box')!;
    const size = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '200%';
    try {
      const field = page.getByRole('spinbutton', { name: 'Brightness' });
      const down = page.getByRole('button', { name: 'Decrease' });
      const up = page.getByRole('button', { name: 'Increase' });
      const events = observe(box);
      await box.updateComplete;
      const input = field.element().getBoundingClientRect();
      const decrement = down.element().getBoundingClientRect();
      const increment = up.element().getBoundingClientRect();
      expect(input.width).toBeCloseTo(180, 0);
      expect(field.element().scrollWidth).toBeLessThanOrEqual(field.element().clientWidth + 1);
      expect(increment.top).toBeCloseTo(decrement.top, 0);
      expect(decrement.top).toBeGreaterThan(input.bottom);
      expect(increment.right).toBeLessThanOrEqual(input.right + 1);
      expect(increment.width).toBeGreaterThanOrEqual(44);
      expect(decrement.width).toBeGreaterThanOrEqual(44);
      await up.click();
      await expect.element(field).toHaveValue('125');
      expect(box.shadowRoot?.activeElement).toBe(field.element());
      await userEvent.keyboard('{ArrowDown}');
      await expect.element(field).toHaveValue('100');
      expect(events).toEqual([['input', 125], ['change', 125], ['input', 100], ['change', 100]]);
      container.style.inlineSize = '460px';
      box.style.width = '460px';
      expect(up.element().getBoundingClientRect().top).toBeCloseTo(field.element().getBoundingClientRect().top, 0);
    } finally {
      document.documentElement.style.fontSize = size;
    }
  });

  test('Escape cancels a draft once and then bubbles to the enclosing control', async () => {
    const container = mount('<metro-number-box label="Volume" value="3"></metro-number-box>');
    const input = page.getByRole('spinbutton', { name: 'Volume' });
    const escapes: boolean[] = [];
    container.addEventListener('keydown', event => {
      if (event.key === 'Escape') escapes.push(event.defaultPrevented);
    });
    await input.fill('8');
    await userEvent.keyboard('{Escape}');
    await expect.element(input).toHaveValue('3');
    expect(escapes).toEqual([]);
    await userEvent.keyboard('{Escape}');
    expect(escapes).toEqual([false]);
  });

  test('holds partial input and preserves committed value across an invalid confirmation', async () => {
    const container = mount(`<form>
      <metro-number-box name="brightness" label="Exact brightness" min="-2" max="2" step="0.5" value="0" required></metro-number-box>
      <button type="button">Unfocus</button>
    </form>`);
    const box = container.querySelector('metro-number-box')!;
    const form = container.querySelector('form')!;
    const input = page.getByRole('spinbutton', { name: 'Exact brightness' });
    const events = observe(box);
    await input.fill('-');
    expect(box.draft).toBe('-');
    expect(box.value).toBe(0);
    expect(events).toEqual([]);
    await input.fill('2.5');
    await userEvent.keyboard('{Enter}');
    await expect.element(input).toHaveAttribute('aria-invalid', 'true');
    await expect.element(page.getByRole('status')).toHaveTextContent('Enter a number between -2 and 2.');
    expect(form.checkValidity()).toBe(false);
    expect(box.validity.rangeOverflow).toBe(true);
    expect(new FormData(form).get('brightness')).toBe('0');

    await input.fill('-1,5');
    await userEvent.click(page.getByRole('button', { name: 'Unfocus' }));
    await expect.element(input).toHaveValue('-1.5');
    await expect.element(input).not.toHaveAttribute('aria-invalid');
    expect(form.checkValidity()).toBe(true);
    expect(events).toEqual([['input', -1.5], ['change', -1.5]]);
    expect(new FormData(form).get('brightness')).toBe('-1.5');

    form.reset();
    await expect.element(input).toHaveValue('0');
    expect(events).toHaveLength(2);
  });

  test('supports labeled step buttons, fieldset disabled state, and Escape to discard the draft', async () => {
    const container = mount(`<form><fieldset>
      <metro-number-box label="Zoom" name="zoom" min="0" max="2" step="0.25" value="1" spin-buttons
        increment-label="More zoom" decrement-label="Less zoom"></metro-number-box>
    </fieldset></form>`);
    const box = container.querySelector('metro-number-box')!;
    const form = container.querySelector('form')!;
    const input = page.getByRole('spinbutton', { name: 'Zoom' });
    const events = observe(box);
    await input.fill('zzz');
    await userEvent.keyboard('{Escape}');
    await expect.element(input).toHaveValue('1');
    expect(events).toEqual([]);

    await userEvent.click(page.getByRole('button', { name: 'More zoom' }));
    expect(events).toEqual([['input', 1.25], ['change', 1.25]]);
    expect(box.shadowRoot!.activeElement).toBe(input.element());
    box.stepDown(2);
    await expect.element(input).toHaveValue('0.75');
    expect(events).toHaveLength(2);
    container.querySelector('fieldset')!.disabled = true;
    await expect.element(input).toBeDisabled();
    expect(new FormData(form).has('zoom')).toBe(false);
  });
});

test('keeps the Rating focus and pointer area centered on the 215 × 43 Toolkit scale at 200% text', async () => {
  const container = mount('<metro-rating label="Service" step="0.5" value="1"></metro-rating>');
  const rating = container.querySelector('metro-rating')!;
  const size = document.documentElement.style.fontSize;
  document.documentElement.style.fontSize = '200%';
  try {
    await rating.updateComplete;
    const input = page.getByRole('slider', { name: 'Service' });
    const control = rating.shadowRoot!.querySelector('[part="control"]')!;
    const bounds = control.getBoundingClientRect();
    const visual = rating.shadowRoot!.querySelector('.visual')!.getBoundingClientRect();
    const star = rating.shadowRoot!.querySelector('[part="star"]')!.getBoundingClientRect();
    expect(bounds.width).toBeCloseTo(215, 0);
    expect(bounds.height).toBeCloseTo(43, 0);
    expect(visual.height).toBeCloseTo(bounds.height, 0);
    expect(star.top + star.height / 2).toBeCloseTo(bounds.top + bounds.height / 2, 0);
    const events = observe(rating);
    await userEvent.click(control, { position: { x: 150, y: 21 } });
    await expect.element(input).toHaveAttribute('aria-valuetext', '3.5 / 5');
    expect(rating.shadowRoot!.activeElement).toBe(input.element());
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(input).toHaveAttribute('aria-valuetext', '4 / 5');
    expect(events).toEqual([['input', 3.5], ['change', 3.5], ['input', 4], ['change', 4]]);
  } finally {
    document.documentElement.style.fontSize = size;
  }
});

test('Metro Rating supports fractional selection, required/reset semantics and readonly display', async () => {
  const container = mount(`<form>
    <metro-rating label="Service" name="rating" step="0.5" required></metro-rating>
    <metro-rating label="Community score" value="3.5" step="0.5" readonly></metro-rating>
  </form>`);
  const [rating, community] = container.querySelectorAll('metro-rating');
  const form = container.querySelector('form')!;
  const input = page.getByRole('slider', { name: 'Service' });
  const readOnly = page.getByRole('slider', { name: 'Community score' });
  const events = observe(rating);
  await expect.element(input).toHaveAttribute('aria-valuetext', 'Not rated');
  expect(rating.validity.valueMissing).toBe(true);
  expect(new FormData(form).has('rating')).toBe(false);
  rating.focus();
  await userEvent.keyboard('{ArrowRight}');
  await expect.element(input).toHaveAttribute('aria-valuetext', '0.5 / 5');
  expect(events).toEqual([['input', 0.5], ['change', 0.5]]);
  expect(form.checkValidity()).toBe(true);
  expect(new FormData(form).get('rating')).toBe('0.5');

  await expect.element(readOnly).toHaveAttribute('aria-readonly', 'true');
  community.focus();
  await userEvent.keyboard('{ArrowRight}');
  await expect.element(readOnly).toHaveValue('3.5');
  form.reset();
  await expect.element(input).toHaveValue('0');
  expect(events).toHaveLength(2);
});

test('Slider preview and NumberBox confirmation can share a value without event feedback', async () => {
  const container = mount(`<form>
    <metro-slider label="Brightness" name="brightness" value="4"></metro-slider>
    <metro-number-box label="Exact brightness" min="0" max="10" value="4"></metro-number-box>
  </form>`);
  const slider = container.querySelector('metro-slider')!;
  const box = container.querySelector('metro-number-box')!;
  const sliderEvents = observe(slider);
  const boxEvents = observe(box);
  const exact = page.getByRole('spinbutton', { name: 'Exact brightness' });
  await expect.element(exact).toHaveValue('4');
  const preview: number[] = [];
  slider.addEventListener('input', () => {
    box.value = slider.value;
    preview.push(slider.value);
  });
  box.addEventListener('change', () => {
    slider.value = box.value!;
    preview.push(slider.value);
  });

  slider.focus();
  await userEvent.keyboard('{ArrowRight}');
  await expect.element(exact).toHaveValue('5');
  await exact.fill('23');
  await userEvent.keyboard('{Enter}');
  expect(slider.value).toBe(5);
  await exact.fill('7');
  await userEvent.keyboard('{Enter}');
  expect(slider.value).toBe(7);
  expect(preview).toEqual([5, 7]);
  expect(sliderEvents).toEqual([['input', 5], ['change', 5]]);
  expect(boxEvents).toEqual([['input', 7], ['change', 7]]);
});

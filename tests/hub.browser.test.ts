import { afterEach, describe, expect, it } from 'vitest';
import { cdp, commands, page, server, userEvent, type Locator } from 'vitest/browser';
import '../src/hub.js';
import '../src/panorama.js';
import type { MetroHub } from '../src/hub.js';

function fixture(markup: string) {
  const host = document.createElement('div');
  host.dataset.hubTest = '';
  host.innerHTML = markup;
  document.body.append(host);
  const hub = host.querySelector<MetroHub>('metro-hub, metro-panorama')!;
  const values: string[] = [];
  hub.addEventListener('metro-change', event => values.push(event.detail.value));
  return { host, hub, values };
}

function viewport(hub: MetroHub): HTMLElement {
  return hub.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!;
}

function panoramaFixture() {
  return fixture(`
    <metro-panorama heading="Music" style="width: 401px">
      <metro-hub-section value="library" label="Library"></metro-hub-section>
      <metro-hub-section value="recent" label="Recent"></metro-hub-section>
      <metro-hub-section value="search" label="Search"></metro-hub-section>
    </metro-panorama>
  `);
}

function expectForwardScroll(positions: number[]) {
  expect(positions.slice(1).every((position, index) => position >= positions[index] - 1), positions.join(' → ')).toBe(true);
}

function active(locator: Locator): boolean {
  const element = locator.element();
  return (element.getRootNode() as ShadowRoot).activeElement === element;
}

function touchPoint(element: Element, xFraction: number, yFraction: number) {
  const bounds = element.getBoundingClientRect();
  const frame = window.frameElement?.getBoundingClientRect();
  return {
    x: bounds.left + bounds.width * xFraction + (frame?.left ?? 0),
    y: bounds.top + bounds.height * yFraction + (frame?.top ?? 0),
  };
}

function touch(type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', point?: { x: number; y: number }) {
  return cdp().send('Input.dispatchTouchEvent', { type, touchPoints: point ? [point] : [] });
}

async function gesture(start: { x: number; y: number }, x: number, y: number, beforeRelease?: () => void) {
  await touch('touchStart', start);
  try {
    for (let step = 1; step <= 8; step++) {
      await touch('touchMove', { x: start.x + x * step / 8, y: start.y + y * step / 8 });
    }
    beforeRelease?.();
  } finally {
    await touch('touchEnd');
  }
}

afterEach(() => document.querySelectorAll('[data-hub-test]').forEach(host => host.remove()));

describe('Hub and Panorama', () => {
  it.each(['metro-hub', 'metro-panorama'] as const)('keeps the active %s section aligned when an ancestor switches direction', async tag => {
    const { host, hub, values } = fixture(`
      <${tag} heading="Routes" loop="never" value="recent" style="inline-size:350px">
        <metro-hub-section value="library" label="Library"></metro-hub-section>
        <metro-hub-section value="recent" label="Recent"></metro-hub-section>
        <metro-hub-section value="search" label="Search"></metro-hub-section>
      </${tag}>
    `);
    const recent = page.getByRole('heading', { name: 'Recent' });
    await expect.element(recent).toBeVisible();
    hub.focusSection();
    await expect.poll(() => active(recent)).toBe(true);
    expect(viewport(hub).scrollLeft).toBeGreaterThan(0);

    host.dir = 'rtl';
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const view = viewport(hub).getBoundingClientRect();
    const section = hub.querySelector<HTMLElement>('[value="recent"]')!.getBoundingClientRect();
    expect(section.right).toBeCloseTo(view.right, 0);
    expect(hub.firstVisible).toBe('recent');
    expect(active(recent)).toBe(true);
    expect(values).toEqual([]);

    await userEvent.keyboard('{ArrowLeft}');
    const search = page.getByRole('heading', { name: 'Search' });
    await expect.poll(() => active(search)).toBe(true);
    expect(values).toEqual(['search']);
  });

  it.skipIf(server.browser !== 'chromium')('uses the new RTL direction for the next Panorama touch gesture', async () => {
    const { host, hub, values } = panoramaFixture();
    await hub.updateComplete;
    hub.value = 'recent';
    await expect.poll(() => viewport(hub).scrollLeft).toBeGreaterThan(0);
    host.dir = 'rtl';
    await expect.poll(() => viewport(hub).scrollLeft).toBeLessThan(0);
    expect(values).toEqual([]);

    await gesture(touchPoint(viewport(hub), .3, .5), 120, 0);
    await expect.poll(() => hub.value).toBe('search');
    expect(values).toEqual(['search']);
  });

  it('tracks stable sections, roves focus and preserves independent content and silent programmatic selection', async () => {
    const { hub, host, values } = fixture(`
      <metro-hub style="width: 400px" heading="Catalog" value="overview">
        <metro-hub-section value="overview" label="Overview"><input aria-label="Draft" value="Initial"></metro-hub-section>
        <metro-hub-section value="recent" label="Recent" href="/recent"><p>Recent data</p></metro-hub-section>
        <metro-hub-section value="favorites" label="Favorites"><p>Favorite data</p></metro-hub-section>
      </metro-hub>
      <metro-hub heading="Another"><metro-hub-section value="separate" label="Separate"></metro-hub-section></metro-hub>
    `);
    const input = host.querySelector('input')!;
    const publisher: string[] = [];
    hub.addEventListener('metro-section-open', event => {
      publisher.push(`${event.detail.value}:${event.detail.href}`);
      expect(event.detail.invoker.tagName).toBe('A');
      event.preventDefault();
    });

    await expect.element(page.getByRole('heading', { name: 'Catalog' })).toBeVisible();
    await expect.element(page.getByRole('heading', { name: 'Overview' })).toHaveAttribute('tabindex', '0');
    expect(hub.children[0].getBoundingClientRect().width).toBe(360);
    input.value = 'Unsent';
    hub.focusSection();
    await expect.poll(() => active(page.getByRole('heading', { name: 'Overview' }))).toBe(true);

    await userEvent.keyboard('{ArrowRight}');
    await expect.poll(() => values).toEqual(['recent']);
    const recent = page.getByRole('link', { name: 'Recent' });
    await expect.poll(() => active(recent)).toBe(true);
    await userEvent.keyboard('{Enter}');
    expect(publisher).toEqual(['recent:/recent']);
    expect(host.querySelector('metro-hub[heading="Another"]')!.value).toBe('separate');

    hub.value = 'overview';
    await expect.poll(() => viewport(hub).scrollLeft).toBe(0);
    await expect.element(page.getByRole('textbox', { name: 'Draft' })).toHaveValue('Unsent');
    expect(values).toEqual(['recent']);

    const overview = host.querySelector('metro-hub-section[value="overview"]')!;
    overview.remove();
    await expect.poll(() => hub.value).toBe('recent');
    expect(values).toEqual(['recent']);
  });

  it('keeps a HubSection header focused when the application adds or removes its link', async () => {
    const { hub, host, values } = fixture(`
      <button type="button">Outside</button>
      <metro-hub heading="Catalog">
        <metro-hub-section value="recent" label="Recent"></metro-hub-section>
      </metro-hub>`);
    const section = hub.querySelector('metro-hub-section')!;
    const opened: string[] = [];
    hub.addEventListener('metro-section-open', event => {
      opened.push(event.detail.value);
      event.preventDefault();
    });
    const heading = page.getByRole('heading', { name: 'Recent' });
    await expect.element(heading).toBeVisible();
    hub.focusSection();
    await expect.poll(() => active(heading)).toBe(true);

    section.href = '/recent';
    const link = page.getByRole('link', { name: 'Recent' });
    await expect.poll(() => active(link)).toBe(true);
    await userEvent.keyboard('{Enter}');
    expect(opened).toEqual(['recent']);

    section.href = '';
    await expect.poll(() => active(heading)).toBe(true);
    const outside = host.querySelector('button')!;
    outside.focus();
    section.href = '/recent';
    await expect.element(link).toBeVisible();
    expect(document.activeElement).toBe(outside);
    expect(values).toEqual([]);
  });

  it('applies the Panorama title and cycling profile and bounds a two-section Phone Hub', async () => {
    const { hub, host, values } = fixture(`
      <metro-panorama heading="Music" style="width: 400px" value="samples">
        <metro-hub-section value="albums" label="Albums"></metro-hub-section>
        <metro-hub-section value="samples" label="Samples"></metro-hub-section>
      </metro-panorama>
      <metro-hub heading="Inbox" style="width: 400px" value="sent">
        <metro-hub-section value="received" label="Received"></metro-hub-section>
        <metro-hub-section value="sent" label="Sent"></metro-hub-section>
      </metro-hub>
    `);
    const phone = host.querySelector('metro-hub')!;
    await phone.updateComplete;
    await hub.updateComplete;
    expect(parseFloat(getComputedStyle(hub.shadowRoot!.querySelector('h1')!).fontSize)).toBeGreaterThan(120);
    expect(parseFloat(getComputedStyle(phone.shadowRoot!.querySelector('h1')!).fontSize)).toBeLessThan(80);

    hub.focusSection();
    await expect.poll(() => active(page.getByRole('heading', { name: 'Samples' }))).toBe(true);
    await userEvent.keyboard('{ArrowRight}');
    await expect.poll(() => values).toEqual(['albums']);

    phone.focusSection();
    await expect.poll(() => active(page.getByRole('heading', { name: 'Sent' }))).toBe(true);
    await userEvent.keyboard('{ArrowRight}');
    expect(phone.value).toBe('sent');
  });

  it('snaps a native horizontal scroll to the Panorama section and commits its value once', async () => {
    const { hub, values } = panoramaFixture();
    await hub.updateComplete;
    const view = viewport(hub);
    const step = hub.children[0].getBoundingClientRect().width;
    view.scrollBy({ left: step * .65, behavior: 'instant' });
    await expect.poll(() => values).toEqual(['recent']);
    expect(Math.abs(view.scrollLeft - step)).toBeLessThan(1);
    expect(hub.firstVisible).toBe('recent');
    expect(hub.sectionsInView).toContain('search');

    hub.value = 'library';
    await expect.poll(() => view.scrollLeft).toBe(0);
    expect(values).toEqual(['recent']);
  });

  it('continues from the release position when a Panorama drag advances to the next section', async () => {
    const { hub, values } = panoramaFixture();
    await hub.updateComplete;
    const view = viewport(hub);
    const step = hub.children[0].getBoundingClientRect().width;
    const bounds = view.getBoundingClientRect();
    const x = bounds.left + bounds.width * .6;
    const y = bounds.top + 88;
    const positions: number[] = [];
    const record = () => positions.push(view.scrollLeft);
    view.addEventListener('pointerup', () => {
      record();
      view.addEventListener('scroll', record);
      queueMicrotask(record);
    }, { capture: true, once: true });

    await userEvent.pointer([
      { keys: '[MouseLeft>]', coords: { x, y } },
      { coords: { x: x - 45, y } },
      { coords: { x: x - 125, y } },
      '[/MouseLeft]',
    ]);
    await expect.poll(() => values).toEqual(['recent']);
    await expect.poll(() => Math.abs(view.scrollLeft - step)).toBeLessThan(1);
    expect(positions[0]).toBeGreaterThan(100);
    expectForwardScroll([...positions, view.scrollLeft]);
  });

  it.skipIf(server.browser !== 'chromium')('accumulates a burst of horizontal wheel events before snapping Panorama once', async () => {
    const { hub, values } = panoramaFixture();
    await hub.updateComplete;
    const view = viewport(hub);
    const step = hub.children[0].getBoundingClientRect().width;
    const positions = [view.scrollLeft];
    view.addEventListener('scroll', () => positions.push(view.scrollLeft));
    const session = cdp();
    const point = touchPoint(view, .45, .45);

    for (let packet = 0; packet < 14; packet++) {
      await session.send('Input.dispatchMouseEvent', { type: 'mouseWheel', ...point, deltaX: 17, deltaY: 0 });
    }
    await expect.poll(() => values).toEqual(['recent']);
    await expect.poll(() => Math.abs(view.scrollLeft - step)).toBeLessThan(1);
    expect(positions.filter(position => position > 0 && position < step / 2).length).toBeGreaterThan(1);
    expectForwardScroll([...positions, view.scrollLeft]);
  });

  it.each([
    { label: 'reverses the transition', distance: 90, value: 'library', target: 0, changes: [] },
    { label: 'finishes the transition after a short drag', distance: 35, value: 'recent', target: 1, changes: ['recent'] },
  ])('$label when a second Panorama drag interrupts motion', async ({ distance, value, target, changes }) => {
    const { hub, values } = panoramaFixture();
    await hub.updateComplete;
    const view = viewport(hub);
    const step = hub.children[0].getBoundingClientRect().width;
    const bounds = view.getBoundingClientRect();
    const x = bounds.left + bounds.width * .53;
    const y = bounds.top + 88;
    const drag = (delta: number) => userEvent.pointer([
      { keys: '[MouseLeft>]', coords: { x, y } },
      { coords: { x: x + delta / 2, y } },
      { coords: { x: x + delta, y } },
      '[/MouseLeft]',
    ]);

    await drag(-125);
    await expect.poll(() => view.scrollLeft, { interval: 10 }).toBeGreaterThan(step * .55);
    let committedAtInterruption = '';
    let offsetAtInterruption = 0;
    let changesBeforeRelease: string[] | undefined;
    view.addEventListener('pointerdown', () => {
      committedAtInterruption = hub.value;
      offsetAtInterruption = view.scrollLeft;
    }, { capture: true, once: true });
    view.addEventListener('pointerup', () => { changesBeforeRelease = [...values]; }, { capture: true, once: true });
    await drag(distance);

    expect(committedAtInterruption).toBe('library');
    expect(offsetAtInterruption).toBeGreaterThan(step / 2);
    expect(changesBeforeRelease).toEqual([]);
    await expect.poll(() => Math.abs(view.scrollLeft - step * target)).toBeLessThan(1);
    await expect.poll(() => [hub.value, values]).toEqual([value, changes]);
  });

  it('adapts desktop layout and preserves the committed section across axis changes', async () => {
    const { hub, values } = fixture(`
      <metro-hub profile="desktop" heading="Catalog" value="trending" style="width:800px; --metro-hub-desktop-height: 240px">
        <metro-hub-section value="new" label="New" hero><div style="height: 300px"></div></metro-hub-section>
        <metro-hub-section value="trending" label="Trending"><div style="height: 300px"></div></metro-hub-section>
        <metro-hub-section value="more" label="More"><div style="height: 300px"></div></metro-hub-section>
      </metro-hub>
    `);
    await hub.updateComplete;
    const view = viewport(hub);
    await expect.poll(() => getComputedStyle(view.firstElementChild!).flexDirection).toBe('row');
    await expect.poll(() => view.scrollLeft).toBeGreaterThan(500);

    hub.style.width = '410px';
    await expect.poll(() => view.scrollTop).toBeGreaterThan(300);
    expect(view.scrollLeft).toBe(0);
    expect(hub.value).toBe('trending');
    expect(values).toEqual([]);

    hub.focusSection();
    await expect.poll(() => active(page.getByRole('heading', { name: 'Trending' }))).toBe(true);
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(() => values).toEqual(['more']);
    await expect.poll(() => active(page.getByRole('heading', { name: 'More' }))).toBe(true);
  });

  it('uses separate parallax layers and disables their movement with reduced motion', async () => {
    const { hub } = fixture(`
      <metro-hub heading="Overview" style="width: 400px" value="recent">
        <div slot="background" style="background:gray"></div>
        <metro-hub-section value="new" label="New"></metro-hub-section>
        <metro-hub-section value="recent" label="Recent"></metro-hub-section>
      </metro-hub>
    `);
    await hub.updateComplete;
    const title = hub.shadowRoot!.querySelector('h1')!;
    const background = hub.shadowRoot!.querySelector('[part="background"]')!;
    const wrapper = hub.shadowRoot!.querySelector<HTMLElement>('.section')!;
    await expect.poll(() => viewport(hub).scrollLeft).toBeGreaterThan(300);
    const titleX = new DOMMatrix(getComputedStyle(title).transform).m41;
    const backgroundX = new DOMMatrix(getComputedStyle(background).transform).m41;
    expect(Math.abs(titleX)).toBeGreaterThan(Math.abs(backgroundX));
    expect(wrapper.style.getPropertyValue('--_metro-hub-section-shift')).not.toBe('0px');

    try {
      await commands.setMetroMedia({ reducedMotion: 'reduce' });
      await expect.poll(() => getComputedStyle(title).transform).toBe('none');
      expect(getComputedStyle(background).transform).toBe('none');
    } finally {
      await commands.setMetroMedia({ reducedMotion: null });
    }
  });

  it.skipIf(server.browser !== 'chromium')('preserves vertical touch scrolling and emits one committed horizontal choice without a click', async () => {
    const { hub, host, values } = fixture(`
      <metro-hub style="width: 400px" heading="Catalog">
        <metro-hub-section value="new" label="New">
          <div id="list" style="height: 180px; overflow-y: auto">
            <button style="width: 100%; height: 72px">Open details</button>
            <div style="height: 450px"></div>
          </div>
        </metro-hub-section>
        <metro-hub-section value="recent" label="Recent"><button>Open Recent</button></metro-hub-section>
      </metro-hub>
    `);
    const list = host.querySelector<HTMLElement>('#list')!;
    const button = list.querySelector('button')!;
    let clicks = 0;
    button.addEventListener('click', () => clicks++);
    await hub.updateComplete;

    await gesture(touchPoint(list, .65, .8), 2, -112);
    await expect.poll(() => list.scrollTop).toBeGreaterThan(40);
    expect(hub.value).toBe('new');
    expect(values).toEqual([]);

    list.scrollTop = 0;
    await gesture(touchPoint(button, .8, .5), -134, 2, () => {
      expect(hub.value).toBe('new');
      expect(values).toEqual([]);
    });
    await expect.poll(() => values).toEqual(['recent']);
    expect(clicks).toBe(0);
    const recentButton = page.getByRole('button', { name: 'Open Recent' });
    await expect.element(recentButton).toBeVisible();
    recentButton.element().addEventListener('click', () => clicks++);
    await new Promise(resolve => setTimeout(resolve, 300));
    await touch('touchStart', touchPoint(recentButton.element(), .5, .5));
    await touch('touchEnd');
    await expect.poll(() => clicks).toBe(1);

    hub.value = 'new';
    await expect.poll(() => viewport(hub).scrollLeft).toBe(0);
    expect(values).toEqual(['recent']);
  });

  it.skipIf(server.browser !== 'chromium')('preserves gesture ownership for nested controls and opted-out content', async () => {
    const { hub, host, values } = fixture(`
      <metro-hub style="width: 410px" heading="Catalog">
        <metro-hub-section value="new" label="New">
          <button data-metro-no-swipe style="width: 100%; height: 70px">Map interaction</button>
          <metro-panorama style="width: 310px" heading="Preview">
            <metro-hub-section value="a" label="A"><div style="height: 55px">Inner content</div></metro-hub-section>
            <metro-hub-section value="b" label="B">Second</metro-hub-section>
          </metro-panorama>
        </metro-hub-section>
        <metro-hub-section value="more" label="More">Additional content</metro-hub-section>
      </metro-hub>
    `);
    const panorama = host.querySelector('metro-panorama')!;
    await hub.updateComplete;
    await panorama.updateComplete;

    await gesture(touchPoint(host.querySelector('button')!, .8, .5), -125, 0);
    expect(hub.value).toBe('new');
    expect(values).toEqual([]);

    const inner = panorama.querySelector('metro-hub-section[value="a"] div')!;
    await gesture(touchPoint(inner, .8, .5), -125, 0);
    await expect.poll(() => panorama.value).toBe('b');
    expect(hub.value).toBe('new');
  });

  it.skipIf(server.browser !== 'chromium')('keeps the Panorama title, collection and adjacent preview aligned', async () => {
    try {
      await commands.setMetroMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      fixture(`
        <metro-panorama label="Music panorama" heading="music" data-metro-theme="dark"
          style="inline-size: 400px; --metro-font: Arial, sans-serif; --metro-hub-min-block-size: 230px;
            --metro-hub-background: linear-gradient(125deg, #161a34, #26384c 60%, #172325)">
          <metro-hub-section value="library" label="library">
            <ul style="margin: 0; padding: 0; list-style: none; font: 21px/1.65 Arial, sans-serif">
              <li>albums</li><li>artists</li><li>playlists</li>
            </ul>
          </metro-hub-section>
          <metro-hub-section value="recent" label="recent"><p>Last played</p></metro-hub-section>
        </metro-panorama>
      `);
      await expect.element(page.getByRole('region', { name: 'Music panorama' })).toMatchScreenshot('panorama');
    } finally {
      await commands.setMetroMedia({ colorScheme: null, reducedMotion: null });
    }
  });
});

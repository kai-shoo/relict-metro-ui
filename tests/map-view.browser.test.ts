import { afterEach, describe, expect, test } from 'vitest';
import { cdp, page, server, userEvent } from 'vitest/browser';
import '../src/map-view.js';
import type { MetroMapSelectDetail, MetroMapTile, MetroMapViewChangeDetail } from '../src/map-view.js';

let fixture: HTMLDivElement | undefined;

function mount(content: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = content;
  document.body.append(fixture);
  return fixture;
}

afterEach(() => {
  fixture?.remove();
  fixture = undefined;
});

describe('Metro map view', () => {
  test('renders provider tiles and publishes keyboard pan, zoom and explicit locate requests', async () => {
    const container = mount(`
      <metro-map-view label="Atlas" locatable latitude="0" longitude="179" zoom="2" style="width: 420px; --metro-map-height: 200px">
        <span slot="attribution">Fixture map</span>
      </metro-map-view>
    `);
    const map = container.querySelector('metro-map-view')!;
    const area = page.getByRole('region', { name: 'Atlas' });
    const tiles: MetroMapTile[] = [];
    const changes: MetroMapViewChangeDetail[] = [];
    let locates = 0;
    map.tileSource = tile => {
      tiles.push(tile);
      return 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    };
    map.addEventListener('metro-map-view-change', event => changes.push(event.detail));
    map.addEventListener('metro-map-locate', () => locates++);
    await expect.element(area).toBeVisible();
    await expect.poll(() => map.shadowRoot?.querySelector('img')?.naturalWidth).toBe(1);
    expect(tiles.some(tile => tile.x === 0 && tile.z === 2)).toBe(true);
    expect(map.bounds.west).toBeGreaterThan(map.bounds.east);
    await expect.element(page.getByText('Fixture map')).toBeVisible();

    map.focus();
    await userEvent.keyboard('{ArrowDown}+');
    expect(changes.map(event => event.reason)).toEqual(['pan', 'zoom']);
    expect(changes[0].view.latitude).toBeLessThan(0);
    expect(changes[1].view.zoom).toBe(3);
    expect(changes[1].bounds.north).toBeGreaterThan(changes[1].bounds.south);
    await userEvent.click(page.getByRole('button', { name: 'My location' }));
    expect(locates).toBe(1);
    expect(map.userLocation).toBeNull();
    map.view = { latitude: 15, longitude: 20, zoom: 4 };
    expect(map.view).toEqual({ latitude: 15, longitude: 20, zoom: 4 });
    expect(changes).toHaveLength(2);
  });

  test('presents accessible marker choices and restores focus after a selected marker is removed', async () => {
    const container = mount('<metro-map-view label="Nearby" style="width: 400px"></metro-map-view>');
    const map = container.querySelector('metro-map-view')!;
    const region = page.getByRole('region', { name: 'Nearby' });
    map.markers = [
      { id: 'library', label: 'Library', latitude: 0, longitude: 0, description: 'Open through the courtyard.' },
      { id: 'park', label: 'Park', latitude: 20, longitude: 20 },
    ];
    map.userLocation = { latitude: 2, longitude: 3, label: 'Current position', accuracy: 200000 };
    const selected: MetroMapSelectDetail[] = [];
    map.addEventListener('metro-map-select', event => selected.push(event.detail));
    const list = page.getByRole('list', { name: 'Places' });
    const library = list.getByRole('button', { name: 'Library' });
    await expect.element(library).toBeVisible();
    await expect.element(region.getByRole('button', { name: 'Library' })).toBeVisible();
    await expect.element(page.getByText('Current position')).toBeVisible();
    expect(map.shadowRoot?.querySelector('[part="accuracy"]')).not.toBeNull();
    (library.element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}{Enter}');
    expect(selected.map(event => event.id)).toEqual(['library']);
    await expect.element(page.getByText('Open through the courtyard.')).toBeVisible();
    await expect.element(library).toHaveAttribute('aria-pressed', 'true');

    map.markers = map.markers.filter(marker => marker.id !== 'library');
    const park = list.getByRole('button', { name: 'Park' });
    await expect.poll(() => map.shadowRoot?.activeElement).toBe(park.element());
    map.selected = 'park';
    map.focusSelectedMarker();
    expect(map.shadowRoot?.activeElement).toBe(park.element());
    expect(selected).toHaveLength(1);
  });

  test('keeps focus on the same marker when its pin leaves the map and on the map at zoom limits', async () => {
    const container = mount('<metro-map-view label="Atlas" zoom="4" style="width: 320px"></metro-map-view>');
    const map = container.querySelector('metro-map-view')!;
    map.markers = [
      { id: 'library', label: 'Library', latitude: 0, longitude: -2 },
      { id: 'park', label: 'Park', latitude: 0, longitude: 2 },
    ];
    map.selected = 'library';
    const viewport = page.getByRole('region', { name: 'Atlas' });
    const pin = viewport.getByRole('button', { name: 'Park' });
    const park = page.getByRole('list', { name: 'Places' }).getByRole('button', { name: 'Park' });
    await expect.element(pin).toBeVisible();
    (pin.element() as HTMLElement).focus();
    map.view = { latitude: 0, longitude: 75, zoom: 4 };
    await map.updateComplete;
    expect(map.shadowRoot?.activeElement).toBe(park.element());
    expect(map.selected).toBe('library');

    map.zoom = 18;
    const zoomIn = page.getByRole('button', { name: 'Zoom in' });
    await expect.element(zoomIn).toBeEnabled();
    (zoomIn.element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(zoomIn).toBeDisabled();
    expect(map.shadowRoot?.activeElement).toBe(viewport.element());
    await userEvent.keyboard('-');
    expect(map.zoom).toBe(18);
  });

  test.each(['ltr', 'rtl'])('keeps enlarged map commands and place names within a narrow %s map', async direction => {
    const container = mount(`<style>:root { font-size: 200%; }</style>
      <metro-map-view dir="${direction}" locatable style="width: 320px"
        locate-label="Standortbestimmungsanfrage"></metro-map-view>`);
    const map = container.querySelector('metro-map-view')!;
    map.markers = [{ id: 'point', label: 'Wasseraufbereitungsanlage', latitude: 0, longitude: 0 }];
    await map.updateComplete;
    const root = map.shadowRoot!;
    const tool = root.querySelector('[part="locate"]')!;
    const place = root.querySelector('[part="place"]')!;
    const bounds = map.getBoundingClientRect();
    for (const button of [tool, place]) {
      const outer = button.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(button);
      const text = range.getBoundingClientRect();
      expect(outer.left).toBeGreaterThanOrEqual(bounds.left - 1);
      expect(outer.right).toBeLessThanOrEqual(bounds.right + 1);
      expect(text.left).toBeGreaterThanOrEqual(outer.left - 1);
      expect(text.right).toBeLessThanOrEqual(outer.right + 1);
      expect(outer.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('commits one pan on pointer release and discards a cancelled move', async () => {
    const container = mount('<metro-map-view label="Panning map" style="width: 400px"></metro-map-view>');
    const map = container.querySelector('metro-map-view')!;
    const viewport = page.getByRole('region', { name: 'Panning map' });
    await expect.element(viewport).toBeVisible();
    const node = viewport.element() as HTMLElement;
    const bounds = node.getBoundingClientRect();
    const start = { x: bounds.left + 120, y: bounds.top + 100 };
    const end = { x: start.x + 85, y: start.y };
    const changes: MetroMapViewChangeDetail[] = [];
    map.addEventListener('metro-map-view-change', event => changes.push(event.detail));
    await userEvent.pointer([{ keys: '[MouseLeft>]', coords: start }, { coords: end }]);
    expect(map.view.longitude).toBe(0);
    expect(changes).toEqual([]);
    await userEvent.pointer('[/MouseLeft]');
    expect(changes).toHaveLength(1);
    expect(map.view.longitude).toBeLessThan(0);

    let pointerId = 0;
    node.addEventListener('pointerdown', event => { pointerId = event.pointerId; });
    const previous = map.view;
    await userEvent.pointer([{ keys: '[MouseLeft>]', coords: start }, { coords: end }]);
    node.dispatchEvent(new PointerEvent('pointercancel', { pointerId, pointerType: 'mouse', bubbles: true }));
    await userEvent.pointer('[/MouseLeft]');
    expect(map.view).toEqual(previous);
    expect(changes).toHaveLength(1);
  });

  test.skipIf(server.browser !== 'chromium')('pans the dedicated surface with emulated touch', async () => {
    const container = mount('<metro-map-view label="Touch map" style="width: 400px"></metro-map-view>');
    const map = container.querySelector('metro-map-view')!;
    const area = page.getByRole('region', { name: 'Touch map' });
    await expect.element(area).toBeVisible();
    const bounds = area.element().getBoundingClientRect();
    const iframe = window.frameElement?.getBoundingClientRect();
    const start = { x: bounds.left + 130 + (iframe?.left ?? 0), y: bounds.top + 140 + (iframe?.top ?? 0) };
    const session = cdp();
    await session.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    try {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
      for (let step = 1; step <= 6; step++) {
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchMove', touchPoints: [{ x: start.x - step * 12, y: start.y }],
        });
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.poll(() => map.view.longitude).toBeGreaterThan(0);
    } finally {
      await session.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    }
  });
});

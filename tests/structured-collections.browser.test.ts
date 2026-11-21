import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/semantic-zoom.js';
import '../src/items-repeater.js';
import '../src/items-view.js';
import '../src/annotated-scroll-bar.js';
import '../src/scroll-viewer.js';

let fixture: HTMLDivElement | undefined;

function mount(markup: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = markup;
  document.body.append(fixture);
  return fixture;
}

afterEach(() => fixture?.remove());

test('SemanticZoom returns to the same anchor on Escape and opens the selected group by key', async () => {
  const container = mount(`<metro-semantic-zoom>
    <metro-scroll-viewer slot="detail" label="Authors" style="height:100px">
      <section style="height:100px" data-metro-key="alpha">Alpha entries</section>
      <section style="height:100px" data-metro-key="beta">Beta entries</section>
      <section style="height:100px" data-metro-key="gamma">Gamma entries</section>
    </metro-scroll-viewer>
  </metro-semantic-zoom>`);
  const zoom = container.querySelector('metro-semantic-zoom')!;
  const list = container.querySelector('metro-scroll-viewer')!;
  zoom.groups = [
    { value: 'a', label: 'Alpha', anchor: 'alpha' },
    { value: 'b', label: 'Beta', anchor: 'beta' },
    { value: 'c', label: 'Gamma', anchor: 'gamma' },
    { value: 'unavailable', label: 'Unavailable', disabled: true },
  ];
  const changes = vi.fn();
  zoom.addEventListener('metro-zoom-change', event => changes(event.detail));
  const show = page.getByRole('button', { name: 'Groups' });
  await expect.element(show).toBeEnabled();
  list.scrollTop = 110;
  await show.click();
  await expect.element(page.getByRole('button', { name: 'Beta' })).toHaveAttribute('aria-current', 'location');
  expect(zoom.shadowRoot?.activeElement?.textContent?.trim()).toBe('Beta');
  await expect.element(page.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => list.getAnchor()).toEqual({ key: 'beta', offset: -10, axis: 'vertical' });
  expect(zoom.shadowRoot?.activeElement).toBe(show.element());

  await show.click();
  await page.getByRole('button', { name: 'Gamma' }).click();
  await expect.poll(() => list.getAnchor()).toEqual({ key: 'gamma', offset: 0, axis: 'vertical' });
  expect(zoom.value).toBe('c');
  expect(document.activeElement?.textContent?.trim()).toBe('Gamma entries');
  expect(changes.mock.calls.map(([event]) => event)).toEqual([
    { view: 'overview', value: 'b' }, { view: 'detail', value: 'b' },
    { view: 'overview', value: 'b' }, { view: 'detail', value: 'c' },
  ]);
});

test('SemanticZoom reveals the current group in a scrollable overview and restores the detail anchor', async () => {
  const container = mount(`
    <style>metro-semantic-zoom::part(overview) { inline-size: 120px; block-size: 120px; overflow: auto; }</style>
    <metro-semantic-zoom>
      <metro-scroll-viewer slot="detail" label="Authors" style="height:100px">
        <section style="height:100px" data-metro-key="a">Alpha entries</section>
        <section style="height:180px" data-metro-key="b">Beta entries</section>
      </metro-scroll-viewer>
    </metro-semantic-zoom>
  `);
  const zoom = container.querySelector('metro-semantic-zoom')!;
  const detail = container.querySelector('metro-scroll-viewer')!;
  zoom.groups = [{ value: 'a', label: 'Alpha' }, { value: 'other', label: 'Other' }, { value: 'b', label: 'Beta' }];
  const show = page.getByRole('button', { name: 'Groups' });
  await expect.element(show).toBeEnabled();
  detail.scrollTop = 115;
  await show.click();
  const choice = page.getByRole('button', { name: 'Beta', exact: true });
  await expect.poll(() => zoom.shadowRoot?.activeElement).toBe(choice.element());
  const overview = zoom.shadowRoot!.querySelector('[part="overview"]')!;
  const panel = overview.getBoundingClientRect();
  const item = choice.element().getBoundingClientRect();
  expect(item.top).toBeGreaterThanOrEqual(panel.top - 1);
  expect(item.bottom).toBeLessThanOrEqual(panel.bottom + 1);
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => detail.getAnchor()).toEqual({ key: 'b', offset: -15, axis: 'vertical' });
});

test('SemanticZoom accepts a custom overview and leaves it open if a section disappeared', async () => {
  const container = mount(`<metro-semantic-zoom>
    <div slot="detail" style="height:60px;overflow:auto">
      <section style="height:100px" data-metro-group="one">Content</section>
    </div>
    <div slot="overview">
      <button type="button" data-metro-group="missing">Removed</button>
      <button type="button" data-metro-group="one">Existing</button>
    </div>
  </metro-semantic-zoom>`);
  const zoom = container.querySelector('metro-semantic-zoom')!;
  const change = vi.fn();
  zoom.addEventListener('metro-zoom-change', change);
  await zoom.updateComplete;
  expect(zoom.showOverview()).toBe(true);
  await page.getByRole('button', { name: 'Removed' }).click();
  await expect.element(page.getByRole('button', { name: 'Removed' })).toBeVisible();
  expect(zoom.view).toBe('overview');
  expect(change).not.toHaveBeenCalled();
  await page.getByRole('button', { name: 'Existing' }).click();
  await expect.poll(() => zoom.view).toBe('detail');
  expect(change).toHaveBeenCalledTimes(1);
  expect(zoom.value).toBe('one');
});

test('SemanticZoom keeps the overview open when its target is hidden', async () => {
  const container = mount(`<metro-semantic-zoom>
    <metro-scroll-viewer slot="detail" style="height:80px">
      <div data-metro-key="first" style="height:100px">First row</div>
      <div data-metro-key="target" style="height:130px">Target row</div>
    </metro-scroll-viewer>
  </metro-semantic-zoom>`);
  const zoom = container.querySelector('metro-semantic-zoom')!;
  const row = container.querySelector<HTMLElement>('[data-metro-key="target"]')!;
  zoom.groups = [{ value: 'target', label: 'Target group' }];
  await zoom.updateComplete;
  expect(zoom.showOverview()).toBe(true);
  const target = page.getByRole('button', { name: 'Target group' });
  await expect.element(target).toBeVisible();
  const events = vi.fn();
  zoom.addEventListener('metro-zoom-change', events);
  row.style.visibility = 'hidden';
  await target.click();
  await expect.element(target).toBeVisible();
  await expect.poll(() => zoom.shadowRoot?.activeElement).toBe(target.element());
  expect(zoom.view).toBe('overview');
  expect(events).not.toHaveBeenCalled();

  row.style.visibility = '';
  await target.click();
  await expect.poll(() => events.mock.calls.length).toBe(1);
  expect(zoom.view).toBe('detail');
  expect(container.querySelector('metro-scroll-viewer')!.getAnchor()?.key).toBe('target');
});

test('SemanticZoom preserves an external focus change during return to details', async () => {
  const container = mount(`<metro-semantic-zoom>
    <div slot="detail"><button type="button">Saved notes</button></div>
  </metro-semantic-zoom>
  <button type="button">Outside zoom</button>`);
  const zoom = container.querySelector('metro-semantic-zoom')!;
  const [saved, outside] = container.querySelectorAll('button');
  zoom.groups = [{ value: 'one', label: 'One' }];
  await zoom.updateComplete;
  saved.focus();
  expect(zoom.showOverview()).toBe(true);
  await expect.element(page.getByRole('button', { name: 'One' })).toBeVisible();

  const pending = zoom.showDetail();
  outside.focus();
  expect(await pending).toBe(true);
  expect(document.activeElement).toBe(outside);
});

test('SemanticZoom uses enabled focus targets when groups or the saved detail control become unavailable', async () => {
  const container = mount(`<metro-semantic-zoom>
    <div slot="detail"><button type="button">Author notes</button></div>
  </metro-semantic-zoom>`);
  const zoom = container.querySelector('metro-semantic-zoom')!;
  const notes = container.querySelector('button')!;
  const events = vi.fn();
  zoom.addEventListener('metro-zoom-change', events);
  zoom.groups = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }];
  await zoom.updateComplete;
  notes.focus();
  expect(zoom.showOverview()).toBe(true);
  const alpha = page.getByRole('button', { name: 'Alpha' });
  await expect.element(alpha).toBeVisible();
  expect(zoom.shadowRoot?.activeElement).toBe(alpha.element());
  zoom.groups = [{ value: 'b', label: 'Beta' }, { value: 'c', label: 'Gamma' }];
  const beta = page.getByRole('button', { name: 'Beta' });
  await expect.element(alpha).not.toBeInTheDocument();
  expect(zoom.shadowRoot?.activeElement).toBe(beta.element());
  zoom.groups = [{ value: 'b', label: 'Beta', disabled: true }, { value: 'c', label: 'Gamma' }];
  await expect.element(beta).toBeDisabled();
  expect(zoom.shadowRoot?.activeElement).toBe(page.getByRole('button', { name: 'Gamma' }).element());
  notes.disabled = true;
  expect(await zoom.showDetail()).toBe(true);
  expect(zoom.shadowRoot?.activeElement).toBe(page.getByRole('button', { name: 'Groups' }).element());
  expect(events).not.toHaveBeenCalled();
});

test('SemanticZoom returns focus to its toggle when the saved control moves outside the detail view', async () => {
  const container = mount(`<metro-semantic-zoom>
    <div slot="detail"><button type="button">Saved notes</button></div>
  </metro-semantic-zoom>`);
  const zoom = container.querySelector('metro-semantic-zoom')!;
  const saved = container.querySelector('button')!;
  zoom.groups = [{ value: 'one', label: 'One' }];
  await zoom.updateComplete;
  saved.focus();
  expect(zoom.showOverview()).toBe(true);
  await expect.element(page.getByRole('button', { name: 'One' })).toBeVisible();

  container.append(saved);
  expect(await zoom.showDetail()).toBe(true);
  expect(zoom.shadowRoot?.activeElement).toBe(page.getByRole('button', { name: 'Groups' }).element());
});

test('SemanticZoom wraps a localized toggle label inside an enlarged narrow view', async () => {
  const container = mount('<metro-semantic-zoom dir="rtl" style="inline-size:241px;font-size:2rem"></metro-semantic-zoom>');
  const zoom = container.querySelector('metro-semantic-zoom')!;
  const label = 'Abschnittsübersicht'.repeat(3);
  zoom.overviewLabel = label;
  zoom.groups = [{ value: 'start', label: 'Start' }];
  const trigger = page.getByRole('button', { name: label, exact: true });
  await expect.element(trigger).toBeEnabled();
  const bounds = zoom.getBoundingClientRect();
  const button = trigger.element().getBoundingClientRect();
  expect(button.left).toBeGreaterThanOrEqual(bounds.left);
  expect(button.right).toBeLessThanOrEqual(bounds.right);
  expect(trigger.element().scrollWidth).toBeLessThanOrEqual(trigger.element().clientWidth);
});

test('ItemsRepeater updates template fields and keeps stateful DOM and focus with the key', async () => {
  const container = mount(`<metro-items-repeater>
    <template><article><strong data-metro-field="name"></strong><input aria-label="Note"></article></template>
    <p slot="empty">No entries</p>
  </metro-items-repeater>`);
  const repeater = container.querySelector('metro-items-repeater')!;
  repeater.keyFor = item => (item as { id: string }).id;
  const first = { id: 'a', name: 'Ana' };
  const second = { id: 'b', name: 'Bryn' };
  repeater.items = [first, second];
  await repeater.updateComplete;
  const item = repeater.getElement('a')!;
  const input = item.querySelector<HTMLInputElement>('input')!;
  await userEvent.fill(input, 'Local note');
  input.focus();
  repeater.items = [second, { ...first, name: 'Updated Ana' }];
  await repeater.updateComplete;
  expect(repeater.getElement('a')).toBe(item);
  expect(item.firstElementChild?.textContent).toBe('Updated Ana');
  expect(item.querySelector('input')).toBe(input);
  expect(input.value).toBe('Local note');
  expect(repeater.shadowRoot?.activeElement).toBe(input);

  repeater.items = [];
  await expect.element(page.getByText('No entries')).toBeVisible();
  expect(repeater.getElement('a')).toBeNull();
});

test('ItemsView keeps a rich keyed renderer while switching between list and grid', async () => {
  const container = mount('<metro-items-view label="Photos" selection-mode="single" activatable columns="2"></metro-items-view>');
  const view = container.querySelector('metro-items-view')!;
  const records = [{ value: 'a', label: 'Alpha', caption: 'First' }, { value: 'b', label: 'Beta', caption: 'Second' }];
  view.items = records;
  view.renderItem = (item, root) => {
    let caption = root.querySelector('strong');
    if (!caption) {
      caption = document.createElement('strong');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `Options for ${item.label}`;
      root.append(caption, button);
    }
    caption.textContent = (item as typeof records[number]).caption;
  };
  const select = vi.fn();
  const activate = vi.fn();
  view.addEventListener('metro-selection-change', select);
  view.addEventListener('metro-item-activate', activate);
  const grid = page.getByRole('grid', { name: 'Photos' });
  const beta = grid.getByRole('gridcell', { name: 'Beta' });
  await expect.element(beta).toBeVisible();
  const root = view.getElement('b')!;
  expect(root.querySelector('strong')?.textContent).toBe('Second');
  await beta.click();
  expect(view.value).toBe('b');
  await userEvent.keyboard('{Enter}');
  expect(select).toHaveBeenCalledTimes(1);
  expect(activate).toHaveBeenCalledTimes(1);

  const options = root.querySelector('button')!;
  await userEvent.click(options);
  expect(view.shadowRoot?.activeElement).toBe(options);

  view.itemLayout = 'grid';
  view.items = [records[0], { ...records[1], caption: 'Updated' }];
  await view.updateComplete;
  expect(view.getElement('b')).toBe(root);
  expect(root.querySelector('strong')?.textContent).toBe('Updated');
  expect(grid.getByRole('row').length).toBe(1);
  expect(view.shadowRoot?.activeElement).toBe(options);
  await expect.element(beta).toHaveAttribute('aria-selected', 'true');
  expect(select).toHaveBeenCalledTimes(1);
});

test('AnnotatedScrollBar drives a real scroller, follows passive movement and skips disabled markers', async () => {
  const container = mount(`<metro-scroll-viewer id="pages" style="height:100px" label="Document">
    <section style="height:100px" data-metro-key="intro">Introduction</section>
    <section style="height:100px" data-metro-key="notes">Notes</section>
    <section style="height:100px" data-metro-key="end">Last page</section>
  </metro-scroll-viewer>
  <metro-annotated-scroll-bar for="pages"></metro-annotated-scroll-bar>`);
  const viewer = container.querySelector('metro-scroll-viewer')!;
  const bar = container.querySelector('metro-annotated-scroll-bar')!;
  bar.annotations = [
    { value: 'start', label: 'Start', anchor: 'intro' },
    { value: 'unavailable', label: 'Unavailable', disabled: true },
    { value: 'notes', label: 'Jump to notes' },
    { value: 'end', label: 'End' },
  ];
  const change = vi.fn();
  bar.addEventListener('metro-annotation-change', event => change(event.detail));
  const slider = page.getByRole('slider', { name: 'Scroll position' });
  await expect.element(slider).toHaveAttribute('max', '200');
  const start = page.getByRole('button', { name: 'Start' });
  await start.click();
  await userEvent.keyboard('{ArrowDown}{Enter}');
  expect(viewer.scrollTop).toBe(100);
  expect(bar.value).toBe('notes');
  expect(change).toHaveBeenLastCalledWith({ value: 'notes', anchor: 'notes' });
  expect(change).toHaveBeenCalledTimes(2);

  viewer.scrollTop = 200;
  await expect.poll(() => bar.value).toBe('end');
  await expect.element(slider).toHaveValue('200');
  expect(bar.scrollToAnnotation('start')).toBe(true);
  expect(viewer.scrollTop).toBe(0);
  expect(bar.scrollToAnnotation('unavailable')).toBe(false);
  (slider.element() as HTMLInputElement).focus();
  await userEvent.keyboard('{End}');
  expect(viewer.scrollTop).toBe(200);
  expect(change).toHaveBeenCalledTimes(2);
});

test('AnnotatedScrollBar keeps keyboard focus when the focused marker is disabled or removed', async () => {
  const container = mount(`<metro-scroll-viewer id="pages" style="height:100px">
    <section style="height:100px" data-metro-key="start">Start</section>
    <section style="height:100px" data-metro-key="end">End</section>
  </metro-scroll-viewer><metro-annotated-scroll-bar for="pages"></metro-annotated-scroll-bar>`);
  const bar = container.querySelector('metro-annotated-scroll-bar')!;
  const markers = [{ value: 'start', label: 'Jump to start' }, { value: 'end', label: 'Jump to end' }];
  bar.annotations = markers;
  const change = vi.fn();
  bar.addEventListener('metro-annotation-change', change);
  const start = page.getByRole('button', { name: 'Jump to start' });
  const end = page.getByRole('button', { name: 'Jump to end' });
  await expect.element(end).toBeVisible();
  expect(bar.scrollToAnnotation('end')).toBe(true);
  expect(bar.value).toBe('end');
  (end.element() as HTMLButtonElement).focus();
  bar.annotations = [markers[0], { ...markers[1], disabled: true }];
  await bar.updateComplete;
  expect(bar.shadowRoot?.activeElement).toBe(start.element());
  expect(bar.value).toBe('start');
  bar.annotations = [];
  await bar.updateComplete;
  expect(bar.shadowRoot?.activeElement).toBe(page.getByRole('slider', { name: 'Scroll position' }).element());
  expect(bar.value).toBe('');
  expect(change).not.toHaveBeenCalled();
});

test('AnnotatedScrollBar skips hidden anchors and re-enables their markers when they return', async () => {
  const container = mount(`<metro-scroll-viewer id="pages" style="height:100px">
    <section style="height:100px" data-metro-key="start">Start</section>
    <section style="height:100px" data-metro-key="notes">Notes</section>
    <section style="height:100px" data-metro-key="end">End</section>
  </metro-scroll-viewer><metro-annotated-scroll-bar for="pages"></metro-annotated-scroll-bar>`);
  const viewer = container.querySelector('metro-scroll-viewer')!;
  const bar = container.querySelector('metro-annotated-scroll-bar')!;
  const notesRow = container.querySelector<HTMLElement>('[data-metro-key="notes"]')!;
  bar.annotations = [{ value: 'start', label: 'Start' }, { value: 'notes', label: 'Notes' }, { value: 'end', label: 'End' }];
  const change = vi.fn();
  bar.addEventListener('metro-annotation-change', change);
  const notes = page.getByRole('button', { name: 'Notes', exact: true });
  const start = page.getByRole('button', { name: 'Start', exact: true });
  const end = page.getByRole('button', { name: 'End', exact: true });
  await notes.click();
  await expect.element(notes).toHaveAttribute('aria-current', 'location');
  (notes.element() as HTMLButtonElement).focus();

  notesRow.style.visibility = 'hidden';
  await expect.element(notes).toBeDisabled();
  await expect.element(notes).not.toHaveAttribute('aria-current');
  expect(bar.value).toBe('start');
  expect(bar.shadowRoot?.activeElement).toBe(start.element());
  expect(bar.scrollToAnnotation('notes')).toBe(false);
  expect(viewer.scrollTop).toBe(100);
  expect(bar.shadowRoot?.querySelectorAll('[part="tick"]')).toHaveLength(2);

  await userEvent.keyboard('{ArrowDown}');
  expect(bar.shadowRoot?.activeElement).toBe(end.element());
  expect(change).toHaveBeenCalledTimes(1);
  notesRow.style.removeProperty('visibility');
  await expect.element(notes).toBeEnabled();
  await userEvent.keyboard('{ArrowUp}{Enter}');
  expect(bar.value).toBe('notes');
  expect(change).toHaveBeenCalledTimes(2);
  expect(change.mock.lastCall?.[0].detail).toEqual({ value: 'notes', anchor: 'notes' });
});

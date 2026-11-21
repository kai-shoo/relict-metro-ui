import { beforeEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/expander.js';
import '../src/scroll-viewer.js';

beforeEach(() => { document.body.replaceChildren(); });

test('Expander exposes its disclosure with keyboard and restores focus when closed from code', async () => {
  document.body.innerHTML = `
    <metro-expander label="Archive options">
      <button type="button">Download</button>
    </metro-expander>
  `;
  const expander = document.querySelector('metro-expander')!;
  const toggle = vi.fn();
  expander.addEventListener('metro-toggle', toggle);
  await expander.updateComplete;
  const header = expander.shadowRoot!.querySelector('summary')!;
  const details = expander.shadowRoot!.querySelector('details')!;
  const download = page.getByRole('button', { name: 'Download', exact: true });

  expect(header.textContent?.trim()).toBe('Archive options');
  expect(expander.open).toBe(false);
  await userEvent.tab();
  expect(expander.shadowRoot!.activeElement).toBe(header);
  await userEvent.keyboard('{Enter}');
  await expect.element(download).toBeVisible();
  await expect.poll(() => expander.open).toBe(true);
  expect(toggle).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ detail: { open: true } }));

  await userEvent.tab();
  await expect.element(download).toHaveFocus();
  expander.open = false;
  await expander.updateComplete;
  expect(details.open).toBe(false);
  expect(expander.shadowRoot!.activeElement).toBe(header);
  expect(toggle).toHaveBeenCalledTimes(1);
});

test('Expander wraps a long slotted heading within its bounds at 200% text', async () => {
  document.body.innerHTML = `
    <metro-expander style="inline-size: 190px">
      <span slot="label">Электроснабжение</span>
      <button type="button">Download</button>
    </metro-expander>`;
  const expander = document.querySelector('metro-expander')!;
  await expander.updateComplete;
  const summary = expander.shadowRoot!.querySelector('summary')!;
  const root = document.documentElement;
  const baseSize = root.style.fontSize;
  root.style.fontSize = '200%';
  try {
    const text = expander.querySelector('[slot="label"]')!;
    const range = new Range();
    range.selectNodeContents(text);
    const bounds = summary.getBoundingClientRect();
    const label = range.getBoundingClientRect();
    expect(label.right).toBeLessThanOrEqual(bounds.right);
    expect(range.getClientRects().length).toBeGreaterThan(1);
  } finally {
    root.style.fontSize = baseSize;
  }
});

test('Expander applies an assignment made before the queued native toggle', async () => {
  document.body.innerHTML = '<metro-expander label="Archive"><p>Entries</p></metro-expander>';
  const expander = document.querySelector('metro-expander')!;
  const toggle = vi.fn();
  expander.addEventListener('metro-toggle', toggle);
  await expander.updateComplete;
  const details = expander.shadowRoot!.querySelector('details')!;
  const nativeToggle = new Promise<void>(resolve => details.addEventListener('toggle', () => resolve(), { once: true }));
  details.querySelector('summary')!.click();
  expect(details.open).toBe(true);
  expander.open = false;
  await nativeToggle;
  await expander.updateComplete;
  expect(details.open).toBe(false);
  expect(expander.open).toBe(false);
  expect(toggle).not.toHaveBeenCalled();

  const userToggle = new Promise<void>(resolve => details.addEventListener('toggle', () => resolve(), { once: true }));
  details.querySelector('summary')!.click();
  expander.label = 'Updated archive';
  await userToggle;
  expect(expander.open).toBe(true);
  expect(toggle).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ detail: { open: true } }));
});

test('Expander preserves focus on a visible action in the summary when collapsed', async () => {
  document.body.innerHTML = `
    <metro-expander open>
      <a slot="label" href="#archive">Archive reference</a>
      <p>Entries</p>
    </metro-expander>`;
  const expander = document.querySelector('metro-expander')!;
  const link = page.getByRole('link', { name: 'Archive reference' });
  await expect.element(link).toBeVisible();
  (link.element() as HTMLElement).focus();
  expander.open = false;
  await expander.updateComplete;
  expect(expander.shadowRoot!.querySelector('details')!.open).toBe(false);
  await expect.element(link).toHaveFocus();
});

test('Expander restores the heading when focused content disappears and respects external focus', async () => {
  document.body.innerHTML = `
    <metro-expander label="Archive" open>
      <div id="records"><button type="button">Old record</button></div>
    </metro-expander>
    <button type="button">After archive</button>`;
  const expander = document.querySelector('metro-expander')!;
  const records = document.querySelector('#records')!;
  const after = page.getByRole('button', { name: 'After archive' });
  const changes = vi.fn();
  expander.addEventListener('metro-toggle', changes);
  await expander.updateComplete;
  const header = expander.shadowRoot!.querySelector('summary')!;
  header.focus();
  await userEvent.keyboard('{Tab}');
  await expect.element(page.getByRole('button', { name: 'Old record' })).toHaveFocus();

  records.innerHTML = '<button type="button">New record</button>';
  await expect.poll(() => expander.shadowRoot!.activeElement).toBe(header);
  await userEvent.keyboard('{Tab}');
  await expect.element(page.getByRole('button', { name: 'New record' })).toHaveFocus();
  records.replaceChildren();
  (after.element() as HTMLElement).focus();
  await expect.element(after).toHaveFocus();
  expect(expander.open).toBe(true);
  expect(changes).not.toHaveBeenCalled();
});

test('ScrollViewer restores a stable row and offset after the content changes', async () => {
  document.body.innerHTML = `
    <metro-scroll-viewer label="Contacts" style="height: 125px; overflow-anchor: none">
      ${['anna', 'bryn', 'cher', 'dara'].map(
        key => `<div data-metro-key="${key}" style="block-size: 100px">${key}</div>`,
      ).join('')}
    </metro-scroll-viewer>
  `;
  const viewer = document.querySelector('metro-scroll-viewer')!;
  await viewer.updateComplete;
  expect(viewer.clientHeight).toBe(125);

  viewer.scrollTop = 118;
  const anchor = viewer.getAnchor();
  expect(anchor).toEqual({ key: 'bryn', offset: -18, axis: 'vertical' });

  viewer.insertAdjacentHTML('afterbegin', '<div data-metro-key="ada" style="height: 70px">ada</div>');
  viewer.scrollTop = 0;
  expect(viewer.restoreAnchor(anchor!)).toBe(true);
  expect(viewer.scrollTop).toBe(188);
  expect(viewer.getAnchor()).toEqual(anchor);

  viewer.querySelector('[data-metro-key="bryn"]')?.remove();
  expect(viewer.restoreAnchor(anchor!)).toBe(false);
});

test('ScrollViewer skips CSS-hidden and clipped rows when capturing a visible anchor', async () => {
  document.body.innerHTML = `
    <metro-scroll-viewer style="height: 140px">
      <div style="height: 0; overflow: hidden">
        <div data-metro-key="clipped" style="height: 50px">Clipped</div>
      </div>
      <div data-metro-key="hidden" style="visibility: hidden; height: 20px">Invisible</div>
      <div data-metro-key="visible" style="height: 70px">Visible</div>
    </metro-scroll-viewer>
  `;
  const viewer = document.querySelector('metro-scroll-viewer')!;
  await viewer.updateComplete;
  expect(viewer.getAnchor()).toEqual({ key: 'visible', axis: 'vertical', offset: 20 });
});

test('ScrollViewer keeps the anchor row visible when it shrinks below its saved offset', async () => {
  document.body.innerHTML = `
    <metro-scroll-viewer style="height:100px;overflow-anchor:none">
      <div style="height:100px"></div>
      <div data-metro-key="target" style="height:100px">Current row</div>
      <div data-metro-key="after" style="height:200px">Following row</div>
    </metro-scroll-viewer>`;
  const viewer = document.querySelector('metro-scroll-viewer')!;
  await viewer.updateComplete;
  viewer.scrollTop = 145;
  const anchor = viewer.getAnchor()!;
  expect(anchor).toEqual({ axis: 'vertical', key: 'target', offset: -45 });

  const row = viewer.querySelector<HTMLElement>('[data-metro-key="target"]')!;
  row.style.height = '12px';
  expect(viewer.restoreAnchor(anchor)).toBe(true);
  expect(viewer.scrollTop).toBe(100);
  expect(viewer.getAnchor()).toEqual({ axis: 'vertical', key: 'target', offset: 0 });
  row.style.visibility = 'hidden';
  expect(viewer.restoreAnchor(anchor)).toBe(false);
});

test('ScrollViewer tracks the leading edge of horizontal RTL content', async () => {
  document.body.innerHTML = `
    <metro-scroll-viewer dir="rtl" orientation="horizontal" style="inline-size:150px;overflow-anchor:none">
      <div style="display:flex;inline-size:max-content">
        ${['first', 'target', 'next', 'last'].map(key =>
          `<div data-metro-key="${key}" style="inline-size:100px;height:64px">${key}</div>`).join('')}
      </div>
    </metro-scroll-viewer>`;
  const viewer = document.querySelector('metro-scroll-viewer')!;
  await viewer.updateComplete;
  viewer.scrollLeft = -118;
  const anchor = viewer.getAnchor()!;
  expect(anchor).toEqual({ axis: 'horizontal', key: 'target', offset: -18, edge: 'right' });

  const target = viewer.querySelector<HTMLElement>('[data-metro-key="target"]')!;
  target.style.inlineSize = '140px';
  viewer.querySelector('[data-metro-key="first"]')!.insertAdjacentHTML('beforebegin', '<div style="inline-size:40px"></div>');
  viewer.scrollLeft = 0;
  expect(viewer.restoreAnchor(anchor)).toBe(true);
  expect(viewer.scrollLeft).toBe(-158);
  expect(viewer.getAnchor()).toEqual(anchor);
  expect(viewer.restoreAnchor({ axis: 'horizontal', key: 'target', offset: 20 })).toBe(true);
  expect(target.getBoundingClientRect().left - viewer.getBoundingClientRect().left).toBe(20);
});

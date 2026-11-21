import { beforeEach, expect, test, vi } from 'vitest';
import { page, userEvent, type Locator } from 'vitest/browser';
import '../src/tab-view.js';

beforeEach(() => { document.body.replaceChildren(); });

const documents = `
  <metro-tab-view value="alpha" label="Notes" reorderable>
    <metro-tab-view-item value="alpha" label="Alpha" closable>
      <input aria-label="Alpha draft">
    </metro-tab-view-item>
    <metro-tab-view-item value="beta" label="Beta" closable>
      <input aria-label="Beta draft">
    </metro-tab-view-item>
    <metro-tab-view-item value="gamma" label="Gamma" closable></metro-tab-view-item>
    <p slot="empty">Open a note</p>
  </metro-tab-view>
`;

test('document tabs keep each draft and separate focus from activation', async () => {
  document.body.innerHTML = documents;
  const view = document.querySelector('metro-tab-view')!;
  const change = vi.fn();
  view.addEventListener('metro-change', change);
  const alpha = page.getByRole('tab', { name: 'Alpha' });
  const beta = page.getByRole('tab', { name: 'Beta' });

  await expect.element(alpha).toHaveAttribute('aria-selected', 'true');
  expect(view.shadowRoot?.querySelector('[role="tablist"] .close')).toBeNull();
  await expect.element(page.getByRole('button', { name: 'Close Alpha' })).toBeVisible();
  await userEvent.tab();
  await userEvent.keyboard('{ArrowRight}');
  expect(view.shadowRoot?.activeElement).toBe(beta.element());
  expect(view.value).toBe('alpha');
  await userEvent.keyboard('{Enter}');
  await expect.element(beta).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('textbox', { name: 'Beta draft' }).fill('pending changes');
  await userEvent.keyboard('{Control>}{Shift>}{Tab}{/Shift}{/Control}');
  await expect.element(alpha).toHaveAttribute('aria-selected', 'true');
  view.value = 'beta';
  await expect.element(page.getByRole('textbox', { name: 'Beta draft' })).toHaveValue('pending changes');
  expect(change.mock.calls.map(([event]) => event.detail.value)).toEqual(['beta', 'alpha']);
});

test('close waits for the document guard and picks the nearest surviving active tab', async () => {
  document.body.innerHTML = documents;
  const view = document.querySelector('metro-tab-view')!;
  view.value = 'beta';
  const draft = page.getByRole('textbox', { name: 'Beta draft' });
  await draft.fill('private draft');
  let decide!: (allowed: boolean) => void;
  const pending = new Promise<boolean>(resolve => { decide = resolve; });
  view.addEventListener('metro-before-tab-close', event => event.detail.waitUntil(pending), { once: true });
  const firstClose = view.closeTab('beta');
  expect(view.closeTab('beta')).toBe(firstClose);
  decide(false);
  await expect(firstClose).resolves.toBe(false);
  expect(view.value).toBe('beta');
  await expect.element(draft).toHaveValue('private draft');

  await expect(view.closeTab('alpha')).resolves.toBe(true);
  await expect.element(draft).toHaveFocus();
  await userEvent.keyboard('{Control>}{F4}{/Control}');
  const gamma = page.getByRole('tab', { name: 'Gamma' });
  await expect.element(gamma).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => view.shadowRoot?.activeElement).toBe(gamma.element());
  await page.getByRole('button', { name: 'Close Gamma' }).click();
  await expect.element(page.getByText('Open a note')).toBeVisible();
});

test('an external tab update hands keyboard focus to the selected survivor', async () => {
  document.body.innerHTML = documents;
  const view = document.querySelector('metro-tab-view')!;
  const change = vi.fn();
  view.addEventListener('metro-change', change);
  await expect.element(page.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');
  await userEvent.tab();
  await userEvent.keyboard('{ArrowRight}');
  expect(view.shadowRoot?.activeElement?.textContent?.trim()).toBe('Beta');
  const replacement = document.createElement('metro-tab-view-item');
  replacement.value = 'beta';
  replacement.label = 'Updated Beta';
  view.querySelector('metro-tab-view-item[value="beta"]')!.replaceWith(replacement);
  await expect.poll(() => view.shadowRoot?.activeElement?.textContent?.trim()).toBe('Updated Beta');
  view.querySelector('metro-tab-view-item[value="beta"]')!.remove();
  await expect.poll(() => view.shadowRoot?.activeElement?.textContent?.trim()).toBe('Alpha');
  expect(view.value).toBe('alpha');

  view.querySelector('metro-tab-view-item[value="alpha"]')!.disabled = true;
  await expect.poll(() => view.shadowRoot?.activeElement?.textContent?.trim()).toBe('Gamma');
  expect(view.value).toBe('gamma');
  expect(change).not.toHaveBeenCalled();
});

function narrowTabView() {
  document.body.innerHTML = `<section style="inline-size:170px">${documents}</section>
    <button type="button">Other control</button>`;
  const view = document.querySelector('metro-tab-view')!;
  const host = view.parentElement!;
  const strip = () => view.shadowRoot!.querySelector<HTMLElement>('[part="tablist"]')!;
  const headerFits = (tab: Locator) => {
    const entry = tab.element().closest('.entry')!.getBoundingClientRect();
    const bounds = strip().getBoundingClientRect();
    return entry.left >= bounds.left - 1 && entry.right <= bounds.right + 1;
  };
  return { view, host, headerFits };
}

test('a programmatic selection brings the tab and its close button into the narrow strip without moving focus', async () => {
  const { view, host, headerFits } = narrowTabView();
  const other = page.getByRole('button', { name: 'Other control' });
  await expect.element(page.getByRole('tab', { name: 'Alpha', selected: true })).toBeVisible();
  (other.element() as HTMLButtonElement).focus();
  const change = vi.fn();
  view.addEventListener('metro-change', change);
  view.value = 'gamma';
  const gamma = page.getByRole('tab', { name: 'Gamma', selected: true });
  await expect.element(gamma).toBeVisible();
  expect(headerFits(gamma)).toBe(true);
  host.style.inlineSize = '135px';
  await expect.poll(() => headerFits(gamma)).toBe(true);
  expect(document.activeElement).toBe(other.element());
  expect(change).not.toHaveBeenCalled();
});

test('direction changes and closing a tab keep the focused header in the narrow strip', async () => {
  const { view, host, headerFits } = narrowTabView();
  const alpha = page.getByRole('tab', { name: 'Alpha' });
  const gamma = page.getByRole('tab', { name: 'Gamma' });
  await expect.element(alpha).toBeVisible();
  (alpha.element() as HTMLButtonElement).focus();
  await userEvent.keyboard('{End}{Enter}');
  await expect.element(gamma).toHaveAttribute('aria-selected', 'true');
  host.dir = 'rtl';
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  expect(view.shadowRoot?.activeElement).toBe(gamma.element());
  expect(headerFits(gamma)).toBe(true);

  await userEvent.keyboard('{Delete}');
  const beta = page.getByRole('tab', { name: 'Beta', selected: true });
  await expect.element(beta).toBeVisible();
  expect(view.shadowRoot?.activeElement).toBe(beta.element());
  expect(headerFits(beta)).toBe(true);
});

test('transfer keeps one owner and queues close against the receiving view', async () => {
  document.body.innerHTML = documents + '<metro-tab-view label="Destination"></metro-tab-view>';
  const [from, target] = document.querySelectorAll('metro-tab-view');
  const item = from.querySelector('metro-tab-view-item')!;
  const session = { id: 'alpha', journal: [], draft: 'unsaved' };
  item.session = session;
  target.addEventListener('metro-before-tab-receive', event => event.preventDefault(), { once: true });
  await expect(from.transferTab('alpha', { target })).resolves.toBe(false);
  expect(item.parentElement).toBe(from);
  target.addEventListener('metro-before-tab-receive', () => { item.disabled = true; }, { once: true });
  await expect(from.transferTab('alpha', { target })).resolves.toBe(false);
  expect(item.parentElement).toBe(from);
  item.disabled = false;

  let prepare!: () => void;
  const preparation = new Promise<void>(resolve => { prepare = resolve; });
  const sourceClose = vi.fn();
  const targetClose = vi.fn();
  from.addEventListener('metro-before-tab-close', sourceClose);
  target.addEventListener('metro-before-tab-close', event => {
    targetClose(event.detail);
    event.preventDefault();
  });
  const moving = from.transferTab('alpha', async () => {
    await preparation;
    return { target };
  });
  const close = from.closeTab('alpha');
  expect(item.parentElement).toBe(from);
  prepare();
  await expect(moving).resolves.toBe(true);
  await expect(close).resolves.toBe(false);
  expect(targetClose).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ session, value: 'alpha' }));
  expect(sourceClose).not.toHaveBeenCalled();
  expect(item.parentElement).toBe(target);
  expect(item.session).toBe(session);
  expect(from.querySelector('[value="alpha"]')).toBeNull();
  await expect.element(page.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');
});

test('reorder exposes stable keys and accepts a replacement view in a second document', async () => {
  document.body.innerHTML = documents;
  const frame = document.createElement('iframe');
  frame.srcdoc = '<script type="module" src="/src/tab-view.ts"></script>';
  document.body.append(frame);
  const from = document.querySelector('metro-tab-view')!;
  await expect.element(page.getByRole('tab', { name: 'Alpha' })).toBeVisible();
  expect(from.moveTab('gamma', 0)).toBe(true);
  await from.updateComplete;
  expect(Array.from(from.children).filter(child => child.localName === 'metro-tab-view-item').map(child => child.getAttribute('value')))
    .toEqual(['gamma', 'alpha', 'beta']);

  await expect.poll(() => frame.contentWindow?.customElements.get('metro-tab-view')).toBeDefined();
  const remote = frame.contentDocument!;
  const target = remote.createElement('metro-tab-view');
  const replacement = remote.createElement('metro-tab-view-item');
  replacement.value = 'alpha';
  replacement.label = 'Alpha in another window';
  remote.body.append(target);
  const original = from.querySelector<HTMLElementTagNameMap['metro-tab-view-item']>('metro-tab-view-item[value="alpha"]')!;
  const session = { draft: 'stored with the application', history: ['one', 'two'] };
  original.session = session;
  await expect(from.transferTab('alpha', { target, item: replacement })).resolves.toBe(true);
  expect(replacement.session).toBe(session);
  expect(original.isConnected).toBe(false);
  expect(target.value).toBe('alpha');
});

test('an accepted tear-out holds close while the host prepares the destination', async () => {
  document.body.innerHTML = documents + '<metro-tab-view label="Destination"></metro-tab-view><div id="drop-area"></div>';
  const [from, target] = document.querySelectorAll('metro-tab-view');
  from.detachable = true;
  await from.updateComplete;
  const button = from.shadowRoot!.querySelector<HTMLButtonElement>('[role="tab"]')!;
  const row = from.shadowRoot!.querySelector('[role="tablist"]')!.getBoundingClientRect();
  const area = document.querySelector('#drop-area')!;
  const sourceClose = vi.fn();
  const targetClose = vi.fn();
  from.addEventListener('metro-before-tab-close', sourceClose);
  target.addEventListener('metro-before-tab-close', event => {
    targetClose(event.detail.value);
    event.preventDefault();
  });
  let finish!: (destination: { target: typeof target }) => void;
  const windowReady = new Promise<{ target: typeof target }>(resolve => { finish = resolve; });
  let move: Promise<boolean> | undefined;
  let close: Promise<boolean> | undefined;
  from.addEventListener('metro-tab-detach-request', event => {
    if (event.detail.value !== 'alpha') return;
    move = event.detail.accept(windowReady);
    close = from.closeTab('alpha');
  });
  const start = (dataTransfer: DataTransfer) =>
    button.dispatchEvent(new DragEvent('dragstart', { dataTransfer, bubbles: true, composed: true, cancelable: true }));
  const drop = (dataTransfer: DataTransfer) =>
    area.dispatchEvent(new DragEvent('drop', {
      dataTransfer, bubbles: true, composed: true, cancelable: true, clientX: row.left + 12, clientY: row.bottom + 48,
    }));

  const data = new DataTransfer();
  start(data);
  const foreignData = new DataTransfer();
  foreignData.setData(data.types[0], 'a different drag token');
  drop(foreignData);
  expect(move).toBeUndefined();
  button.dispatchEvent(new DragEvent('dragend', { bubbles: true, composed: true }));
  drop(data);
  expect(move).toBeUndefined();

  start(data);
  drop(data);
  expect(move).toBeInstanceOf(Promise);
  expect(from.querySelector('[value="alpha"]')).not.toBeNull();
  finish({ target });
  await expect(move).resolves.toBe(true);
  await expect(close).resolves.toBe(false);
  expect(sourceClose).not.toHaveBeenCalled();
  expect(targetClose).toHaveBeenCalledExactlyOnceWith('alpha');
  expect(target.querySelector('[value="alpha"]')).not.toBeNull();
});

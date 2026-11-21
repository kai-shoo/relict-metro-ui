import { beforeEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/list-details.js';

beforeEach(() => { document.body.replaceChildren(); });

const markup = `
  <metro-list-details list-label="Projects" details-label="Editor" style="width: 350px">
    <div slot="list" style="height: 130px; overflow: auto">
      <div style="height: 150px"></div>
      <button type="button" data-metro-focus="north">North report</button>
      <div style="height: 150px"></div>
    </div>
    <div slot="details">
      <label>Notes <input></label>
      <p role="status">Offline</p>
    </div>
    <p slot="empty">Select a project</p>
  </metro-list-details>
`;

test('compact details return to the source and retain draft and scroll through resizing', async () => {
  document.body.innerHTML = markup;
  const layout = document.querySelector('metro-list-details')!;
  const row = page.getByRole('button', { name: 'North report' });
  const list = layout.querySelector<HTMLElement>('[slot="list"]')!;
  let previousScroll = 0;
  list.addEventListener('click', event => {
    previousScroll = list.scrollTop;
    layout.showDetails('north', event.target as HTMLElement);
  });
  const changes = vi.fn();
  layout.addEventListener('metro-details-change', changes);
  list.scrollTop = 105;
  await row.click();
  const notes = page.getByRole('textbox', { name: 'Notes' });
  const back = page.getByRole('button', { name: 'Back' });
  await expect.element(back).toBeVisible();
  expect(layout.shadowRoot?.activeElement?.getAttribute('part')).toBe('details');
  await notes.fill('unsaved');
  layout.style.width = '800px';
  await expect.element(row).toBeVisible();
  await expect.element(back).not.toBeInTheDocument();
  await expect.element(page.getByRole('status')).toHaveTextContent('Offline');
  await expect.element(notes).toHaveValue('unsaved');
  expect(changes).toHaveBeenCalledTimes(1);

  layout.style.width = '350px';
  await expect.element(back).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await expect.element(row).toHaveFocus();
  expect(previousScroll).toBeGreaterThan(0);
  expect(list.scrollTop).toBe(previousScroll);
  expect(layout.value).toBe('');
  expect(changes.mock.calls.map(([event]) => event.detail.reason)).toEqual(['open', 'back']);
});

test('selection can be vetoed and programmatic routing remains silent', async () => {
  document.body.innerHTML = markup;
  const layout = document.querySelector('metro-list-details')!;
  const changes = vi.fn();
  layout.addEventListener('metro-details-change', changes);
  await layout.updateComplete;
  layout.value = 'north';
  await expect.element(page.getByRole('textbox', { name: 'Notes' })).toBeVisible();
  layout.addEventListener('metro-before-details-change', event => event.preventDefault(), { once: true });
  expect(layout.showDetails('south')).toBe(false);
  expect(layout.value).toBe('north');
  expect(changes).not.toHaveBeenCalled();
});

test('Escape closes a modal before leaving compact details', async () => {
  document.body.innerHTML = markup;
  const layout = document.querySelector('metro-list-details')!;
  const row = page.getByRole('button', { name: 'North report' });
  await row.click();
  layout.showDetails('north', row.element() as HTMLElement);
  const notes = page.getByRole('textbox', { name: 'Notes' });
  await notes.fill('unsaved');
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-label', 'Choose date');
  dialog.innerHTML = '<button type="button" autofocus>Cancel</button>';
  layout.querySelector('[slot="details"]')!.append(dialog);
  dialog.showModal();
  await expect.element(page.getByRole('button', { name: 'Cancel' })).toHaveFocus();

  await userEvent.keyboard('{Escape}');
  await expect.poll(() => dialog.open).toBe(false);
  expect(layout.value).toBe('north');
  await expect.element(notes).toHaveFocus();
  await expect.element(notes).toHaveValue('unsaved');

  await userEvent.keyboard('{Escape}');
  await expect.element(row).toHaveFocus();
  expect(layout.value).toBe('');
});

test('a list inside a Shadow Root restores the keyed source even when it is replaced by the app', async () => {
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <metro-list-details style="width: 300px">
      <span slot="list">Projects</span>
      <button slot="list" type="button" data-metro-focus="north">Open</button>
      <p slot="details">Project details</p>
    </metro-list-details>`;
  document.body.append(host);
  const layout = root.querySelector('metro-list-details')!;
  await layout.updateComplete;
  const row = layout.querySelector('button')!;
  row.focus();
  const replacement = row.cloneNode(true) as HTMLButtonElement;
  layout.addEventListener('metro-before-details-change', () => row.replaceWith(replacement), { once: true });
  expect(layout.showDetails('north')).toBe(true);
  await layout.updateComplete;
  expect(layout.back()).toBe(true);
  await layout.updateComplete;
  expect(root.activeElement).toBe(replacement);
});

test('Back restores the keyed replacement when the original row stays mounted but becomes disabled', async () => {
  document.body.innerHTML = markup;
  const layout = document.querySelector('metro-list-details')!;
  await layout.updateComplete;
  const row = layout.querySelector('button')!;
  row.focus();
  expect(layout.showDetails('north', row)).toBe(true);
  await layout.updateComplete;
  row.disabled = true;
  const replacement = row.cloneNode(true) as HTMLButtonElement;
  replacement.disabled = false;
  replacement.textContent = 'Updated north report';
  row.after(replacement);

  await page.getByRole('button', { name: 'Back' }).click();

  await expect.element(page.getByRole('button', { name: 'Updated north report' })).toHaveFocus();
});

test('Back restores the replacement in the list when the original moves to the details pane', async () => {
  document.body.innerHTML = markup;
  const layout = document.querySelector('metro-list-details')!;
  layout.style.width = '800px';
  await layout.updateComplete;
  const row = layout.querySelector('button')!;
  expect(layout.showDetails('north', row)).toBe(true);
  await layout.updateComplete;
  const replacement = row.cloneNode(true) as HTMLButtonElement;
  row.replaceWith(replacement);
  replacement.textContent = 'Updated north report';
  layout.querySelector('[slot="empty"]')!.append(row);
  row.textContent = 'Summary action';

  expect(layout.back()).toBe(true);
  await layout.updateComplete;

  await expect.element(page.getByRole('button', { name: 'Updated north report' })).toHaveFocus();
});

test('workspace identifies the current project outside the editor and restores its draft after switching', async () => {
  const frame = document.createElement('iframe');
  frame.title = 'Workspace demo';
  frame.src = '/examples/workspace/';
  frame.style.cssText = 'width: 900px; height: 650px; border: 0';
  const loaded = new Promise<void>(resolve => frame.addEventListener('load', () => resolve(), { once: true }));
  document.body.append(frame);
  await loaded;

  const demo = page.frameLocator(page.getByTitle(frame.title));
  const north = demo.getByRole('button', { name: 'Северный маршрут' });
  const garden = demo.getByRole('button', { name: 'Городской сад' });
  const notes = demo.getByRole('textbox', { name: 'Заметка' });
  const current = demo.locator('#projects [aria-current="true"]');

  await north.click();
  (north.element() as HTMLElement).focus();
  await userEvent.keyboard('{Tab}');
  expect(frame.contentDocument!.activeElement).toBe(garden.element());
  const focusStyle = frame.contentWindow!.getComputedStyle(garden.element());
  expect(focusStyle.outlineStyle).toBe('solid');
  expect(focusStyle.outlineOffset).toBe('-2px');
  await notes.fill('Черновик маршрута');
  await expect.element(north).toHaveAttribute('aria-current', 'true');
  expect(current.elements()).toHaveLength(1);
  const mark = (button: HTMLElement) => frame.contentWindow!.getComputedStyle(button).borderInlineStartColor;
  expect(mark(north.element() as HTMLElement)).not.toBe(mark(garden.element() as HTMLElement));

  await garden.click();
  await expect.element(demo.getByRole('heading', { name: 'Городской сад' })).toBeVisible();
  await expect.element(garden).toHaveAttribute('aria-current', 'true');
  expect(current.elements()).toHaveLength(1);
  await expect.element(notes).toHaveValue('');

  await north.click();
  await expect.element(notes).toHaveValue('Черновик маршрута');
  frame.style.width = '320px';
  await demo.getByRole('button', { name: 'Назад' }).click();
  await expect.element(north).toBeVisible();
  await expect.element(current).not.toBeInTheDocument();
  expect(frame.contentDocument!.activeElement).toBe(north.element());
});

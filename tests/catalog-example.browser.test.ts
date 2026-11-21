import { afterEach, expect, test } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import manifest from '../package.json';
import type { MetroLongListSelector } from '../src/long-list-selector.js';

declare module 'vitest/browser' {
  interface BrowserCommands {
    catalogApplicationLayout(width: number, colorScheme: 'light' | 'dark', textSize: number): Promise<Array<{
      file: string; status: number; overflow: number; missing: string[]; errors: string[];
    }>>;
  }
}

let frame: HTMLIFrameElement;
afterEach(() => frame?.remove());

const shortName = (tag: string) => tag.slice('metro-'.length);
const tagButton = (catalog: ReturnType<typeof page.frameLocator>, tag: string) =>
  catalog.getByRole('button', { name: `Тег компонента ${shortName(tag)}`, exact: true });

async function openCatalog(tag: string) {
  frame = document.createElement('iframe');
  frame.title = 'Каталог';
  frame.src = `/examples/catalog/?tag=${tag}`;
  frame.style.cssText = 'width:760px;height:650px;border:0';
  const loaded = new Promise<void>(resolve => frame.addEventListener('load', () => resolve(), { once: true }));
  document.body.append(frame);
  await loaded;
  const catalog = page.frameLocator(page.getByTitle(frame.title));
  await expect.element(tagButton(catalog, tag)).toHaveValue(tag);
  return { catalog, doc: frame.contentDocument!, view: frame.contentWindow! as Window & typeof globalThis };
}

async function openPicker(catalog: ReturnType<typeof page.frameLocator>, current: string) {
  await tagButton(catalog, current).click();
  const dialog = catalog.getByRole('dialog', { name: 'Тег компонента', exact: true });
  await expect.element(dialog).toBeVisible();
  return dialog;
}

async function openQuickJump(catalog: ReturnType<typeof page.frameLocator>) {
  await catalog.locator('#tag-list').getByRole('button', { name: 'Перейти к букве', exact: true }).click();
  const jump = catalog.getByRole('dialog', { name: 'Перейти к букве', exact: true });
  await expect.element(jump).toBeVisible();
  return jump;
}

async function jumpToLetter(catalog: ReturnType<typeof page.frameLocator>, letter: string) {
  const jump = await openQuickJump(catalog);
  await catalog.locator('#tag-list metro-dialog').getByRole('button', { name: letter, exact: true }).click();
  await expect.element(jump).not.toBeInTheDocument();
}

async function chooseTag(catalog: ReturnType<typeof page.frameLocator>, current: string, next: string) {
  const dialog = await openPicker(catalog, current);
  const label = shortName(next);
  const letter = label[0].toUpperCase();
  const list = catalog.locator('#tag-list').element() as MetroLongListSelector;
  const group = list.groups!.find(group => group.value === letter)!;
  const index = group.items.findIndex(item => item.value === next);
  expect(index).toBeGreaterThanOrEqual(0);
  await jumpToLetter(catalog, letter);
  if (index) await userEvent.keyboard('{ArrowDown}'.repeat(index));
  const row = catalog.getByRole('gridcell', { name: label, exact: true });
  await expect.element(row).toHaveTextContent(label);
  await row.click();
  await expect.element(dialog).not.toBeInTheDocument();
  await expect.element(tagButton(catalog, next)).toHaveValue(next);
}

test('the catalog layout stacks its example panels when enlarged text needs the full column', async () => {
  const { doc } = await openCatalog('metro-content-control');
  const border = doc.querySelector('metro-grid > metro-border')!;
  const canvas = doc.querySelector('metro-grid > metro-canvas')!;
  await expect.poll(() => canvas.getBoundingClientRect().left).toBeGreaterThan(border.getBoundingClientRect().right);
  frame.style.width = '320px';
  doc.documentElement.style.fontSize = '200%';
  await expect.poll(() => canvas.getBoundingClientRect().top).toBeGreaterThan(border.getBoundingClientRect().bottom);
  expect(canvas.getBoundingClientRect().width).toBeCloseTo(border.getBoundingClientRect().width, 0);
});

test('the catalog keeps large heading words and the selected tag readable at double text size', async () => {
  const { catalog, doc, view } = await openCatalog('metro-content-control');
  frame.style.width = '320px';
  await expect.poll(() => view.innerWidth).toBe(320);
  const sizes = [doc.querySelector('h1')!, doc.querySelector('#title')!]
    .map(heading => parseFloat(view.getComputedStyle(heading).fontSize));
  doc.documentElement.style.fontSize = '200%';
  await doc.fonts.ready;
  const headings = [
    catalog.getByRole('heading', { name: 'Компоненты', exact: true }),
    catalog.getByRole('heading', { name: 'Компоновка', exact: true }),
  ];
  headings.forEach((heading, index) => {
    const element = heading.element();
    expect(parseFloat(view.getComputedStyle(element).fontSize)).toBe(sizes[index] * 2);
    const text = element.firstChild!;
    const range = doc.createRange();
    const counts = new Map<number, number>();
    for (let index = 0; index < text.textContent!.length; index++) {
      if (!/\p{L}/u.test(text.textContent![index])) continue;
      range.setStart(text, index);
      range.setEnd(text, index + 1);
      const line = Math.round(range.getBoundingClientRect().top);
      counts.set(line, 1 + (counts.get(line) ?? 0));
    }
    expect(counts.size).toBeLessThanOrEqual(2);
    expect(Math.min(...counts.values())).toBeGreaterThan(2);
  });
  const tag = tagButton(catalog, 'metro-content-control');
  await expect.element(tag).toHaveValue('metro-content-control');
  const name = doc.querySelector('#tag-name')!;
  const range = doc.createRange();
  range.selectNodeContents(name);
  const nameBounds = name.getBoundingClientRect();
  expect(range.getClientRects().length).toBeGreaterThan(1);
  for (const line of range.getClientRects()) expect(line.right).toBeLessThanOrEqual(nameBounds.right + 1);
  const arrow = view.getComputedStyle(tag.element(), '::after');
  expect(arrow.flexShrink).toBe('0');
});

test('the catalog wraps copyable source and the same snippet runs in a plain HTML document', async () => {
  const { catalog, doc, view } = await openCatalog('metro-repeat-button');
  frame.style.width = '320px';
  doc.documentElement.style.fontSize = '200%';
  await catalog.getByText('Код примера', { exact: true }).click();
  const panel = catalog.getByLabelText('Исходный код');
  await expect.element(panel).toBeVisible();
  const pre = panel.element();
  expect(pre.scrollWidth).toBeLessThanOrEqual(pre.clientWidth + 1);
  doc.querySelector('summary')!.focus();
  await userEvent.keyboard('{Tab}');
  expect(doc.activeElement).toBe(pre);
  const snippet = doc.querySelector('#code')!.textContent!;
  expect(snippet).toContain("import './metro-ui.js';\n");
  expect(snippet).toContain('metro-activate');

  const copy = document.createElement('iframe');
  copy.title = 'Copied sample';
  copy.srcdoc = `<!doctype html><base href="${view.location.origin}/dist/">${snippet}`;
  document.body.append(copy);
  try {
    const example = page.frameLocator(page.getByTitle('Copied sample'));
    await example.getByRole('button', { name: 'Прибавить' }).click();
    await expect.element(example.getByRole('status')).toHaveTextContent('1');
  } finally {
    copy.remove();
  }
});

test('the catalog labels extracted markup and links to the full application', async () => {
  const { catalog, doc } = await openCatalog('metro-map-view');
  await expect.element(catalog.getByRole('link', { name: 'Открыть пример целиком' }))
    .toHaveAttribute('href', '../map/index.html');
  await expect.element(catalog.getByText('Разметка компонента', { exact: true })).toBeVisible();
  await expect.poll(() => doc.querySelector('#code')?.textContent?.startsWith('<metro-map-view')).toBe(true);
});

test('jumps to a letter, activates a short name with the keyboard and restores focus when the picker closes', async () => {
  const { catalog, doc, view } = await openCatalog('metro-animated-icon');
  const trigger = tagButton(catalog, 'metro-animated-icon');
  await expect.element(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  const dialog = await openPicker(catalog, 'metro-animated-icon');
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  const list = doc.querySelector<MetroLongListSelector>('#tag-list')!;
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('animated-icon');

  const jump = await openQuickJump(catalog);
  await userEvent.keyboard('{Escape}');
  await expect.element(jump).not.toBeInTheDocument();
  await expect.element(dialog).toBeVisible();
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('Перейти к букве');

  await jumpToLetter(catalog, 'P');
  await expect.poll(() => list.getAnchor()?.key).toBe('P');
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('page');

  await userEvent.keyboard('{Escape}');
  await expect.element(dialog).not.toBeInTheDocument();
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(() => doc.activeElement?.id).toBe('tag');
  expect(new URL(view.location.href).searchParams.get('tag')).toBe('metro-animated-icon');

  await userEvent.keyboard('{Enter}');
  await expect.element(dialog).toBeVisible();
  await jumpToLetter(catalog, 'P');
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('page');
  await userEvent.keyboard('{Enter}');
  await expect.element(dialog).not.toBeInTheDocument();
  await expect.element(tagButton(catalog, 'metro-page')).toHaveValue('metro-page');
  await expect.poll(() => doc.activeElement?.id).toBe('tag');
  expect(new URL(view.location.href).searchParams.get('tag')).toBe('metro-page');
});

test('keeps the open tag picker and alphabet operable at 320 px with double text size', async () => {
  const { catalog, doc } = await openCatalog('metro-pivot');
  frame.style.width = '320px';
  frame.style.height = '460px';
  doc.documentElement.style.fontSize = '200%';
  const dialog = await openPicker(catalog, 'metro-pivot');
  const overview = catalog.getByRole('button', { name: 'Перейти к букве' }).element();
  const bounds = dialog.element().getBoundingClientRect();
  expect(dialog.element().scrollWidth).toBeLessThanOrEqual(dialog.element().clientWidth + 1);
  expect(overview.getBoundingClientRect().right).toBeLessThanOrEqual(bounds.right);
  const close = dialog.getByRole('button', { name: 'Закрыть', exact: true }).element().getBoundingClientRect();
  expect(close.bottom).toBeLessThanOrEqual(bounds.bottom + 1);
  const list = doc.querySelector<MetroLongListSelector>('#tag-list')!;
  await expect.poll(() => {
    const selected = list.shadowRoot?.activeElement;
    if (selected?.textContent?.trim() !== 'pivot') return false;
    const row = selected.getBoundingClientRect();
    const viewport = list.shadowRoot!.querySelector('[part="viewport"]')!.getBoundingClientRect();
    return row.top >= viewport.top - 1 && row.bottom <= viewport.bottom + 1;
  }).toBe(true);

  const jump = await openQuickJump(catalog);
  expect(jump.element().scrollWidth).toBeLessThanOrEqual(jump.element().clientWidth + 1);
  await catalog.locator('#tag-list metro-dialog').getByRole('button', { name: 'P', exact: true }).click();
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('page');
  await userEvent.keyboard('{Enter}');
  await expect.element(dialog).not.toBeInTheDocument();
  await expect.element(tagButton(catalog, 'metro-page')).toHaveFocus();
});

test('the tag picker locates a prefix by keyboard and reopens on the committed tag', async () => {
  const { catalog, doc, view } = await openCatalog('metro-animated-icon');
  frame.style.width = '320px';
  frame.style.height = '460px';
  doc.documentElement.style.fontSize = '200%';
  const list = doc.querySelector<MetroLongListSelector>('#tag-list')!;
  const expectVisibleFocus = async (label: string) => expect.poll(() => {
    const active = list.shadowRoot?.activeElement;
    if (active?.textContent?.trim() !== label) return false;
    const item = active.getBoundingClientRect();
    const viewport = list.shadowRoot!.querySelector('[part="viewport"]')!.getBoundingClientRect();
    return item.top >= viewport.top - 1 && item.bottom <= viewport.bottom + 1;
  }).toBe(true);

  const dialog = await openPicker(catalog, 'metro-animated-icon');
  await expectVisibleFocus('animated-icon');
  const current = catalog.getByRole('gridcell', { name: 'animated-icon', exact: true });
  await expect.element(current).toHaveAttribute('aria-current', 'true');
  expect(view.getComputedStyle(current.element(), '::before').borderInlineStartWidth).toBe('3px');
  await userEvent.keyboard('piv');
  await expectVisibleFocus('pivot');
  await expect.element(catalog.getByRole('gridcell', { name: 'pivot', exact: true }))
    .not.toHaveAttribute('aria-current');
  expect(new URL(view.location.href).searchParams.get('tag')).toBe('metro-animated-icon');
  await userEvent.keyboard('{Escape}');
  await expect.element(dialog).not.toBeInTheDocument();
  await expect.element(tagButton(catalog, 'metro-animated-icon')).toHaveFocus();

  await openPicker(catalog, 'metro-animated-icon');
  await expectVisibleFocus('animated-icon');
  await userEvent.keyboard('til');
  await expectVisibleFocus('tile');
  await userEvent.keyboard('{Enter}');
  await expect.element(dialog).not.toBeInTheDocument();
  await expect.element(tagButton(catalog, 'metro-tile')).toHaveFocus();
  await openPicker(catalog, 'metro-tile');
  await expectVisibleFocus('tile');
  await expect.element(catalog.getByRole('gridcell', { name: 'tile', exact: true })).toHaveAttribute('aria-current', 'true');
});

test('the longest tag fits fully in its virtual row at 320 px and 200% text', async () => {
  const { catalog, doc } = await openCatalog('metro-turnstile-feather-effect');
  frame.style.width = '320px';
  frame.style.height = '460px';
  doc.documentElement.style.fontSize = '200%';
  const dialog = await openPicker(catalog, 'metro-turnstile-feather-effect');
  const list = doc.querySelector<MetroLongListSelector>('#tag-list')!;
  const row = catalog.getByRole('gridcell', { name: 'turnstile-feather-effect', exact: true });
  await expect.element(row).toBeVisible();
  const window = list.shadowRoot!.querySelector('[part="viewport"]')!.getBoundingClientRect();
  const cell = row.element().getBoundingClientRect();
  const label = row.element().querySelector('[part="item-label"]')!;
  const text = doc.createRange();
  text.selectNodeContents(label);
  expect(text.getClientRects().length).toBeGreaterThan(1);
  for (const line of text.getClientRects()) {
    expect(line.left).toBeGreaterThanOrEqual(cell.left - 1);
    expect(line.right).toBeLessThanOrEqual(cell.right + 1);
    expect(line.top).toBeGreaterThanOrEqual(window.top - 1);
    expect(line.bottom).toBeLessThanOrEqual(window.bottom + 1);
  }
  const close = dialog.getByRole('button', { name: 'Закрыть', exact: true });
  expect(close.element().getBoundingClientRect().bottom).toBeLessThanOrEqual(dialog.element().getBoundingClientRect().bottom + 1);
});

test('remembers selected examples in history and still switches when history is rate-limited', async () => {
  const { catalog, view } = await openCatalog('metro-animated-icon');
  await chooseTag(catalog, 'metro-animated-icon', 'metro-popup');
  await expect.element(catalog.getByRole('button', { name: 'Сведения', exact: true })).toBeVisible();
  expect(new URL(view.location.href).searchParams.get('tag')).toBe('metro-popup');
  view.history.back();
  await expect.element(tagButton(catalog, 'metro-animated-icon')).toHaveValue('metro-animated-icon');

  const pushState = view.history.pushState;
  view.history.pushState = () => { throw new view.DOMException('History rate limit', 'SecurityError'); };
  try {
    await chooseTag(catalog, 'metro-animated-icon', 'metro-command-bar');
    await expect.element(catalog.getByRole('group', { name: 'Документ' })).toBeVisible();
  } finally {
    view.history.pushState = pushState;
  }
});

test('reselecting the current component preserves the active example', async () => {
  const { catalog, doc, view } = await openCatalog('metro-animated-icon');
  await catalog.getByRole('button', { name: 'Сменить знак' }).click();
  const icon = doc.querySelector('metro-animated-icon')!;
  expect(icon.name).toBe('save');
  const length = view.history.length;
  const dialog = await openPicker(catalog, 'metro-animated-icon');
  await dialog.getByRole('gridcell', { name: 'animated-icon', exact: true }).click();
  await expect.element(dialog).not.toBeInTheDocument();
  await expect.element(tagButton(catalog, 'metro-animated-icon')).toHaveFocus();
  expect(doc.querySelector('metro-animated-icon')).toBe(icon);
  expect(icon.name).toBe('save');
  expect(view.history.length).toBe(length);
});

test('names popup and teaching tip surfaces and restores popup focus after Escape', async () => {
  const { catalog, doc } = await openCatalog('metro-popup');
  const info = catalog.getByRole('button', { name: 'Сведения', exact: true });
  await expect.element(info).toBeVisible();
  expect(info.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  await info.click();
  await expect.element(catalog.getByRole('dialog', { name: 'Сведения о записи' })).toBeVisible();
  await expect.element(info).toHaveAttribute('aria-expanded', 'true');
  const popup = doc.querySelector('metro-popup')!;
  await expect.poll(() => popup.shadowRoot?.activeElement?.id).toBe('surface');
  await userEvent.keyboard('{Escape}');
  await expect.element(catalog.getByRole('dialog', { name: 'Сведения о записи' })).not.toBeInTheDocument();
  await expect.element(info).toHaveAttribute('aria-expanded', 'false');
  expect(doc.activeElement?.id).toBe('info');

  const help = catalog.getByRole('button', { name: 'Подсказка' });
  expect(help.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  await help.click();
  await expect.element(catalog.getByRole('dialog', { name: 'Папки' })).toBeVisible();
});

test('the narrow command flyout keeps its trigger and command labels readable at 200% text', async () => {
  const { catalog, doc } = await openCatalog('metro-command-bar-flyout');
  // Match the usable width of a 320px window with a classic scrollbar.
  frame.style.cssText = 'width:305px;height:460px;border:0';
  doc.documentElement.style.fontSize = '200%';
  const trigger = catalog.getByRole('button', { name: 'Инструменты', exact: true });
  await expect.element(trigger).toBeVisible();
  const button = trigger.element() as HTMLButtonElement;
  const label = doc.createRange();
  label.selectNodeContents(button);
  expect(label.getClientRects()).toHaveLength(1);
  expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth + 1);

  button.focus();
  await userEvent.keyboard('{Enter}');
  const surface = catalog.getByRole('dialog', { name: 'Инструменты', exact: true });
  await expect.element(surface).toBeVisible();
  const copy = catalog.getByRole('button', { name: 'Копировать', exact: true });
  const print = catalog.getByRole('button', { name: 'Печать', exact: true });
  for (const command of [copy, print]) {
    await expect.element(command).toBeVisible();
    const caption = doc.createRange();
    caption.selectNodeContents(command.element().querySelector('.label')!);
    expect(caption.getClientRects()).toHaveLength(1);
  }
  expect(surface.element().scrollWidth).toBeLessThanOrEqual(surface.element().clientWidth + 1);
  await expect.poll(() => copy.element().matches(':focus')).toBe(true);
  await userEvent.keyboard('{Tab}');
  await expect.poll(() => print.element().matches(':focus')).toBe(true);
  await userEvent.keyboard('{Escape}');
  await expect.element(surface).not.toBeInTheDocument();
  expect(doc.querySelector('metro-command-bar-flyout')?.shadowRoot?.activeElement).toBe(button);

  const actions: string[] = [];
  doc.addEventListener('metro-command', event => actions.push(event.detail.id));
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => copy.element().matches(':focus')).toBe(true);
  await userEvent.keyboard('{Enter}');
  await expect.element(surface).not.toBeInTheDocument();
  expect(actions).toEqual(['copy']);
  expect(doc.querySelector('metro-command-bar-flyout')?.shadowRoot?.activeElement).toBe(button);
});

test('the narrow split button gives its label space and keeps both actions usable at 200% text', async () => {
  const { catalog, doc } = await openCatalog('metro-split-button');
  // Match the usable width of a 320px window with a classic scrollbar.
  frame.style.cssText = 'width:305px;height:460px;border:0';
  doc.documentElement.style.fontSize = '200%';
  const send = catalog.getByRole('button', { name: 'Отправить', exact: true });
  const options = catalog.getByRole('button', { name: 'Способы отправки', exact: true });
  await expect.element(send).toBeVisible();
  const primary = send.element() as HTMLButtonElement;
  const trigger = options.element() as HTMLButtonElement;
  const slot = primary.querySelector('slot')!;
  const label = doc.createRange();
  label.selectNodeContents(slot.assignedNodes()[0] ?? slot);
  expect(new Set(Array.from(label.getClientRects(), rect => Math.round(rect.top))).size).toBe(2);
  expect(primary.scrollWidth).toBeLessThanOrEqual(primary.clientWidth + 1);
  expect(trigger.getBoundingClientRect().width).toBeCloseTo(48, 0);
  expect(trigger.getBoundingClientRect().height).toBeGreaterThanOrEqual(48);

  const actions: string[] = [];
  doc.addEventListener('metro-command', event => actions.push(event.detail.id));
  primary.focus();
  await userEvent.keyboard('{Enter}{Tab}');
  await expect.poll(() => trigger.matches(':focus')).toBe(true);
  await userEvent.keyboard('{ArrowDown}');
  const menu = catalog.getByRole('menu', { name: 'Способы отправки' });
  await expect.element(menu).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await expect.element(menu).not.toBeInTheDocument();
  expect(trigger.matches(':focus')).toBe(true);
  await userEvent.keyboard('{ArrowDown}{Enter}');
  await expect.element(menu).not.toBeInTheDocument();
  expect(trigger.matches(':focus')).toBe(true);
  expect(actions).toEqual(['send', 'copy']);
});

test('the password reveal glyph stays horizontal and centered at 200% text in LTR and RTL', async () => {
  const { catalog, doc } = await openCatalog('metro-password-box');
  frame.style.cssText = 'width:305px;height:460px;border:0';
  doc.documentElement.style.fontSize = '200%';
  const password = doc.querySelector('metro-password-box')!;
  password.value = '1234';
  const reveal = catalog.getByRole('button', { name: 'Показать код при удержании', exact: true });
  await expect.element(reveal).toBeEnabled();
  const input = password.shadowRoot!.querySelector('input')!;
  const button = reveal.element();
  const eye = button.querySelector('.eye')!;
  for (const dir of ['ltr', 'rtl']) {
    password.dir = dir;
    const bounds = button.getBoundingClientRect();
    const glyph = eye.getBoundingClientRect();
    const editor = input.getBoundingClientRect();
    expect(glyph.width).toBeGreaterThan(glyph.height * 1.4);
    expect(glyph.left + glyph.width / 2).toBeCloseTo(bounds.left + bounds.width / 2, 0);
    expect(glyph.top + glyph.height / 2).toBeCloseTo(bounds.top + bounds.height / 2, 0);
    expect(dir === 'ltr' ? bounds.left : editor.left).toBeCloseTo(dir === 'ltr' ? editor.right : bounds.right, 0);
  }
  expect(input.type).toBe('password');
});

test('the narrow export button keeps its label and chevron aligned at 200% text', async () => {
  const { catalog, doc } = await openCatalog('metro-drop-down-button');
  // Match the usable width of a 320px window with a classic scrollbar.
  frame.style.cssText = 'width:305px;height:460px;border:0';
  doc.documentElement.style.fontSize = '200%';
  const trigger = catalog.getByRole('button', { name: 'Экспорт', exact: true });
  await expect.element(trigger).toBeVisible();
  const button = trigger.element() as HTMLButtonElement;
  const label = doc.createRange();
  label.selectNodeContents(button.querySelector('slot')!);
  expect(label.getClientRects()).toHaveLength(1);
  const indicator = button.querySelector('[part="indicator"]')!.getBoundingClientRect();
  const bounds = button.getBoundingClientRect();
  const text = label.getBoundingClientRect();
  expect(indicator.left).toBeGreaterThan(text.right);
  expect(indicator.right).toBeLessThan(bounds.right);
  expect(indicator.top + indicator.height / 2).toBeCloseTo(bounds.top + bounds.height / 2, 0);

  button.focus();
  await userEvent.keyboard('{ArrowDown}');
  const menu = catalog.getByRole('menu', { name: 'Экспорт' });
  await expect.element(menu).toBeVisible();
  await userEvent.keyboard('{Enter}');
  await expect.element(menu).not.toBeInTheDocument();
  expect(doc.querySelector('output')?.value).toBe('copy');
  expect(doc.querySelector('metro-drop-down-button')?.shadowRoot?.activeElement).toBe(button);
});

test('the narrow report menu keeps a full command word readable at 200% text', async () => {
  const { catalog, doc } = await openCatalog('metro-context-menu');
  frame.style.cssText = 'width:320px;height:460px;border:0';
  doc.documentElement.style.fontSize = '200%';
  const report = catalog.getByRole('button', { name: 'Отчёт' });
  await report.click();
  const menu = catalog.getByRole('menu', { name: 'Действия с отчётом' });
  const copy = catalog.getByRole('menuitem', { name: 'Копировать' });
  await expect.element(copy).toBeVisible();
  const label = copy.element().querySelector('[part="label"]')!;
  const words = doc.createRange();
  words.selectNodeContents(label);
  expect(words.getClientRects()).toHaveLength(1);
  expect(menu.element().scrollWidth).toBeLessThanOrEqual(menu.element().clientWidth + 1);

  await userEvent.keyboard('{End}{Enter}');
  await expect.element(menu).not.toBeInTheDocument();
  expect(doc.querySelector('output')?.value).toBe('print');
  expect(doc.activeElement).toBe(report.element());
});

test('jumps to the chosen station and scrolls to an annotation', async () => {
  const { catalog, doc } = await openCatalog('metro-semantic-zoom');
  const detail = catalog.locator('metro-scroll-viewer[slot="detail"]');
  await expect.element(detail).toHaveAttribute('tabindex', '0');
  await catalog.getByRole('button', { name: 'Группы', exact: true }).click();
  const south = catalog.getByRole('button', { name: 'Юг', exact: true });
  await expect.element(south).toBeVisible();
  expect(south.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(99);
  await south.click();
  await expect.poll(() => doc.querySelector('metro-semantic-zoom')?.value).toBe('south');
  expect(doc.activeElement?.textContent?.trim()).toBe('Южная станция');
  expect(doc.querySelector('metro-scroll-viewer[slot="detail"]')!.scrollTop).toBeGreaterThan(0);

  await expect.element(catalog.getByRole('slider', { name: 'Положение остановок' })).toBeVisible();
  await catalog.getByRole('button', { name: 'Депо', exact: true }).click();
  await expect.poll(() => doc.querySelector('#stops')!.scrollTop).toBeGreaterThan(0);
  await expect.poll(() => doc.querySelector('metro-annotated-scroll-bar')?.value).toBe('depot');
});

test('the Russian schedule example opens the phone time picker and shows localized calendar actions', async () => {
  const { catalog, doc } = await openCatalog('metro-time-picker');
  frame.style.cssText = 'width:350px;height:570px;border:0';
  const time = doc.querySelector('metro-time-picker')!;
  const days = doc.querySelector('metro-recurring-days-picker')!;
  await expect.element(catalog.getByRole('button', { name: 'Предыдущий месяц' })).toBeVisible();
  await expect.element(catalog.getByRole('button', { name: 'Следующий месяц' })).toBeVisible();

  const start = catalog.getByRole('button', { name: 'Начало', exact: true });
  await start.click();
  await expect.element(catalog.getByRole('dialog', { name: 'Время начала' })).toBeVisible();
  for (const name of ['Часы', 'Минуты']) {
    const column = catalog.getByRole('spinbutton', { name });
    await expect.element(column).toBeVisible();
    const wheel = column.element();
    const bounds = wheel.getBoundingClientRect();
    for (const offset of [-1, 0, 1]) {
      const text = doc.createRange();
      text.selectNodeContents(wheel.querySelector(`[data-offset="${offset}"] .wheel-number`)!);
      const number = text.getBoundingClientRect();
      expect(number.top).toBeGreaterThanOrEqual(bounds.top - 1);
      expect(number.bottom).toBeLessThanOrEqual(bounds.bottom + 1);
    }
  }
  await expect.element(catalog.getByRole('button', { name: 'Готово' })).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => time.shadowRoot?.activeElement).toBe(start.element());
  expect(time.value).toBe('09:00');

  frame.style.cssText = 'width:300px;height:460px;border:0';
  doc.documentElement.style.fontSize = '200%';
  await start.click();
  const hours = catalog.getByRole('spinbutton', { name: 'Часы' });
  await expect.poll(() => time.shadowRoot?.activeElement).toBe(hours.element());
  const surface = catalog.getByRole('dialog', { name: 'Время начала' }).element();
  const heading = catalog.getByRole('heading', { name: 'Время начала' }).element();
  const selected = hours.element().querySelector('[part~="selected-cell"]')!;
  for (const item of [heading, selected]) {
    const box = item.getBoundingClientRect();
    const dialog = surface.getBoundingClientRect();
    expect(box.top).toBeGreaterThanOrEqual(dialog.top - 1);
    expect(box.bottom).toBeLessThanOrEqual(dialog.bottom + 1);
  }
  const wheels = time.shadowRoot!.querySelector<HTMLElement>('.phone-wheels')!;
  expect(wheels.scrollWidth).toBeLessThanOrEqual(wheels.clientWidth + 1);
  await userEvent.keyboard('{ArrowUp}');
  await expect.element(hours).toHaveAttribute('aria-valuenow', '10');
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => time.shadowRoot?.activeElement).toBe(start.element());
  expect(time.value).toBe('09:00');
  doc.documentElement.style.removeProperty('font-size');

  const repeat = catalog.getByRole('button', { name: /Дни недели.*Без повтора/ });
  await repeat.click();
  await expect.element(catalog.getByRole('dialog', { name: 'Дни повтора' })).toBeVisible();
  await expect.element(catalog.getByRole('button', { name: 'Применить' })).toBeVisible();
  await catalog.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect.poll(() => days.shadowRoot?.activeElement).toBe(repeat.element());
  expect(days.value).toBe('');
});

test('the Russian record actions example localizes controls and their feedback', async () => {
  const { catalog, doc } = await openCatalog('metro-swipe-control');
  const frameStyle = frame.style.cssText;
  frame.style.cssText = 'width:305px;height:460px;border:0';
  doc.documentElement.style.fontSize = '200%';
  const share = doc.querySelector('metro-share-button')!;
  const copied: string[] = [];
  share.copyAdapter = async text => { copied.push(text); };
  const copy = catalog.getByRole('button', { name: 'Скопировать текст' });
  const actions = [
    { action: catalog.getByRole('button', { name: 'Поделиться маршрутом' }), words: ['Поделиться', 'маршрутом'] },
    { action: copy, words: ['Скопировать', 'текст'] },
  ];
  for (const { action, words } of actions) {
    await expect.element(action).toBeVisible();
    const button = action.element();
    const label = button.querySelector('slot') ?? button;
    const caption = doc.createRange();
    caption.selectNodeContents(label);
    expect(caption.getClientRects()).toHaveLength(2);
    const text = [...label.childNodes].find((node): node is Text =>
      node.nodeType === Node.TEXT_NODE && node.textContent!.includes(words[0]))!;
    for (const word of words) {
      const start = text.data.indexOf(word);
      caption.setStart(text, start);
      caption.setEnd(text, start + word.length);
      expect(caption.getClientRects()).toHaveLength(1);
    }
    expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth + 1);
  }
  (copy.element() as HTMLButtonElement).focus();
  await userEvent.keyboard('{Enter}');
  await expect.element(catalog.getByText('Текст скопирован.', { exact: true })).toBeVisible();
  expect(copied).toEqual(['Северный маршрут']);
  frame.style.cssText = frameStyle;
  doc.documentElement.style.removeProperty('font-size');

  await expect.element(catalog.getByText('Пора отправляться', { exact: true })).toBeVisible();
  await expect.element(catalog.getByRole('button', { name: 'Открыть', exact: true })).toBeVisible();
  await expect.element(catalog.getByRole('button', { name: 'Закрыть', exact: true })).toBeVisible();
  await catalog.getByRole('button', { name: 'Отложить', exact: true }).click();
  await expect.element(catalog.getByText('Отложить напоминание', { exact: true })).toBeVisible();
});

test('runs commands from overflow and context menus and preserves native names for the tree and tiles', async () => {
  const { catalog, doc } = await openCatalog('metro-command-bar');
  const pin = catalog.getByRole('button', { name: 'Закрепить' });
  await pin.click();
  await expect.element(pin).toHaveAttribute('aria-pressed', 'true');
  await catalog.getByRole('button', { name: 'Ещё', exact: true }).click();
  await catalog.getByRole('button', { name: 'Экспортировать' }).click();
  expect(doc.querySelector('output')?.value).toBe('export');

  await chooseTag(catalog, 'metro-command-bar', 'metro-context-menu');
  const report = catalog.getByRole('button', { name: 'Отчёт' });
  await expect.element(report).toBeVisible();
  expect(report.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  await report.click();
  await expect.element(catalog.getByRole('menu', { name: 'Действия с отчётом' })).toBeVisible();
  await catalog.getByRole('menuitem', { name: 'Печать' }).click();
  expect(doc.querySelector('output')?.value).toBe('print');
  expect(doc.activeElement?.id).toBe('file');

  await chooseTag(catalog, 'metro-context-menu', 'metro-tree-view');
  const sample = catalog.locator('#demo metro-long-list-selector');
  await sample.getByRole('button', { name: 'Перейти к букве', exact: true }).click();
  const jump = sample.getByRole('dialog', { name: 'Перейти к букве', exact: true });
  await expect.element(jump).toBeVisible();
  await sample.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect.element(jump).not.toBeInTheDocument();
  await expect.element(catalog.getByRole('treeitem', { name: 'Сохранённые', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect.element(catalog.getByRole('treeitem', { name: 'Карты', exact: true })).toBeVisible();

  await chooseTag(catalog, 'metro-tree-view', 'metro-live-tile');
  await expect.element(catalog.getByRole('link', { name: 'Почта', exact: true })).toHaveAttribute('href', '../mail/');
  await expect.element(catalog.getByRole('link', { name: 'Журнал', exact: true })).toHaveAttribute('href', '../notifications/');
});

test('every exported element has a working catalog entry with source and a registered tag', async () => {
  const { catalog, doc, view } = await openCatalog('metro-animated-icon');
  const list = doc.querySelector<MetroLongListSelector>('#tag-list')!;
  const helpers = ['.', './input-scope', './form-viewport', './shell-host', './browser', './package.json'];
  const tags = Object.keys(manifest.exports).filter(key => !helpers.includes(key)).map(key => 'metro-' + key.slice(2)).sort();
  expect(tags).toHaveLength(119);
  const groups = list.groups!;
  expect(groups.flatMap(group => group.items.map(item => item.value))).toEqual(tags);
  for (const group of groups) {
    expect(group.label).toBe(group.value);
    for (const item of group.items) {
      expect(item.label).toBe(shortName(item.value));
      expect(item.label[0].toUpperCase()).toBe(group.value);
    }
  }
  await userEvent.click(catalog.getByRole('button', { name: 'Сменить знак' }));
  expect(doc.querySelector('metro-animated-icon')?.name).toBe('save');

  frame.style.width = '320px';
  for (const tag of tags) {
    list.dispatchEvent(new view.CustomEvent('metro-item-activate', { detail: { value: tag } }));
    await expect.poll(() => doc.querySelector('#code')?.textContent?.includes('<' + tag), { message: tag }).toBe(true);
    const constructor = view.customElements.get(tag);
    expect(constructor, tag).toBeTypeOf('function');
    const application = doc.querySelector<HTMLAnchorElement>('#application')!;
    if (application.hidden) expect(doc.querySelector('#demo')?.querySelector(tag)).toBeInstanceOf(constructor!);
    else expect(application.href).toMatch(/\/examples\/.+\.html$/);
    expect(doc.documentElement.scrollWidth, tag).toBeLessThanOrEqual(view.innerWidth + 1);
  }
}, 60000);

test('every catalog entry fits at 320 px with double the default text size', async () => {
  const { doc, view } = await openCatalog('metro-label');
  frame.style.width = '320px';
  doc.documentElement.style.fontSize = '200%';
  const list = doc.querySelector<MetroLongListSelector>('#tag-list')!;
  const tags = list.groups!.flatMap(group => group.items.map(item => item.value));
  const failures: { tag: string; pageOverflow: number; elements: string[] }[] = [];

  for (const tag of tags) {
    list.dispatchEvent(new view.CustomEvent('metro-item-activate', { detail: { value: tag } }));
    await expect.poll(() => doc.querySelector<HTMLButtonElement>('#tag')?.value).toBe(tag);
    if (!doc.querySelector<HTMLAnchorElement>('#application')!.hidden) {
      await expect.poll(() => doc.querySelector('#code')?.textContent?.includes('<' + tag), { message: tag }).toBe(true);
    }
    await new Promise<void>(resolve => view.requestAnimationFrame(() => resolve()));
    const pageOverflow = Math.max(0, doc.documentElement.scrollWidth - view.innerWidth - 1);
    const demo = doc.querySelector('#demo');
    const box = demo?.getBoundingClientRect();
    const overflowing = box && demo ? [...demo.children].filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width && (rect.left < box.left - 1 || rect.right > box.right + 1);
    }) : [];
    if (pageOverflow || overflowing.length) {
      failures.push({ tag, pageOverflow, elements: overflowing.map(element => element.localName) });
    }
  }
  expect(failures).toEqual([]);
}, 60000);

test.each([
  [320, 'dark', 100],
  [1024, 'light', 100],
  [320, 'dark', 200],
  // A 320px window with a classic vertical scrollbar has 305px of usable width.
  [305, 'dark', 200],
] as const)('catalog applications load and fit at %i px in %s mode at text scale %i', async (width, colorScheme, textSize) => {
  const results = await commands.catalogApplicationLayout(width, colorScheme, textSize);
  expect(results.length).toBeGreaterThan(0);
  const failures = results.filter(({ status, overflow, missing, errors }) =>
    (status !== 200 && status !== 304) || overflow > 0 || missing.length > 0 || errors.length > 0);
  expect(failures).toEqual([]);
}, 60000);

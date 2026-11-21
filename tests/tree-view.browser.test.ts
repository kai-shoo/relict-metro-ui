import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/tree-view.js';

let fixture: HTMLDivElement | undefined;

function mount(content: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = content;
  document.body.append(fixture);
  return fixture.querySelector('metro-tree-view')!;
}

const node = (name: string) => page.getByRole('treeitem', { name, exact: true });
const checkFocus = async (name: string) => {
  await expect.poll(() => document.activeElement?.getAttribute('aria-label')).toBe(name);
};

afterEach(() => fixture?.remove());

test('TreeView arrows traverse visible nodes and expand without changing selection', async () => {
  const tree = mount(`<metro-tree-view label="Folders" value="archive" activatable>
    <metro-tree-item value="projects" label="Projects">
      <metro-tree-item value="blocked" label="Unavailable" disabled></metro-tree-item>
      <metro-tree-item value="drafts"><span slot="label">Drafts</span></metro-tree-item>
    </metro-tree-item>
    <metro-tree-item value="archive" label="Archive"></metro-tree-item>
    <metro-tree-item value="contacts" label="Contacts"></metro-tree-item>
  </metro-tree-view>`);
  const expansions = vi.fn();
  const changes = vi.fn();
  const activation = vi.fn();
  tree.addEventListener('metro-expand-change', event => expansions(event.detail));
  tree.addEventListener('metro-selection-change', event => changes(event.detail));
  tree.addEventListener('metro-item-activate', event => activation(event.detail));
  await expect.element(page.getByRole('tree', { name: 'Folders' })).toBeVisible();
  await expect.element(node('Projects')).toHaveAttribute('aria-expanded', 'false');
  await expect.element(node('Archive')).toHaveAttribute('aria-selected', 'true');
  const drafts = tree.querySelector<HTMLElement>('[value="drafts"]')!;
  await expect.poll(() => drafts.getClientRects().length).toBe(0);
  expect(drafts.tabIndex).toBe(-1);

  tree.focus();
  drafts.focus();
  await checkFocus('Archive');
  await userEvent.keyboard('{Home}{ArrowRight}');
  await checkFocus('Projects');
  await expect.element(node('Projects')).toHaveAttribute('aria-expanded', 'true');
  expect(expansions).toHaveBeenCalledExactlyOnceWith({ value: 'projects', expanded: true, expandedValues: ['projects'] });
  expect(changes).not.toHaveBeenCalled();

  await userEvent.keyboard('{ArrowRight}');
  await checkFocus('Drafts');
  expect(drafts.getClientRects().length).toBeGreaterThan(0);
  await expect.element(node('Drafts')).toHaveAttribute('aria-level', '2');
  await expect.element(node('Unavailable')).toHaveAttribute('aria-disabled', 'true');
  await userEvent.keyboard(' {Enter}');
  expect(tree.value).toBe('drafts');
  expect(changes).toHaveBeenCalledExactlyOnceWith({ value: 'drafts', selectedValues: ['drafts'] });
  expect(activation).toHaveBeenCalledExactlyOnceWith({ value: 'drafts' });

  await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowDown}');
  await checkFocus('Archive');
  await expect.element(node('Projects')).toHaveAttribute('aria-expanded', 'false');
  expect(tree.value).toBe('drafts');
  await userEvent.keyboard('c');
  await checkFocus('Contacts');
  await userEvent.keyboard('{Home}{End}');
  await checkFocus('Contacts');
  expect(expansions).toHaveBeenCalledTimes(2);
  expect(changes).toHaveBeenCalledTimes(1);
});

test('disclosure clicks, row clicks, and native actions each do one job', async () => {
  const tree = mount(`<metro-tree-view label="Files" activatable>
    <metro-tree-item value="one" label="Folder">
      <button type="button" slot="actions">Rename</button>
      <metro-tree-item value="doc">File</metro-tree-item>
    </metro-tree-item>
  </metro-tree-view>`);
  const change = vi.fn();
  const expand = vi.fn();
  const activate = vi.fn();
  const rename = vi.fn();
  tree.addEventListener('metro-selection-change', change);
  tree.addEventListener('metro-expand-change', expand);
  tree.addEventListener('metro-item-activate', activate);
  tree.querySelector('button')!.addEventListener('click', rename);
  await expect.element(node('Folder')).toHaveAttribute('aria-expanded', 'false');
  const disclosure = (node('Folder').element() as HTMLElement).shadowRoot!.querySelector<HTMLButtonElement>('[part="disclosure"]')!;
  await userEvent.click(disclosure);
  await expect.element(node('File')).toBeVisible();
  expect(expand).toHaveBeenCalledTimes(1);
  expect(change).not.toHaveBeenCalled();

  await page.getByRole('button', { name: 'Rename' }).click();
  await userEvent.keyboard('{Enter}');
  expect(rename).toHaveBeenCalledTimes(2);
  expect(expand).toHaveBeenCalledTimes(1);
  expect(change).not.toHaveBeenCalled();
  expect(activate).not.toHaveBeenCalled();

  await node('File').click();
  expect(tree.value).toBe('doc');
  expect(change).toHaveBeenCalledTimes(1);
  expect(activate).not.toHaveBeenCalled();
});

test('keeps branch state and keyed focus across element replacement, collapse, and removal', async () => {
  const tree = mount(`<metro-tree-view label="Navigation" value="beta">
    <metro-tree-item value="root" label="Root" expanded>
      <metro-tree-item value="beta" label="Beta"></metro-tree-item>
      <metro-tree-item value="gamma" label="Gamma"></metro-tree-item>
    </metro-tree-item>
    <metro-tree-item value="other" label="Other"></metro-tree-item>
  </metro-tree-view>`);
  const expand = vi.fn();
  const select = vi.fn();
  tree.addEventListener('metro-expand-change', expand);
  tree.addEventListener('metro-selection-change', select);
  await expect.element(node('Beta')).toHaveAttribute('aria-selected', 'true');
  expect(tree.focusItem('beta')).toBe(true);
  tree.querySelector('metro-tree-item')!.outerHTML = `
    <metro-tree-item value="root" label="Updated root">
      <metro-tree-item value="beta" label="Updated beta"></metro-tree-item>
      <metro-tree-item value="gamma" label="Gamma"></metro-tree-item>
    </metro-tree-item>`;
  await expect.element(node('Updated root')).toHaveAttribute('aria-expanded', 'true');
  await checkFocus('Updated beta');
  expect(tree.expandedValues).toEqual(['root']);
  expect(tree.value).toBe('beta');

  tree.expandedValues = [];
  await expect.element(node('Updated root')).toHaveAttribute('aria-expanded', 'false');
  await checkFocus('Updated root');
  expect(tree.value).toBe('beta');
  tree.expandedValues = ['root'];
  await expect.element(node('Updated beta')).toBeVisible();
  tree.focusItem('beta');
  tree.querySelector('[value="beta"]')!.remove();
  await checkFocus('Updated root');
  expect(tree.value).toBe('');
  expect(expand).not.toHaveBeenCalled();
  expect(select).not.toHaveBeenCalled();
});

test('retains focus when the same item moves to another expanded branch', async () => {
  const tree = mount(`<metro-tree-view label="Folders">
    <metro-tree-item value="first" label="First" expanded>
      <metro-tree-item value="file" label="File"></metro-tree-item>
    </metro-tree-item>
    <metro-tree-item value="second" label="Second" expanded>
      <metro-tree-item value="other" label="Other"></metro-tree-item>
    </metro-tree-item>
  </metro-tree-view>`);
  await expect.element(node('File')).toBeVisible();
  tree.focusItem('file');
  tree.querySelector('metro-tree-item[value="second"]')!.append(node('File').element());
  await checkFocus('File');
  await userEvent.keyboard('{ArrowLeft}');
  await checkFocus('Second');
});

test.each(['ltr', 'rtl'])('keeps a deep row and its action readable at double text size in %s', async direction => {
  const label = 'Последний документ проекта';
  const command = 'Переименовать документ';
  const leaf = `<metro-tree-item value="document" label="${label}">
    <button slot="actions" style="font:inherit" type="button">${command}</button>
  </metro-tree-item>`;
  const branches = Array.from({ length: 7 }, (_, index) => index).reduceRight((child, index) =>
    `<metro-tree-item value="folder-${index}" label="Папка ${index + 1}" expanded>${child}</metro-tree-item>`, leaf);
  const previousSize = document.documentElement.style.fontSize;
  document.documentElement.style.fontSize = '200%';
  try {
    const tree = mount(`<metro-tree-view dir="${direction}" style="inline-size:320px;max-block-size:300px"
      label="Документы" value="folder-0">${branches}</metro-tree-view>`);
    const action = page.getByRole('button', { name: command });
    const documentItem = node(label);
    await expect.element(documentItem).toHaveAttribute('aria-level', '8');
    tree.focus();
    await userEvent.keyboard('{End}');
    await checkFocus(label);

    const row = documentItem.element().shadowRoot!.querySelector('[part="row"]')!;
    const caption = row.querySelector('[part="label"]')!;
    const bounds = row.getBoundingClientRect();
    const captionBounds = caption.getBoundingClientRect();
    const actionBounds = action.element().getBoundingClientRect();
    expect(captionBounds.width).toBeGreaterThan(180);
    expect(actionBounds.left).toBeGreaterThanOrEqual(bounds.left - 1);
    expect(actionBounds.right).toBeLessThanOrEqual(bounds.right + 1);
    const verb = document.createRange();
    verb.setStart(action.element().firstChild!, 0);
    verb.setEnd(action.element().firstChild!, command.indexOf(' '));
    expect(verb.getClientRects()).toHaveLength(1);
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth + 1);
    expect(tree.scrollTop).toBeGreaterThan(0);
    const viewport = tree.getBoundingClientRect();
    expect(bounds.top).toBeGreaterThanOrEqual(viewport.top - 1);
    expect(bounds.bottom).toBeLessThanOrEqual(viewport.bottom + 1);

    const select = vi.fn();
    const rename = vi.fn();
    tree.addEventListener('metro-selection-change', select);
    action.element().addEventListener('click', rename);
    await userEvent.keyboard('{Tab}{Enter}');
    expect(document.activeElement).toBe(action.element());
    expect(rename).toHaveBeenCalledTimes(1);
    expect(select).not.toHaveBeenCalled();
    expect(tree.value).toBe('folder-0');
  } finally {
    document.documentElement.style.fontSize = previousSize;
  }
});

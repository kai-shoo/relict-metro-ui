import { afterEach, expect, test, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import '../src/collection-transfer.js';
import { MetroSelectionSet } from '../src/selection-set.js';

interface PointerTransfer {
  source: string;
  target: string;
  value: string;
  before: string | null;
  operation: string;
  input: string;
}
interface TransferState { source: string[]; target: string[]; moves: PointerTransfer[]; approvals: PointerTransfer[];
  previews: PointerTransfer[]; focus: string | null; }

declare module 'vitest/browser' {
  interface BrowserCommands {
    collectionTransferDrag(): Promise<{ dropped: TransferState; canceled: TransferState }>;
  }
}

let fixture: HTMLDivElement | undefined;

function mount() {
  fixture = document.createElement('div');
  fixture.innerHTML = `<metro-collection-transfer>
    <metro-reorder-list id="from" label="Library" transfer="move copy">
      <metro-list-item value="one" label="One">One</metro-list-item>
      <metro-list-item value="two" label="Two">Two</metro-list-item>
    </metro-reorder-list>
    <metro-reorder-list id="to" label="Queue" transfer="move copy">
      <metro-list-item value="three" label="Three">Three</metro-list-item>
    </metro-reorder-list>
  </metro-collection-transfer>`;
  document.body.append(fixture);
  return { scope: fixture.querySelector('metro-collection-transfer')!,
    source: fixture.querySelector<HTMLElementTagNameMap['metro-reorder-list']>('#from')!,
    target: fixture.querySelector<HTMLElementTagNameMap['metro-reorder-list']>('#to')! };
}

afterEach(() => fixture?.remove());

test('keyboard Copy uses a proposed insertion and a distinct application-assigned destination key', async () => {
  const { scope, source, target } = mount();
  const commits = vi.fn();
  const preview = vi.fn();
  let approval: AbortSignal | undefined;
  scope.labels = { position: 'Insert', before: label => `Ahead of ${label}` };
  scope.addEventListener('metro-transfer-preview', event => preview(event.detail));
  scope.addEventListener('metro-transfer', event => {
    commits(event.detail);
    expect(source.values).toEqual(['one', 'two']);
    expect(target.values).toEqual(['three']);
    target.items = event.detail.targetValues.map(value => ({ value, label: value === 'one-copy' ? 'One (copy)' : 'Three' }));
  });
  target.addEventListener('metro-before-transfer', event => {
    approval = event.detail.signal;
    event.detail.accept('one-copy');
  });
  await page.getByRole('combobox', { name: 'Operation' }).selectOptions('copy');
  const position = page.getByRole('combobox', { name: 'Insert' });
  await expect.element(position.getByRole('option', { name: 'Ahead of Three' })).toBeInTheDocument();
  await position.selectOptions('three');
  const button = page.getByRole('button', { name: 'Transfer', exact: true });
  (button.element() as HTMLButtonElement).focus();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => target.values).toEqual(['one-copy', 'three']);
  expect(source.values).toEqual(['one', 'two']);
  expect(approval?.aborted).toBe(false);
  expect(preview).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ value: 'one', before: 'three', operation: 'copy', input: 'keyboard' }));
  expect(commits).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ targetValue: 'one-copy', targetValues: ['one-copy', 'three'], sourceValues: ['one', 'two'] }));
  await expect.poll(() => target.shadowRoot?.activeElement?.getAttribute('aria-label')).toBe('Move One (copy)');
});

test('a veto or a destination change during asynchronous acceptance cannot modify either model', async () => {
  const { scope, source, target } = mount();
  const commits = vi.fn();
  scope.addEventListener('metro-transfer', commits);
  await scope.updateComplete;
  target.addEventListener('metro-before-transfer', event => {
    event.detail.accept();
    event.preventDefault();
  }, { once: true });
  expect(scope.begin(source, 'one')).toBe(true);
  expect(scope.propose(target, 'three', 'move')).toBe(true);
  expect(await scope.commit()).toBe(false);
  expect(source.values).toEqual(['one', 'two']);
  expect(target.values).toEqual(['three']);

  let accept!: (value: boolean) => void;
  target.addEventListener('metro-before-transfer', event => event.detail.accept(new Promise(resolve => { accept = resolve; })), { once: true });
  expect(scope.begin(source, 'one')).toBe(true);
  expect(scope.propose(target, 'three', 'move')).toBe(true);
  const pending = scope.commit();
  expect(scope.pending).toBe(true);
  await expect.poll(() => target.shadowRoot?.querySelector('[part="marker"]')?.parentElement?.dataset.reorderKey).toBe('three');
  target.querySelector('metro-list-item')!.remove();
  accept(true);
  expect(await pending).toBe(false);
  expect(scope.proposal).toBeNull();
  expect(source.values).toEqual(['one', 'two']);
  expect(target.values).toEqual([]);
  expect(commits).not.toHaveBeenCalled();
  await expect.poll(() => source.shadowRoot?.activeElement?.getAttribute('aria-label')).toBe('Move One');

  let canceled: AbortSignal | undefined;
  target.addEventListener('metro-before-transfer', event => {
    canceled = event.detail.signal;
    event.detail.accept(new Promise(() => {}));
  }, { once: true });
  expect(scope.begin(source, 'one')).toBe(true);
  expect(scope.propose(target, null, 'move')).toBe(true);
  const unanswered = scope.commit();
  expect(scope.cancel()).toBe(true);
  expect(canceled?.aborted).toBe(true);
  expect(await unanswered).toBe(false);
});

test('real desktop drag requests target approval and moves only once the application applies both sequences', async () => {
  const { dropped, canceled } = await commands.collectionTransferDrag();
  const move = { source: 'source', target: 'target', value: 'one', before: 'three', operation: 'move', input: 'pointer' };
  expect(dropped.moves).toEqual([move]);
  expect(dropped.approvals).toEqual([move]);
  expect(dropped.previews).toContainEqual(move);
  expect(dropped.source).toEqual(['two']);
  expect(dropped.target).toEqual(['one', 'three']);
  expect(dropped.focus).toBe('one');
  expect(canceled.moves).toEqual([move]);
  expect(canceled.source).toEqual(['two']);
  expect(canceled.target).toEqual(['one', 'three']);
});

function grouped() {
  const { scope, source, target } = mount();
  const archive = document.createElement('metro-reorder-list');
  archive.id = 'archive';
  archive.groupKey = 'stored';
  archive.transfer = 'move copy';
  archive.items = [{ value: 'four', label: 'Four' }, { value: 'five', label: 'Five' }];
  source.groupKey = 'originals';
  target.groupKey = 'incoming';
  scope.insertBefore(archive, target);
  scope.selection = new MetroSelectionSet([...source.transferItems, ...archive.transferItems, ...target.transferItems]);
  scope.selection.toggle('four');
  scope.selection.toggle('one');
  return { scope, source, archive, target };
}

test('one batch snapshots selected keys in list order and proposes all updates to the accepting group atomically', async () => {
  const { scope, source, archive, target } = grouped();
  await scope.updateComplete;
  const single = vi.fn();
  const approval = vi.fn();
  const preview = vi.fn();
  const commit = vi.fn();
  scope.addEventListener('metro-transfer-preview', single);
  scope.addEventListener('metro-before-transfer', single);
  scope.addEventListener('metro-transfer', single);
  scope.addEventListener('metro-transfer-batch-preview', event => preview(event.detail));
  target.addEventListener('metro-before-transfer-batch', event => {
    approval(event.detail);
    event.detail.accept();
  });
  scope.addEventListener('metro-transfer-batch', event => {
    commit(event.detail);
    expect(source.values).toEqual(['one', 'two']);
    expect(archive.values).toEqual(['four', 'five']);
    expect(target.values).toEqual(['three']);
    const items = new Map(event.detail.updates.flatMap(({ list }) => list.transferItems).map(item => [item.value, item]));
    for (const { list, values } of event.detail.updates) list.items = values.map(value => items.get(value)!);
  });

  expect(scope.beginBatch(archive, 'four')).toBe(true);
  scope.selection!.clear();
  expect(scope.propose(target, 'three', 'move')).toBe(true);
  const proposal = {
    items: [{ source, sourceGroup: 'originals', value: 'one' }, { source: archive, sourceGroup: 'stored', value: 'four' }],
    target, targetGroup: 'incoming', before: 'three', operation: 'move', input: 'programmatic',
  };
  expect(scope.batchProposal).toEqual(proposal);
  expect(scope.proposal).toBeNull();
  expect(await scope.commit()).toBe(true);
  expect(preview).toHaveBeenCalledExactlyOnceWith(proposal);
  expect(approval).toHaveBeenCalledExactlyOnceWith(expect.objectContaining(proposal));
  expect(commit).toHaveBeenCalledExactlyOnceWith({ ...proposal, targetKeys: ['one', 'four'], updates: [
    { list: source, group: 'originals', values: ['two'] },
    { list: archive, group: 'stored', values: ['five'] },
    { list: target, group: 'incoming', values: ['one', 'four', 'three'] },
  ] });
  expect(single).not.toHaveBeenCalled();
  expect(target.shadowRoot?.activeElement?.getAttribute('aria-label')).toBe('Move Four');
});

test('vetoes duplicate copy keys, changed source rows and a changed destination group without any partial update', async () => {
  const { scope, source, archive, target } = grouped();
  await scope.updateComplete;
  const committed = vi.fn();
  scope.addEventListener('metro-transfer-batch', committed);

  const sparse = new Array<string>(2);
  sparse[0] = 'copy';
  for (const keys of [['copy', 'copy'], ['copy', 'five'], ['copy'], sparse]) {
    target.addEventListener('metro-before-transfer-batch', event => event.detail.accept(keys), { once: true });
    expect(scope.beginBatch(source, 'one')).toBe(true);
    expect(scope.propose(target, 'three', 'copy')).toBe(true);
    expect(await scope.commit()).toBe(false);
  }
  let paused: AbortSignal | undefined;
  target.addEventListener('metro-before-transfer-batch', event => {
    paused = event.detail.signal;
    event.detail.accept(new Promise(() => {}));
  }, { once: true });
  expect(scope.beginBatch(source, 'one')).toBe(true);
  expect(scope.propose(target, 'three', 'move')).toBe(true);
  const pending = scope.commit();
  target.groupKey = 'renamed';
  await expect.poll(() => scope.pending).toBe(false);
  expect(await pending).toBe(false);
  expect(paused?.aborted).toBe(true);

  let finish!: (result: boolean) => void;
  target.addEventListener('metro-before-transfer-batch', event => {
    event.detail.accept(new Promise(resolve => { finish = resolve; }));
  }, { once: true });
  expect(scope.beginBatch(source, 'one')).toBe(true);
  expect(scope.propose(target, 'three', 'move')).toBe(true);
  const changed = scope.commit();
  archive.items = [{ value: 'five', label: 'Five' }];
  finish(true);
  expect(await changed).toBe(false);
  expect(scope.beginBatch(source, 'one')).toBe(false);
  expect(committed).not.toHaveBeenCalled();
  expect(source.values).toEqual(['one', 'two']);
  expect(archive.values).toEqual(['five']);
  expect(target.values).toEqual(['three']);
  await expect.poll(() => source.shadowRoot?.activeElement?.getAttribute('aria-label')).toBe('Move One');
});

test('allows a selected source group to be the destination, filters moving keys from anchors and rejects ambiguous keys or groups', async () => {
  const { scope, source, archive, target } = grouped();
  await scope.updateComplete;
  const committed = vi.fn();
  scope.addEventListener('metro-transfer-batch', event => committed(event.detail));
  source.addEventListener('metro-before-transfer-batch', event => event.detail.accept());

  expect(scope.beginBatch(source, 'one')).toBe(true);
  expect(scope.propose(source, 'one', 'move')).toBe(false);
  expect(scope.propose(source, 'two', 'move')).toBe(true);
  expect(await scope.commit()).toBe(true);
  expect(committed).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ targetGroup: 'originals', updates: [
    { list: archive, group: 'stored', values: ['five'] },
    { list: source, group: 'originals', values: ['one', 'four', 'two'] },
  ] }));

  target.items = [{ value: 'three', label: 'Three' }, { value: 'three', label: 'Duplicated target row' }];
  expect(scope.beginBatch(source, 'one')).toBe(true);
  expect(scope.propose(target, null, 'copy')).toBe(false);
  archive.items = [...archive.transferItems, { value: 'five', label: 'Duplicated source row' }];
  expect(scope.beginBatch(source, 'one')).toBe(false);
  archive.items = [{ value: 'four', label: 'Four' }, { value: 'five', label: 'Five' }];

  target.items = [{ value: 'one', label: 'Ambiguous key' }];
  expect(scope.beginBatch(source, 'one')).toBe(false);
  target.items = [{ value: 'three', label: 'Three' }];
  target.groupKey = 'stored';
  expect(scope.beginBatch(source, 'one')).toBe(false);
});

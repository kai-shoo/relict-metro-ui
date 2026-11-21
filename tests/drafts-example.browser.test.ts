import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

const durableKey = 'metro-example-drafts:v1:local';
const sessionKey = 'metro-example-drafts:v1:session';
let frame: HTMLIFrameElement;

function clearStorage() {
  localStorage.removeItem(durableKey);
  sessionStorage.removeItem(sessionKey);
}

beforeEach(clearStorage);

afterEach(() => {
  frame?.remove();
  clearStorage();
});

function mount() {
  frame = document.createElement('iframe');
  frame.title = 'Drafts example';
  frame.src = '/examples/drafts/';
  frame.style.cssText = 'width: 780px; height: 675px; border: 0';
  document.body.append(frame);
  return page.frameLocator(page.getByTitle('Drafts example'));
}

async function reload() {
  const loaded = new Promise<void>(resolve => frame.addEventListener('load', () => resolve(), { once: true }));
  frame.contentWindow!.location.reload();
  await loaded;
}

function textFile(name: string, content: string) { return new File([content], name, { type: 'text/plain' }); }

function beginChooser(native: Element) {
  native.addEventListener('click', event => event.preventDefault(), { once: true });
  (native as HTMLElement).click();
  return JSON.parse(sessionStorage.getItem(sessionKey)!).request;
}

describe('Survey draft example', () => {
  test('cancels a picker and offers to keep editing or save before changing records', async () => {
    const demo = mount();
    const summary = demo.getByRole('textbox', { name: 'Summary' });
    const west = demo.getByRole('button', { name: 'West depot' });
    const north = demo.getByRole('button', { name: 'North depot' });
    const date = demo.getByRole('button', { name: /Review date/ });
    await userEvent.click(date);
    await expect.element(demo.getByRole('dialog', { name: 'Choose a date' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(demo.getByRole('dialog', { name: 'Choose a date' })).not.toBeInTheDocument();
    await expect.element(demo.getByText('Unsaved changes')).not.toBeInTheDocument();

    await userEvent.fill(summary, 'Check the loading gate');
    await userEvent.click(west);
    await expect.element(demo.getByRole('dialog', { name: 'Leave this draft?' })).toBeVisible();
    await userEvent.click(demo.getByRole('button', { name: 'Keep editing' }));
    await expect.element(north).toHaveAttribute('aria-pressed', 'true');
    await expect.element(summary).toHaveValue('Check the loading gate');

    await userEvent.click(west);
    await userEvent.click(demo.getByRole('button', { name: 'Save and switch' }));
    await expect.element(west).toHaveAttribute('aria-pressed', 'true');
    await expect.element(summary).toHaveValue('');
    await userEvent.click(north);
    await expect.element(summary).toHaveValue('Check the loading gate');
    await expect.element(demo.getByText('Saved on this device · Revision 1')).toBeVisible();

    await userEvent.fill(summary, 'Unwanted edits');
    await userEvent.click(west);
    await userEvent.click(demo.getByRole('button', { name: 'Discard changes' }));
    await userEvent.click(north);
    await expect.element(summary).toHaveValue('Check the loading gate');
  });

  test('restores the unsaved draft and focus, while the outbox retains immutable revision snapshots', async () => {
    const demo = mount();
    const summary = demo.getByRole('textbox', { name: 'Summary' });
    const notes = demo.getByRole('textbox', { name: 'Notes' });
    const queue = demo.getByRole('button', { name: 'Queue for later' });
    await userEvent.fill(summary, 'Shipping inspection');
    await userEvent.fill(notes, 'First version');
    await userEvent.click(queue);
    const revisionOne = demo.getByRole('region', { name: 'North depot · Revision 1' });
    await expect.element(revisionOne.getByText('Queued', { exact: true })).toBeVisible();

    await userEvent.fill(notes, 'New local edits');
    (notes.element() as HTMLTextAreaElement).setSelectionRange(4, 9);
    await reload();
    await expect.element(summary).toHaveValue('Shipping inspection');
    await expect.element(notes).toHaveValue('New local edits');
    await expect.element(demo.getByText('Unsaved changes')).toBeVisible();
    await expect.poll(() => (notes.element().getRootNode() as ShadowRoot).activeElement).toBe(notes.element());
    expect((notes.element() as HTMLTextAreaElement).selectionStart).toBe(4);
    expect((notes.element() as HTMLTextAreaElement).selectionEnd).toBe(9);
    expect(JSON.parse(localStorage.getItem(durableKey)!).outbox['north:1'].notes).toBe('First version');

    await userEvent.click(queue);
    await userEvent.click(queue);
    await expect.element(demo.getByRole('region', { name: 'North depot · Revision 2' })).toBeVisible();
    expect(Object.keys(JSON.parse(localStorage.getItem(durableKey)!).outbox)).toEqual(['north:1', 'north:2']);
    await userEvent.click(revisionOne.getByRole('button', { name: 'Cancel' }));
    await expect.element(revisionOne.getByText('Cancelled')).toBeVisible();
    expect(JSON.parse(localStorage.getItem(durableKey)!).outbox['north:1'].notes).toBe('First version');
  });

  test('saves the picker context and discards a file read that finishes after switching records', async () => {
    const demo = mount();
    const summary = demo.getByRole('textbox', { name: 'Summary' });
    const native = demo.getByLabelText('Attach a file');
    await userEvent.fill(summary, 'Record with attachment');
    await expect.element(native).toBeEnabled();
    const initial = beginChooser(native.element());
    expect(initial).toMatchObject({ id: 'north', revision: 1 });
    expect(JSON.parse(sessionStorage.getItem(sessionKey)!).drafts.north.summary).toBe('Record with attachment');
    await userEvent.upload(native, textFile('accepted.txt', 'kept locally'));
    const download = demo.getByRole('link', { name: 'accepted.txt' });
    await expect.element(download).toBeVisible();

    const pending = beginChooser(native.element());
    expect(pending.key).not.toBe(initial.key);
    const file = textFile('late.txt', 'not for the new record');
    const bytes = await file.arrayBuffer();
    let resolveFile: (data: ArrayBuffer) => void = () => {};
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => new Promise<ArrayBuffer>(resolve => { resolveFile = resolve; }),
    });
    const picker = frame.contentDocument!.querySelector('metro-file-picker')!;
    picker.dispatchEvent(new CustomEvent('metro-file-select', {
      detail: { contextKey: pending.key, files: [file], requestId: 2 }, bubbles: true, composed: true,
    }));
    await userEvent.click(demo.getByRole('button', { name: 'West depot' }));
    await userEvent.click(demo.getByRole('button', { name: 'Save and switch' }));
    resolveFile(bytes);
    await expect.element(summary).toHaveValue('');
    await expect.element(demo.getByRole('link', { name: 'late.txt' })).not.toBeInTheDocument();

    await userEvent.click(demo.getByRole('button', { name: 'North depot' }));
    await expect.element(download).toBeVisible();
    await reload();
    await expect.element(download).toBeVisible();
    const response = await frame.contentWindow!.fetch(download.element().getAttribute('href')!);
    expect(await response.text()).toBe('kept locally');
  });
});

describe('Survey draft HTTP and offline example', () => {
  test('posts the same key after a network interruption and applies a late receipt only to its revision', async () => {
    const result = await commands.draftsRetryAndLateReceipt();
    expect(result.postRequests).toHaveLength(2);
    expect(result.postRequests[0]).toEqual(result.postRequests[1]);
    expect(result.postRequests[1].key).toMatch(/\.north:1$/);
    expect(result.duplicateStatus).toBe(200);
    expect(result.duplicate).toEqual(result.receipt);
    expect(result.conflictStatus).toBe(409);
    expect(result.state.outbox['north:1']).toMatchObject({ phase: 'complete', receipt: result.receipt, notes: 'First version' });
    expect(result.state.outbox['north:2']).toMatchObject({ phase: 'queued', notes: 'Edited while sending' });
    expect(result.state.records.north).toMatchObject({ notes: 'Edited while sending', version: 2 });
    expect(result.notes).toBe('Edited while sending');
  });

  test('recovers an accepted HTTP revision after losing the response and reloading', async () => {
    const result = await commands.draftsReloadReceipt();
    expect(result.requests).toEqual(['POST', 'GET']);
    expect(result.payload.file).toEqual({
      name: 'proof.txt', type: 'text/plain', data: btoa('Proof retained through send'),
    });
    expect(result.state.outbox['north:1']).toMatchObject({ phase: 'complete', receipt: result.serverReceipt, notes: 'Sent notes' });
    expect(result.draftRestored).toBe(true);
  });

  test('opens a previously visited shell offline in a new page, saves, then resumes on reconnect', async () => {
    const result = await commands.draftsOfflineReopen();
    expect(result.reusedShell).toBe(true);
    expect(result.restored).toBe('Saved before disconnect');
    expect(result.pending.records.north).toMatchObject({ notes: 'Saved while offline', version: 2 });
    expect(result.pending.outbox['north:2']).toMatchObject({ phase: 'waiting', waitingReason: 'Offline' });
    expect(result.state.outbox['north:1'].receipt).toMatchObject({ id: 'north', version: 1 });
    expect(result.state.outbox['north:2'].receipt).toMatchObject({ id: 'north', version: 2 });
  });
});

import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/transfer-control.js';
import type { MetroTransferActionDetail } from '../src/transfer-control.js';

let fixture: HTMLDivElement | undefined;

function mount(content: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = content;
  document.body.append(fixture);
  return fixture.querySelector('metro-transfer-control')!;
}

afterEach(() => {
  fixture?.remove();
  fixture = undefined;
});

test('reports the waiting reason and measured or unknown progress', async () => {
  const transfer = mount(`
    <metro-transfer-control transfer-id="survey-1" label="Survey"
      phase="waiting" waiting-reason="Wi-Fi required"></metro-transfer-control>
  `);
  const status = page.getByRole('status');
  const progress = page.getByRole('progressbar', { name: 'Transfer progress' });
  await expect.element(status).toHaveTextContent('Waiting · Wi-Fi required');
  await expect.element(progress).not.toHaveAttribute('aria-valuenow');
  await expect.element(progress).toHaveAttribute('aria-valuetext', 'Waiting · Wi-Fi required');
  const bar = transfer.shadowRoot!.querySelector('metro-progress-bar')!;
  expect(bar.state).toBe('paused');

  transfer.phase = 'transferring';
  transfer.total = 80;
  transfer.transferred = 50;
  await expect.element(status).toHaveTextContent('Transferring');
  await expect.element(progress).toHaveAttribute('aria-valuenow', '50');
  await expect.element(progress).toHaveAttribute('aria-valuemax', '80');
  expect(bar.state).toBe('normal');
  transfer.phase = 'complete';
  await expect.element(status).toHaveTextContent('Complete');
  await expect.element(progress).not.toBeInTheDocument();
});

test('emits stable cancel and retry requests while preserving controlled state', async () => {
  const transfer = mount('<metro-transfer-control transfer-id="survey-4" phase="transferring"></metro-transfer-control>');
  const actions: MetroTransferActionDetail[] = [];
  transfer.addEventListener('metro-transfer-action', event => {
    actions.push(event.detail);
    transfer.pending = true;
  });
  const cancel = page.getByRole('button', { name: 'Cancel' });
  await userEvent.click(cancel);
  await expect.element(cancel).toBeDisabled();
  await userEvent.keyboard('{Enter}');
  expect(actions).toEqual([{ id: 'survey-4', action: 'cancel', phase: 'transferring' }]);
  expect(transfer.phase).toBe('transferring');
  expect(transfer.shadowRoot?.activeElement).toBe(cancel.element());

  transfer.phase = 'error';
  transfer.pending = false;
  await userEvent.click(page.getByRole('button', { name: 'Retry' }));
  expect(actions).toEqual([
    { id: 'survey-4', action: 'cancel', phase: 'transferring' },
    { id: 'survey-4', action: 'retry', phase: 'error' },
  ]);
  expect(transfer.phase).toBe('error');
});

test('keeps a readable retry label and returns focus to the transfer status when the action disappears', async () => {
  const transfer = mount(`
    <metro-transfer-control style="width:241px" transfer-id="maps" label="Field maps download"
      phase="error" retry-label="Повторить" hide-cancel></metro-transfer-control>
    <button type="button">Next file</button>
  `);
  const root = document.documentElement;
  const original = root.style.fontSize;
  root.style.fontSize = '200%';
  try {
    const retry = page.getByRole('button', { name: 'Повторить' });
    const status = page.getByRole('status');
    await expect.element(retry).toBeVisible();
    const label = document.createRange();
    label.selectNodeContents(retry.element());
    expect(label.getClientRects()).toHaveLength(1);
    const title = document.createRange();
    title.selectNodeContents(transfer.shadowRoot!.querySelector('slot')!);
    expect(title.getClientRects()).toHaveLength(2);

    transfer.addEventListener('metro-transfer-action', () => { transfer.phase = 'transferring'; }, { once: true });
    (retry.element() as HTMLButtonElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(retry).not.toBeInTheDocument();
    await expect.element(status).toHaveTextContent('Transferring');
    expect(transfer.shadowRoot!.activeElement).toBe(status.element());

    transfer.phase = 'complete';
    await expect.element(status).toHaveTextContent('Complete');
    expect(transfer.shadowRoot!.activeElement).toBe(status.element());
    await userEvent.keyboard('{Tab}');
    const next = page.getByRole('button', { name: 'Next file' });
    await expect.element(next).toHaveFocus();

    transfer.phase = 'error';
    await expect.element(retry).toBeVisible();
    transfer.addEventListener('metro-transfer-action', () => {
      (next.element() as HTMLButtonElement).focus();
      transfer.phase = 'transferring';
    }, { once: true });
    (retry.element() as HTMLButtonElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(retry).not.toBeInTheDocument();
    await expect.element(next).toHaveFocus();

    transfer.phase = 'error';
    await expect.element(retry).toBeVisible();
    (retry.element() as HTMLButtonElement).focus();
    transfer.disabled = true;
    await expect.element(retry).toBeDisabled();
    expect(transfer.shadowRoot!.activeElement).toBe(status.element());
  } finally {
    root.style.fontSize = original;
  }
});

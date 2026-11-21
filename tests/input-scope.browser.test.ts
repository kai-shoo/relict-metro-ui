import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { MetroBackScope, MetroKeyboardScope } from '../src/input-scope.js';

test('Back closes the upper layer once and keeps a veto above the keyboard and history', async () => {
  const close = vi.fn(() => false);
  const keyboard = vi.fn(() => 'handled' as const);
  const navigate = vi.fn(() => 'handled' as const);
  const back = new MetroBackScope({ keyboard, navigation: navigate });
  const leave = back.enterLayer(close);
  let complete: (closed: boolean) => void = () => {};
  const pendingClose = new Promise<boolean>(resolve => { complete = resolve; });
  const closePicker = vi.fn(() => pendingClose);
  back.enterLayer(closePicker);

  const first = back.requestBack();
  expect(back.requestBack()).toBe(first);
  complete(true);
  expect(await first).toEqual({ stage: 'layer', status: 'handled' });
  expect(closePicker).toHaveBeenCalledOnce();
  expect(close).not.toHaveBeenCalled();

  expect(await back.requestBack()).toEqual({ stage: 'layer', status: 'blocked' });
  expect(close).toHaveBeenCalledOnce();
  expect(keyboard).not.toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
  leave();
  expect(await back.requestBack()).toEqual({ stage: 'keyboard', status: 'handled' });
  expect(navigate).not.toHaveBeenCalled();
});

test('Back delegates to the host after history and can retry a failed adapter', async () => {
  const order: string[] = [];
  const back = new MetroBackScope({
    keyboard: () => { order.push('keyboard'); return 'pass'; },
    mode: () => { order.push('mode'); return 'pass'; },
    navigation: () => { order.push('history'); return 'pass'; },
    host: () => { order.push('host'); return 'handled'; },
  });
  expect(await back.requestBack()).toEqual({ stage: 'host', status: 'handled' });
  expect(order).toEqual(['keyboard', 'mode', 'history', 'host']);

  const failed = back.enterLayer(() => { throw new Error('Unavailable'); });
  await expect(back.requestBack()).rejects.toThrow('Unavailable');
  failed();
  expect(await back.requestBack()).toEqual({ stage: 'host', status: 'handled' });

  const empty = new MetroBackScope();
  const inactive = vi.fn();
  empty.enterLayer(inactive, () => false);
  expect(await empty.requestBack()).toEqual({ stage: null, status: 'unhandled' });
  expect(inactive).not.toHaveBeenCalled();
});

test('shortcuts resolve fresh commands, preserve text input and honor an exclusive subtree', async () => {
  document.body.innerHTML = `
    <main>
      <button type="button">Document</button>
      <input aria-label="Text">
      <section><button type="button">Inside layer</button></section>
    </main>
  `;
  const run = vi.fn();
  const dialogRun = vi.fn();
  let id = 'note';
  const shortcuts = new MetroKeyboardScope(document.querySelector('main')!, {
    commands: () => [{ id, keys: [{ key: 'k', ctrl: true }], run: () => run(id) }],
  });
  const dialogShortcuts = new MetroKeyboardScope(document.querySelector('section')!, {
    exclusive: true,
    commands: () => [{ id: 'dialog', keys: [{ key: 'j', ctrl: true }], run: dialogRun }],
  });
  try {
    await page.getByRole('textbox', { name: 'Text' }).click();
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(run).not.toHaveBeenCalled();
    await page.getByRole('button', { name: 'Document' }).click();
    await userEvent.keyboard('{Control>}k{/Control}');
    id = 'other';
    await userEvent.keyboard('{Control>}k{/Control}');
    await page.getByRole('button', { name: 'Inside layer' }).click();
    await userEvent.keyboard('{Control>}k{/Control}{Control>}j{/Control}');
    expect(run.mock.calls).toEqual([['note'], ['other']]);
    expect(dialogRun).toHaveBeenCalledOnce();
  } finally {
    shortcuts.dispose();
    dialogShortcuts.dispose();
  }
});

test('Alt displays enabled access keys and Escape or disposal clears the visible tips', async () => {
  document.body.innerHTML = '<button type="button">Document</button>';
  const renderTips = vi.fn();
  const run = vi.fn();
  const button = page.getByRole('button', { name: 'Document' });
  const shortcuts = new MetroKeyboardScope(document.body, {
    renderTips,
    commands: () => [
      { id: 'save', accessKey: 'S', run },
      { id: 'delete', accessKey: 'D', disabled: true, run },
    ],
  });
  try {
    await button.click();
    await userEvent.keyboard('{Alt}');
    expect(renderTips).toHaveBeenLastCalledWith([{ id: 'save', key: 'S' }]);
    await userEvent.keyboard('{Escape}');
    expect(renderTips).toHaveBeenLastCalledWith([]);
    await userEvent.keyboard('s');
    expect(run).not.toHaveBeenCalled();
    await userEvent.keyboard('{Alt}s');
    expect(run).toHaveBeenCalledOnce();
    expect(renderTips).toHaveBeenLastCalledWith([]);
    await userEvent.keyboard('{Alt}');
    shortcuts.dispose();
    expect(renderTips).toHaveBeenLastCalledWith([]);
  } finally {
    shortcuts.dispose();
  }
});

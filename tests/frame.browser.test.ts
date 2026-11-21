import { beforeEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import '../src/frame.js';

beforeEach(() => { document.body.replaceChildren(); });

test('Frame keeps separate visits and restores keyed focus after the list is rebuilt', async () => {
  document.body.innerHTML = `
    <metro-frame value="list">
      <metro-page value="list" label="Mail">
        <button type="button" data-metro-focus="post-17">Open letter</button>
      </metro-page>
      <metro-page value="letter" label="Letter"></metro-page>
    </metro-frame>
  `;
  const frame = document.querySelector('metro-frame')!;
  const list = document.querySelector('metro-page[value="list"]')!;
  const letter = document.querySelector('metro-page[value="letter"]')!;
  const navigate = vi.fn();
  frame.addEventListener('metro-navigate', event => navigate(event.detail));
  list.addEventListener('click', () => {
    frame.saveState({ folder: 'sent', top: 100 });
    frame.navigate('letter', { params: { id: 17 } });
  }, { once: true });

  await page.getByRole('button', { name: 'Open letter' }).click();
  await expect.poll(() => letter.shadowRoot?.activeElement?.textContent?.trim()).toBe('Letter');
  expect(frame.value).toBe('letter');
  expect(list.getClientRects()).toHaveLength(0);
  expect(frame.visit?.params).toEqual({ id: 17 });

  frame.saveState({ tab: 'attachments' });
  expect(frame.navigate('letter', { params: { id: 18 } })).toBe(true);
  expect(frame.visit?.params).toEqual({ id: 18 });
  expect(frame.back()).toBe(true);
  expect(frame.visit).toMatchObject({ params: { id: 17 }, state: { tab: 'attachments' } });

  list.innerHTML = '<button type="button" data-metro-focus="post-17">Open updated letter</button>';
  expect(frame.back()).toBe(true);
  await expect.element(page.getByRole('button', { name: 'Open updated letter' })).toHaveFocus();
  expect(frame.visit?.state).toEqual({ folder: 'sent', top: 100 });
  expect(frame.canGoBack).toBe(false);
  expect(navigate.mock.calls.map(([detail]) => detail.direction)).toEqual(['forward', 'forward', 'back', 'back']);
});

test('Frame permits an exit veto and skips routes removed from its Back history', async () => {
  document.body.innerHTML = `
    <metro-frame value="one">
      <metro-page value="one" label="One"></metro-page>
      <metro-page value="two" label="Two"></metro-page>
      <metro-page value="three" label="Three"></metro-page>
    </metro-frame>
  `;
  const frame = document.querySelector('metro-frame')!;
  await frame.updateComplete;
  frame.addEventListener('metro-before-navigate', event => event.preventDefault(), { once: true });
  expect(frame.navigate('two')).toBe(false);
  expect(frame.value).toBe('one');
  expect(frame.canGoBack).toBe(false);
  expect(frame.navigate('two')).toBe(true);
  expect(frame.navigate('three')).toBe(true);
  frame.querySelector('[value="two"]')?.remove();
  expect(frame.back()).toBe(true);
  expect(frame.value).toBe('one');
  expect(frame.navigate('missing')).toBe(false);
  expect(frame.back()).toBe(false);
});

test('Page keeps one heading for a title slot with a native heading and for a plain title', async () => {
  document.body.innerHTML = '<metro-page label="Fallback"><h1 slot="title">Survey</h1></metro-page>';
  const article = document.querySelector('metro-page')!;
  const heading = article.querySelector('h1')!;
  const role = page.getByRole('heading', { level: 1 });
  await expect.poll(() => role.elements()).toEqual([heading]);
  article.focus();
  expect(article.shadowRoot!.activeElement?.getAttribute('part')).toBe('heading');

  heading.textContent = 'Updated survey';
  await expect.element(page.getByRole('group', { name: 'Updated survey' })).toBeVisible();
  await expect.element(page.getByRole('heading', { name: 'Updated survey', level: 1 })).toBeVisible();

  const text = document.createElement('span');
  text.slot = 'title';
  text.textContent = 'Plain title';
  heading.replaceWith(text);
  await expect.element(page.getByRole('heading', { name: 'Plain title', level: 1 })).toBeVisible();
  expect(role.elements()).toHaveLength(1);
  expect(article.shadowRoot!.activeElement?.getAttribute('part')).toBe('heading');

  text.remove();
  await expect.element(page.getByRole('heading', { name: 'Fallback', level: 1 })).toBeVisible();
  expect(role.elements()).toHaveLength(1);
});

test('Frame keeps its focus targets when the application renders during navigation events', async () => {
  document.body.innerHTML = `
    <metro-frame value="list">
      <metro-page value="list" label="Inbox">
        <button type="button" data-metro-focus="note-12">Open draft</button>
      </metro-page>
      <metro-page value="detail" label="Draft"></metro-page>
    </metro-frame>
  `;
  const frame = document.querySelector('metro-frame')!;
  const list = frame.querySelector('metro-page[value="list"]')!;
  const detail = frame.querySelector('metro-page[value="detail"]')!;
  frame.addEventListener('metro-before-navigate', () => {
    list.innerHTML = '<button type="button" data-metro-focus="note-12">Open updated draft</button>';
  }, { once: true });
  const replacement = document.createElement('metro-page');
  replacement.value = 'detail';
  replacement.label = 'Updated draft';
  frame.addEventListener('metro-navigate', () => detail.replaceWith(replacement), { once: true });
  list.addEventListener('click', () => frame.navigate('detail'), { once: true });

  await page.getByRole('button', { name: 'Open draft' }).click();
  await expect.poll(() => replacement.shadowRoot?.activeElement?.textContent?.trim()).toBe('Updated draft');
  expect(frame.back()).toBe(true);
  await expect.element(page.getByRole('button', { name: 'Open updated draft' })).toHaveFocus();
});

test('Frame respects focus explicitly placed by the application during navigation', async () => {
  document.body.innerHTML = `
    <input aria-label="Search all mail">
    <metro-frame value="list">
      <metro-page value="list" label="Inbox"><button type="button">Open draft</button></metro-page>
      <metro-page value="detail" label="Draft"><input aria-label="Edit title"></metro-page>
    </metro-frame>
  `;
  const frame = document.querySelector('metro-frame')!;
  await frame.updateComplete;
  const search = document.querySelector('input')!;
  const edit = frame.querySelector('input')!;
  const opener = page.getByRole('button', { name: 'Open draft' });
  (opener.element() as HTMLElement).focus();
  frame.addEventListener('metro-navigate', ({ detail }) => {
    if (detail.direction === 'forward') edit.focus();
    else search.focus();
  });

  expect(frame.navigate('detail')).toBe(true);
  await frame.updateComplete;
  await frame.page!.updateComplete;
  expect(document.activeElement).toBe(edit);
  expect(frame.back()).toBe(true);
  await frame.updateComplete;
  await frame.page!.updateComplete;
  expect(document.activeElement).toBe(search);
});

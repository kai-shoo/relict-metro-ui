import { afterEach, describe, expect, test } from 'vitest';
import { cdp, page, server, userEvent } from 'vitest/browser';
import '../src/auto-suggest-box.js';
import type { MetroQueryDetail, MetroSubmitDetail } from '../src/auto-suggest-box.js';

let fixture: HTMLDivElement | undefined;

function mount(content: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = content;
  document.body.append(fixture);
  return fixture;
}

afterEach(() => {
  fixture?.remove();
  fixture = undefined;
});

describe('Metro auto suggest box', () => {
  test('honors a canceled navigation or submission key while suggestions are open', async () => {
    const container = mount('<metro-auto-suggest-box label="Search"></metro-auto-suggest-box>');
    const box = container.querySelector('metro-auto-suggest-box')!;
    const field = page.getByRole('combobox', { name: 'Search' });
    const submitted: MetroSubmitDetail[] = [];
    box.addEventListener('metro-submit', event => submitted.push(event.detail));
    box.addEventListener('metro-query', event => box.setSuggestions(event.detail.queryId, [{ id: 'park', label: 'Park' }]));
    await field.fill('p');
    await expect.element(field).toHaveAttribute('aria-expanded', 'true');
    const prevent = (event: KeyboardEvent) => {
      if (['ArrowDown', 'Enter'].includes(event.key)) event.preventDefault();
    };
    container.addEventListener('keydown', prevent, true);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(submitted).toEqual([]);
    expect(box.value).toBe('p');
    expect(field.element().hasAttribute('aria-activedescendant')).toBe(false);
    expect(box.open).toBe(true);
    container.removeEventListener('keydown', prevent, true);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(submitted[0]?.item?.id).toBe('park');
  });

  test('rejects stale answers even when the user returns to an earlier query', async () => {
    const container = mount('<metro-auto-suggest-box label="Find a project"></metro-auto-suggest-box>');
    const box = container.querySelector('metro-auto-suggest-box')!;
    const input = page.getByRole('combobox', { name: 'Find a project' });
    const queries: MetroQueryDetail[] = [];
    container.addEventListener('metro-query', event => queries.push(event.detail));

    await userEvent.click(input);
    await userEvent.keyboard('ab{Backspace}');
    expect(queries.map(request => request.query)).toEqual(['a', 'ab', 'a']);
    expect(new Set(queries.map(request => request.queryId)).size).toBe(3);
    expect(box.setSuggestions(queries[0].queryId, [{ id: 'old', label: 'Old result' }])).toBe(false);
    expect(box.setSuggestions(queries[1].queryId, [{ id: 'second', label: 'Second result' }])).toBe(false);
    expect(box.setSuggestions(queries[2].queryId, [{ id: 'latest', label: 'Latest result' }])).toBe(true);
    await expect.element(page.getByRole('listbox', { name: 'Suggestions' }).getByRole('option')).toHaveTextContent('Latest result');
    await expect.element(page.getByRole('status')).toHaveTextContent('1 suggestion');

    box.value = 'restored';
    expect(queries.map(request => request.query)).toEqual(['a', 'ab', 'a']);
    expect(box.setSuggestions(queries[2].queryId, [{ id: 'late', label: 'Late' }])).toBe(false);
    const next = box.requestSuggestions();
    expect(queries.at(-1)).toEqual({ query: 'restored', queryId: next });
    await expect.element(input).toHaveValue('restored');
    await expect.element(page.getByRole('status')).toHaveTextContent('Searching…');
    box.setSuggestions(next, [], { status: 'error', message: 'Connection interrupted' });
    await expect.element(page.getByRole('status')).toHaveTextContent('Connection interrupted');
    box.setSuggestions(next, []);
    await expect.element(page.getByRole('status')).toHaveTextContent('No suggestions found');
  });

  test('keeps text focus, tracks an active item by key, skips disabled options and submits', async () => {
    const container = mount(`
      <metro-auto-suggest-box>
        <span slot="label">Find a city</span>
      </metro-auto-suggest-box>
    `);
    const box = container.querySelector('metro-auto-suggest-box')!;
    const input = page.getByRole('combobox', { name: 'Find a city' });
    const submitted: MetroSubmitDetail[] = [];
    box.addEventListener('metro-submit', event => submitted.push(event.detail));
    let queryId = 0;
    box.addEventListener('metro-query', event => { queryId = event.detail.queryId; });
    await userEvent.click(input);
    await userEvent.keyboard('p');
    const paris = { id: 'paris', label: 'Paris, France', value: 'Paris' };
    const perth = { id: 'perth', label: 'Perth' };
    box.setSuggestions(queryId, [paris, { id: 'pune', label: 'Pune', disabled: true }, perth]);
    await expect.element(input).toHaveAttribute('aria-expanded', 'true');
    expect(box.shadowRoot?.activeElement).toBe(input.element());
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    const option = page.getByRole('option', { name: 'Perth', selected: true });
    await expect.element(option).toBeVisible();
    expect(input.element().getAttribute('aria-activedescendant')).toBe(option.element().id);
    await expect.element(input).toHaveValue('p');

    box.setSuggestions(queryId, [perth, paris, { id: 'perth', label: 'Duplicate' }]);
    await expect.element(option).toBeVisible();
    await expect.element(input).toHaveAttribute('aria-activedescendant', option.element().id);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(submitted).toEqual([{ query: 'Paris', item: paris }]);
    await expect.element(input).toHaveValue('Paris');
    await expect.element(input).toHaveAttribute('aria-expanded', 'false');
    expect(box.setSuggestions(queryId, [paris])).toBe(false);
    expect(box.shadowRoot?.activeElement).toBe(input.element());
    await userEvent.keyboard('{Enter}');
    expect(submitted.at(-1)).toEqual({ query: 'Paris' });
  });

  test('dismisses suggestions before handling Escape outside and clears with a fresh query', async () => {
    const container = mount(`
      <metro-auto-suggest-box aria-label="Project search" clear-label="Reset query"></metro-auto-suggest-box>
      <button type="button">Outside</button>
    `);
    const box = container.querySelector('metro-auto-suggest-box')!;
    const field = page.getByRole('combobox', { name: 'Project search' });
    const queries: MetroQueryDetail[] = [];
    const outerEscapes: string[] = [];
    container.addEventListener('metro-query', event => queries.push(event.detail));
    container.addEventListener('keydown', event => { if (event.key === 'Escape') outerEscapes.push(event.key); });
    await userEvent.click(field);
    await userEvent.keyboard('r');
    box.setSuggestions(queries[0].queryId, [{ id: 'runs', label: 'Runs' }]);
    await expect.element(field).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    await expect.element(field).toHaveAttribute('aria-expanded', 'false');
    expect(outerEscapes).toEqual([]);
    expect(box.shadowRoot?.activeElement).toBe(field.element());
    box.setSuggestions(queries[0].queryId, [{ id: 'routes', label: 'Routes' }]);
    await expect.element(field).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{Escape}');
    expect(outerEscapes).toEqual(['Escape']);
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(page.getByRole('option', { name: 'Routes', selected: true })).toBeVisible();

    await userEvent.click(page.getByRole('button', { name: 'Reset query' }));
    await expect.element(field).toHaveValue('');
    expect(queries.map(request => request.query)).toEqual(['r', '']);
    expect(box.setSuggestions(queries[1].queryId, [{ id: 'ignored', label: 'Ignored' }])).toBe(false);
    expect(box.shadowRoot?.activeElement).toBe(field.element());
    await userEvent.click(page.getByRole('button', { name: 'Outside' }));
    expect(box.open).toBe(false);
  });

  test('scrolls the active suggestion into view without moving focus or scrolling the page', async () => {
    const container = mount('<metro-auto-suggest-box label="Find a record"></metro-auto-suggest-box>');
    const box = container.querySelector('metro-auto-suggest-box')!;
    const input = page.getByRole('combobox', { name: 'Find a record' });
    const submitted: MetroSubmitDetail[] = [];
    box.addEventListener('metro-submit', event => submitted.push(event.detail));
    box.addEventListener('metro-query', ({ detail }) => {
      box.setSuggestions(detail.queryId, Array.from({ length: 24 }, (_, index) => ({
        id: String(index + 1), label: `Record ${index + 1}`,
      })));
    });
    await userEvent.click(input);
    await userEvent.keyboard('r');
    const list = page.getByRole('listbox', { name: 'Suggestions' });
    await expect.element(list).toBeVisible();
    const top = window.scrollY;
    await userEvent.keyboard('{ArrowUp}');
    const last = page.getByRole('option', { name: 'Record 24', exact: true, selected: true });
    await expect.poll(() => {
      const view = list.element().getBoundingClientRect();
      const row = last.element().getBoundingClientRect();
      return row.top >= view.top && row.bottom <= view.bottom + 1;
    }).toBe(true);
    expect(list.element().scrollTop).toBeGreaterThan(0);
    expect(box.shadowRoot?.activeElement).toBe(input.element());
    expect(window.scrollY).toBe(top);
    await userEvent.keyboard('{Enter}');
    expect(submitted.map(result => result.item?.id)).toEqual(['24']);
  });

  test('opens above a field near the bottom and stays clickable outside its scroll container', async () => {
    const container = mount(`
      <div style="height:2rem"></div>
      <metro-auto-suggest-box label="Search near the bottom" style="width:260px"></metro-auto-suggest-box>
      <div style="height:2rem"></div>
    `);
    container.style.cssText = 'position:fixed;bottom:8px;left:8px;width:280px;height:120px;overflow:auto';
    const box = container.querySelector('metro-auto-suggest-box')!;
    const field = page.getByRole('combobox', { name: 'Search near the bottom' });
    const popup = () => box.shadowRoot!.querySelector<HTMLElement>('[part="popup"]')!.getBoundingClientRect();
    const control = () => box.shadowRoot!.querySelector<HTMLElement>('[part="control"]')!.getBoundingClientRect();
    const submits: string[] = [];
    box.addEventListener('metro-query', ({ detail }) => {
      box.setSuggestions(detail.queryId, Array.from({ length: 8 }, (_, index) => ({
        id: String(index + 1), label: `Result ${index + 1}`,
      })));
    });
    box.addEventListener('metro-submit', ({ detail }) => submits.push(detail.query));
    await field.fill('r');
    await expect.element(field).toHaveAttribute('aria-expanded', 'true');
    expect(popup().bottom).toBeCloseTo(control().top, 0);
    expect(popup().top).toBeGreaterThanOrEqual(0);
    expect(popup().top).toBeLessThan(container.getBoundingClientRect().top);
    container.scrollTop = 15;
    await expect.poll(() => Math.abs(popup().bottom - control().top)).toBeLessThan(1);
    await userEvent.keyboard('{ArrowUp}');
    const last = page.getByRole('option', { name: 'Result 8', exact: true, selected: true });
    await userEvent.click(last);
    await expect.element(field).toHaveValue('Result 8');
    await expect.element(field).toHaveAttribute('aria-expanded', 'false');
    expect(box.shadowRoot?.activeElement).toBe(field.element());
    expect(submits).toEqual(['Result 8']);
  });

  test.skipIf(server.browser !== 'chromium')('requests a suggestion once when emulated IME composition is committed', async () => {
    const container = mount('<metro-auto-suggest-box label="Translation"></metro-auto-suggest-box>');
    const box = container.querySelector('metro-auto-suggest-box')!;
    const input = page.getByRole('combobox', { name: 'Translation' });
    const queries: string[] = [];
    const submissions: string[] = [];
    box.addEventListener('metro-query', event => queries.push(event.detail.query));
    box.addEventListener('metro-submit', event => submissions.push(event.detail.query));
    await userEvent.click(input);
    const session = cdp();
    await session.send('Input.imeSetComposition', { text: 'に', selectionStart: 1, selectionEnd: 1 });
    expect(queries).toEqual([]);
    box.shadowRoot!.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', isComposing: true, bubbles: true, cancelable: true,
    }));
    expect(submissions).toEqual([]);
    await session.send('Input.insertText', { text: '日本' });
    await expect.element(input).toHaveValue('日本');
    expect(queries).toEqual(['日本']);
  });

  test.skipIf(server.browser !== 'chromium')('accepts a suggestion using emulated touch without moving focus to the option', async () => {
    const container = mount('<metro-auto-suggest-box label="Search the library"></metro-auto-suggest-box>');
    const box = container.querySelector('metro-auto-suggest-box')!;
    const input = page.getByRole('combobox', { name: 'Search the library' });
    const submissions: string[] = [];
    box.addEventListener('metro-submit', event => submissions.push(event.detail.query));
    box.addEventListener('metro-query', event => {
      box.setSuggestions(event.detail.queryId, [{ id: 'lib', label: 'Library' }]);
    });
    await userEvent.click(input);
    await userEvent.keyboard('l');
    const option = page.getByRole('option', { name: 'Library' });
    await expect.element(option).toBeVisible();
    const bounds = option.element().getBoundingClientRect();
    const iframe = window.frameElement?.getBoundingClientRect();
    const point = {
      x: bounds.x + bounds.width / 2 + (iframe?.left ?? 0),
      y: bounds.y + bounds.height / 2 + (iframe?.top ?? 0),
    };
    const session = cdp();
    await session.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    try {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.element(input).toHaveValue('Library');
      expect(submissions).toEqual(['Library']);
      expect(box.shadowRoot?.activeElement).toBe(input.element());
    } finally {
      await session.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    }
  });
});

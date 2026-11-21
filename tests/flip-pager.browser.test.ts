import { afterEach, describe, expect, it } from 'vitest';
import { commands, page, server, userEvent } from 'vitest/browser';
import '../src/flip-view.js';
import '../src/pips-pager.js';

function fixture(markup: string) {
  const host = document.createElement('div');
  host.dataset.flipPagerTest = '';
  host.innerHTML = markup;
  document.body.append(host);
  return host;
}

interface FlipTouchState {
  values: string[];
  clicks: number;
  value: string;
  hub: string;
  offset: number;
  scrollTop: number;
}

declare module 'vitest/browser' {
  interface BrowserCommands {
    flipViewNestedTouch(): Promise<Record<'vertical' | 'disabled' | 'preview' | 'horizontal' | 'button'
      | 'programmatic' | 'keyboard' | 'click', FlipTouchState>>;
  }
}

afterEach(() => document.querySelectorAll('[data-flip-pager-test]').forEach(host => host.remove()));

describe('metro-flip-view', () => {
  it('localizes counter, slide names and pager announcements through their own templates', async () => {
    const host = fixture(`
      <metro-flip-view label="Фотографии" value="coast" position-label="Кадр {current} из {total}"
        carousel-description="галерея" slide-description="кадр" previous-label="Назад" next-label="Вперёд">
        <p data-value="coast">Маяк на мысе</p><p data-value="lake">Тихое озеро</p>
      </metro-flip-view>
      <metro-pips-pager label="Страницы" count="2" page="1" position-label="Страница {current} из {total}"></metro-pips-pager>
    `);
    const view = host.querySelector('metro-flip-view')!;
    const pager = host.querySelector('metro-pips-pager')!;
    view.addEventListener('metro-change', event => { pager.page = event.detail.value === 'lake' ? 2 : 1; });
    const gallery = page.getByRole('region', { name: 'Фотографии' });
    await expect.element(gallery).toHaveAttribute('aria-roledescription', 'галерея');
    await expect.element(page.getByRole('status')).toHaveTextContent('Кадр 1 из 2');
    await expect.element(page.getByRole('group', { name: 'Кадр 1 из 2' })).toHaveAttribute('aria-roledescription', 'кадр');
    await page.getByRole('button', { name: 'Вперёд' }).click();
    await expect.element(page.getByRole('status')).toHaveTextContent('Кадр 2 из 2');
    await expect.element(page.getByRole('group', { name: 'Кадр 2 из 2' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Страница 2 из 2' })).toHaveAttribute('aria-current', 'page');
    expect(pager.shadowRoot!.querySelector('[aria-live="polite"]')?.textContent).toBe('Страница 2 из 2');

    pager.focus();
    pager.positionLabel = 'Из {total}: {current}';
    await expect.element(page.getByRole('button', { name: 'Из 2: 2' })).toBeVisible();
    expect(pager.shadowRoot?.activeElement?.getAttribute('aria-label')).toBe('Из 2: 2');
    expect(pager.shadowRoot!.querySelector('[aria-live="polite"]')?.textContent).toBe('Из 2: 2');
  });

  it.each(['ltr', 'rtl'])('keeps a short counter on one line and both controls operable in a narrow enlarged %s gallery', async direction => {
    const host = fixture(`
      <metro-flip-view dir="${direction}" label="Trips" style="inline-size:241px;font-size:1rem">
        <p data-value="north">North trip</p><p data-value="south">South trip</p>
      </metro-flip-view>
    `);
    const root = document.documentElement;
    const originalSize = root.style.fontSize;
    root.style.fontSize = '200%';
    try {
      const status = page.getByRole('status');
      await expect.element(status).toHaveTextContent('1 of 2');
      const range = document.createRange();
      range.selectNodeContents(status.element());
      expect(new Set([...range.getClientRects()].map(rect => rect.top)).size).toBe(1);
      const bounds = host.querySelector('metro-flip-view')!.getBoundingClientRect();
      for (const button of page.getByRole('button').elements()) {
        const rect = button.getBoundingClientRect();
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.left).toBeGreaterThanOrEqual(bounds.left - 1);
        expect(rect.right).toBeLessThanOrEqual(bounds.right + 1);
      }
      const next = page.getByRole('button', { name: 'Next item' });
      await next.click();
      await expect.element(status).toHaveTextContent('2 of 2');
      await expect.element(next).toHaveAttribute('aria-disabled', 'true');
    } finally {
      root.style.fontSize = originalSize;
    }
  });

  it('restores the viewport when a focused slide or the last navigation button disappears', async () => {
    const host = fixture(`
      <metro-flip-view label="Trips" value="north">
        <article data-value="north"><input aria-label="Notes"></article>
        <article data-value="south">South trip</article>
        <p slot="empty">No trips</p>
      </metro-flip-view>
      <button type="button">Next form</button>
    `);
    const view = host.querySelector('metro-flip-view')!;
    const viewport = () => view.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!;
    const changes: string[] = [];
    view.addEventListener('metro-change', event => changes.push(event.detail.value));
    await page.getByRole('textbox', { name: 'Notes' }).click();
    host.querySelector('[data-value="north"]')!.remove();
    await expect.poll(() => view.value).toBe('south');
    expect(view.shadowRoot?.activeElement).toBe(viewport());

    const next = page.getByRole('button', { name: 'Next item' });
    (next.element() as HTMLButtonElement).focus();
    host.querySelector('[data-value="south"]')!.remove();
    await expect.element(page.getByText('No trips')).toBeVisible();
    expect(view.shadowRoot?.activeElement).toBe(viewport());
    expect(changes).toEqual([]);
    await userEvent.tab();
    const outside = page.getByRole('button', { name: 'Next form' });
    await expect.element(outside).toHaveFocus();

    const slide = document.createElement('article');
    slide.dataset.value = 'west';
    slide.innerHTML = '<input aria-label="Route">';
    view.append(slide);
    await page.getByRole('textbox', { name: 'Route' }).click();
    slide.remove();
    (outside.element() as HTMLButtonElement).focus();
    await expect.element(page.getByText('No trips')).toBeVisible();
    await expect.element(outside).toHaveFocus();
  });

  it('preserves keyed slide state and the nearest successor, keeps bounded controls and commits user actions once', async () => {
    const host = fixture(`
      <metro-flip-view label="Cities" value="lisbon" style="width: 390px">
        <article data-value="madrid">Madrid</article>
        <article data-value="lisbon"><label>Lisbon notes <input value=""></label></article>
        <article data-value="paris">Paris</article>
        <p slot="empty">Add a city to get started</p>
      </metro-flip-view>
    `);
    const view = host.querySelector('metro-flip-view')!;
    const values: string[] = [];
    view.addEventListener('metro-change', event => values.push(event.detail.value));

    await expect.element(page.getByRole('status')).toHaveTextContent('2 of 3');
    const lisbon = host.querySelector('[data-value="lisbon"]')!;
    const paris = host.querySelector('[data-value="paris"]')!;
    lisbon.querySelector('input')!.value = 'Bring a coat';

    await page.getByRole('button', { name: 'Next item' }).click();
    await expect.poll(() => values).toEqual(['paris']);
    await expect.element(page.getByRole('button', { name: 'Next item' })).toHaveAttribute('aria-disabled', 'true');
    view.focus();
    await userEvent.keyboard('{Home}');
    await expect.poll(() => values).toEqual(['paris', 'madrid']);

    view.value = 'lisbon';
    view.insertBefore(lisbon, view.firstElementChild);
    await expect.element(page.getByRole('status')).toHaveTextContent('1 of 3');
    await expect.element(page.getByRole('textbox', { name: 'Lisbon notes' })).toHaveValue('Bring a coat');
    lisbon.remove();
    await expect.poll(() => view.value).toBe('madrid');
    await expect.element(page.getByRole('status')).toHaveTextContent('1 of 2');

    view.value = 'paris';
    await view.updateComplete;
    paris.remove();
    await expect.poll(() => view.value).toBe('madrid');
    host.querySelector('[data-value="madrid"]')!.remove();
    await expect.element(page.getByText('Add a city to get started')).toBeVisible();
    expect(values).toEqual(['paris', 'madrid']);
  });

  it.skipIf(server.browser !== 'chromium')('preserves nested scrolling and hands off an active swipe to the app or keyboard', async () => {
    const { vertical, disabled, preview, horizontal, button, programmatic, keyboard, click } = await commands.flipViewNestedTouch();
    expect(vertical).toMatchObject({ value: 'one', values: [] });
    expect(vertical.scrollTop).toBeGreaterThan(45);
    expect(disabled).toMatchObject({ value: 'one', hub: 'gallery', offset: 0, values: [] });
    expect(preview).toMatchObject({ value: 'one', scrollTop: 0, values: [] });
    expect(horizontal).toMatchObject({ value: 'two', hub: 'gallery', clicks: 0, values: ['two'] });
    expect(button).toMatchObject({ value: 'one', hub: 'gallery', values: ['two', 'one'] });
    expect(programmatic).toMatchObject({ value: 'three', hub: 'gallery', clicks: 0, values: ['two', 'one'] });
    expect(keyboard).toMatchObject({ value: 'three', hub: 'gallery', clicks: 0, values: ['two', 'one', 'three'] });
    expect(click).toMatchObject({ value: 'one', hub: 'gallery', clicks: 1, values: ['two', 'one', 'three'] });
  });
});

describe('metro-pips-pager', () => {
  it.each(['ltr', 'rtl'])('reveals the focused pip when navigation wraps in %s', async direction => {
    const host = fixture(`
      <div style="max-block-size:64px;inline-size:120px;overflow:auto;scrollbar-width:none">
        <metro-pips-pager dir="${direction}" style="inline-size:100%" count="1000" page="1"></metro-pips-pager>
      </div>
    `);
    const pager = host.querySelector('metro-pips-pager')!;
    const scroll = pager.parentElement!;
    const previousSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '200%';
    const changes: number[] = [];
    pager.addEventListener('metro-page-change', event => changes.push(event.detail.page));
    const checkVisible = async (name: string) => {
      const button = page.getByRole('button', { name, exact: true });
      await expect.element(button).toHaveAttribute('aria-current', 'page');
      expect(pager.shadowRoot?.activeElement).toBe(button.element());
      const view = scroll.getBoundingClientRect();
      const bounds = button.element().getBoundingClientRect();
      expect(bounds.top).toBeGreaterThanOrEqual(view.top - 1);
      expect(bounds.bottom).toBeLessThanOrEqual(view.bottom + 1);
    };
    try {
      await expect.element(page.getByRole('button', { name: 'Page 1 of 1000' })).toBeVisible();
      pager.focus();
      await userEvent.keyboard('{End}');
      await checkVisible('Page 1000 of 1000');
      expect(scroll.scrollTop).toBeGreaterThan(0);
      await userEvent.keyboard('{Home}');
      await checkVisible('Page 1 of 1000');
      expect(scroll.scrollTop).toBe(0);
      pager.page = 1000;
      await checkVisible('Page 1000 of 1000');
      expect(scroll.scrollTop).toBeGreaterThan(0);
      expect(changes).toEqual([1000, 1]);
    } finally {
      document.documentElement.style.fontSize = previousSize;
    }
  });

  it('holds focus when pages disappear and resumes from the selected page without emitting a change', async () => {
    const host = fixture(`
      <metro-pips-pager dir="rtl" label="Pages" count="6" page="5"></metro-pips-pager>
      <button type="button">After pager</button>
    `);
    const pager = host.querySelector('metro-pips-pager')!;
    const navigation = page.getByRole('navigation', { name: 'Pages' });
    const current = () => pager.shadowRoot?.activeElement?.getAttribute('aria-label');
    const changes: number[] = [];
    pager.addEventListener('metro-page-change', event => changes.push(event.detail.page));
    await expect.element(navigation.getByRole('button', { name: 'Page 5 of 6' })).toBeVisible();
    pager.focus();
    pager.count = 2;
    await expect.poll(current).toBe('Page 2 of 2');
    pager.count = 0;
    await expect.element(navigation.getByRole('button')).not.toBeInTheDocument();
    expect(pager.shadowRoot?.activeElement).toBe(navigation.element());
    expect(pager.page).toBe(0);
    pager.count = 4;
    await expect.poll(current).toBe('Page 1 of 4');
    expect(changes).toEqual([]);
    await userEvent.keyboard('{ArrowLeft}');
    await expect.poll(current).toBe('Page 2 of 4');
    expect(changes).toEqual([2]);
    await userEvent.tab();
    const after = page.getByRole('button', { name: 'After pager' });
    await expect.element(after).toHaveFocus();
    pager.count = 0;
    await expect.element(navigation.getByRole('button')).not.toBeInTheDocument();
    pager.count = 2;
    await expect.element(navigation.getByRole('button', { name: 'Page 1 of 2' })).toBeVisible();
    await expect.element(after).toHaveFocus();
    expect(changes).toEqual([2]);
  });

  it('keeps a bounded window with both endpoints and keeps focused page selection independent', async () => {
    const host = fixture(`
      <metro-pips-pager label="Forecast pages" count="10000" page="540" max-visible="5"></metro-pips-pager>
      <metro-pips-pager label="Photo pages" count="4" page="3"></metro-pips-pager>
    `);
    const pager = host.querySelector('metro-pips-pager')!;
    const changes: number[] = [];
    pager.addEventListener('metro-page-change', event => changes.push(event.detail.page));
    const forecast = page.getByRole('navigation', { name: 'Forecast pages' });
    const pips = forecast.getByRole('button');
    await expect.element(forecast.getByRole('button', { name: 'Page 540 of 10000' })).toHaveAttribute('aria-current', 'page');
    expect(pips.elements()).toHaveLength(5);
    expect(pager.shadowRoot!.querySelectorAll('[part="overflow"]')).toHaveLength(2);

    pager.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.poll(() => pager.shadowRoot!.activeElement?.getAttribute('aria-label')).toBe('Page 541 of 10000');
    await userEvent.keyboard('{End}');
    await expect.element(forecast.getByRole('button', { name: 'Page 10000 of 10000' })).toHaveAttribute('aria-current', 'page');
    expect(changes).toEqual([541, 10000]);

    pager.page = 2;
    pager.count = 3;
    await expect.element(forecast.getByRole('button', { name: 'Page 2 of 3' })).toHaveAttribute('aria-current', 'page');
    await forecast.getByRole('button', { name: 'Page 1 of 3' }).click();
    expect(changes).toEqual([541, 10000, 1]);
    expect(host.querySelectorAll('metro-pips-pager')[1].page).toBe(3);
  });

  it('keeps the standard window on one line in a narrow column at double text size', async () => {
    const host = fixture('<metro-pips-pager style="inline-size:241px" count="1000" page="500"></metro-pips-pager>');
    const root = document.documentElement;
    const originalSize = root.style.fontSize;
    root.style.fontSize = '200%';
    try {
      const navigation = page.getByRole('navigation', { name: 'Pages' });
      await expect.element(navigation.getByRole('button', { name: 'Page 500 of 1000' })).toBeVisible();
      const pager = host.querySelector('metro-pips-pager')!;
      const bounds = navigation.element().getBoundingClientRect();
      const pips = [...pager.shadowRoot!.querySelectorAll('nav button')].map(button => button.getBoundingClientRect());
      expect(pips).toHaveLength(7);
      expect(pips.every(rect => rect.top === pips[0].top && rect.right <= bounds.right && rect.width >= 28)).toBe(true);
      for (const separator of pager.shadowRoot!.querySelectorAll('[part="overflow"]')) {
        const range = document.createRange();
        range.selectNodeContents(separator);
        expect(range.getBoundingClientRect().width).toBeLessThanOrEqual(separator.getBoundingClientRect().width + 1);
      }
    } finally {
      root.style.fontSize = originalSize;
    }
  });
});

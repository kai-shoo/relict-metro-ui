import { afterEach, expect, it } from 'vitest';
import { commands, page, server, userEvent, type Locator } from 'vitest/browser';
import '../src/table-view.js';
import '../src/chart.js';
import type { MetroTableSort } from '../src/table-view.js';

function fixture(markup: string) {
  const host = document.createElement('div');
  host.dataset.tableChartTest = '';
  host.innerHTML = markup;
  document.body.append(host);
  return host;
}

async function focused(locator: Locator): Promise<void> {
  await expect.poll(() => {
    const element = locator.query();
    return element !== null && (element.getRootNode() as ShadowRoot | Document).activeElement === element;
  }).toBe(true);
}

afterEach(() => document.querySelectorAll('[data-table-chart-test]').forEach(host => host.remove()));

it('sorts a semantic native table and activates the row identified by its stable key', async () => {
  const host = fixture(`<metro-table-view label="Orders" action-label="Open" locale="en"></metro-table-view>`);
  const table = host.querySelector('metro-table-view')!;
  table.columns = [{ key: 'name', label: 'Name', rowHeader: true, sortable: true }, { key: 'price', label: 'Price', sortable: true }];
  const rows = [
    { id: 'ten', cells: { name: 'Order 10', price: 10 } },
    { id: 'two', cells: { name: 'Order 2', price: 2 } },
    { id: 'unknown', cells: { name: 'Unknown', price: null }, disabled: true },
  ];
  table.rows = rows;
  const sorts: MetroTableSort[] = [];
  const opened: string[] = [];
  table.addEventListener('metro-sort-change', event => sorts.push(event.detail));
  table.addEventListener('metro-row-activate', event => opened.push(event.detail.id));

  const orders = page.getByRole('table', { name: 'Orders' });
  const price = orders.getByRole('button', { name: 'Price' });
  await expect.element(orders).toBeVisible();
  await expect.element(orders.getByRole('button', { name: 'Open Unknown' })).toBeDisabled();
  await price.click();
  await expect.element(orders.getByRole('columnheader', { name: 'Price' })).toHaveAttribute('aria-sort', 'ascending');
  expect(orders.getByRole('rowheader').elements().map(el => el.textContent)).toEqual(['Order 2', 'Order 10', 'Unknown']);
  await focused(price);
  await userEvent.keyboard('{Enter}');
  await expect.element(orders.getByRole('columnheader', { name: 'Price' })).toHaveAttribute('aria-sort', 'descending');
  expect(orders.getByRole('rowheader').elements().map(el => el.textContent)).toEqual(['Order 10', 'Order 2', 'Unknown']);
  expect(rows.map(row => row.id)).toEqual(['ten', 'two', 'unknown']);
  expect(sorts).toEqual([{ key: 'price', direction: 'ascending' }, { key: 'price', direction: 'descending' }]);

  await orders.getByRole('button', { name: 'Open Order 2' }).click();
  expect(opened).toEqual(['two']);
});

it('updates sorting silently and retains the focused keyed action across reordered rows', async () => {
  const host = fixture(`<metro-table-view action-label="Edit" empty-label="No active cities"></metro-table-view>`);
  const table = host.querySelector('metro-table-view')!;
  table.columns = [{ key: 'place', label: 'Place', rowHeader: true, sortable: true }];
  table.rows = [{ id: 'b', cells: { place: 'Beta' } }, { id: 'a', cells: { place: 'Alpha' } }];
  let changes = 0;
  table.addEventListener('metro-sort-change', () => changes++);
  const action = page.getByRole('button', { name: 'Edit Beta' });
  await expect.element(action).toBeVisible();
  (action.element() as HTMLElement).focus();
  table.sort = { key: 'place', direction: 'ascending' };
  await expect.element(page.getByRole('columnheader', { name: 'Place' })).toHaveAttribute('aria-sort', 'ascending');
  await focused(action);
  expect(page.getByRole('rowheader').elements().map(el => el.textContent)).toEqual(['Alpha', 'Beta']);
  expect(changes).toBe(0);

  table.rows = [];
  await expect.element(page.getByRole('cell', { name: 'No active cities' })).toBeVisible();
  await focused(page.getByRole('table'));
});

it.each(['ltr', 'rtl'])('reveals a focused sort button moved out of view by reordered columns in %s', async direction => {
  const host = fixture(`<metro-table-view dir="${direction}" style="inline-size: 210px"></metro-table-view>`);
  const table = host.querySelector('metro-table-view')!;
  const name = { key: 'name', label: 'Name', sortable: true };
  const other = Array.from({ length: 8 }, (_, index) => ({ key: `column-${index}`, label: `Destination ${index + 1}` }));
  table.columns = [name, ...other];
  const sort = page.getByRole('button', { name: 'Name' });
  await expect.element(sort).toBeVisible();
  (sort.element() as HTMLButtonElement).focus();
  const viewport = table.shadowRoot!.querySelector('[part="viewport"]')!;
  expect(viewport.scrollLeft).toBe(0);
  table.columns = [...other, name];
  await table.updateComplete;
  await focused(sort);
  const button = sort.element().getBoundingClientRect();
  expect(Math.abs(viewport.scrollLeft)).toBeGreaterThan(0);
  const box = viewport.getBoundingClientRect();
  expect(button.left).toBeGreaterThanOrEqual(box.left - 1);
  expect(button.right).toBeLessThanOrEqual(box.right + 1);
});

it.each(['ltr', 'rtl'])('keeps a focused sort button visible when a table narrows in %s', async direction => {
  const host = fixture(`<metro-table-view dir="${direction}" style="inline-size:650px" label="Поездки"></metro-table-view>`);
  const table = host.querySelector('metro-table-view')!;
  table.columns = [
    { key: 'number', label: 'Маршрут' },
    { key: 'city', label: 'Назначение' },
    { key: 'date', label: 'Дата', sortable: true },
  ];
  const sort = page.getByRole('button', { name: 'Дата', exact: true });
  const fontSize = document.documentElement.style.fontSize;
  document.documentElement.style.fontSize = '200%';
  try {
    await expect.element(sort).toBeVisible();
    (sort.element() as HTMLElement).focus({ preventScroll: true });
    const viewport = table.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!;
    expect(viewport.scrollLeft).toBe(0);
    table.style.inlineSize = '180px';
    await expect.poll(() => {
      const box = viewport.getBoundingClientRect();
      const button = sort.element().getBoundingClientRect();
      return button.left >= box.left - 1 && button.right <= box.right + 1;
    }).toBe(true);
    expect(Math.abs(viewport.scrollLeft)).toBeGreaterThan(0);
    await focused(sort);
    await userEvent.keyboard('{Enter}');
    await expect.element(page.getByRole('columnheader', { name: 'Дата' })).toHaveAttribute('aria-sort', 'ascending');
    const long = 'ДатаОтправленияПолевойСтанции';
    table.columns = table.columns.map(column => column.key === 'date' ? { ...column, label: long } : column);
    const renamed = page.getByRole('button', { name: long, exact: true });
    await focused(renamed);
    const view = viewport.getBoundingClientRect();
    const bounds = renamed.element().getBoundingClientRect();
    expect(bounds.width).toBeGreaterThan(view.width);
    const leadingOffset = direction === 'rtl' ? bounds.right - view.right : bounds.left - view.left;
    expect(Math.abs(leadingOffset)).toBeLessThanOrEqual(1);
  } finally {
    document.documentElement.style.fontSize = fontSize;
  }
});

it.each(['ltr', 'rtl'])('keeps the native table caption visible while columns scroll in %s', async direction => {
  const label = 'Отправления полевых станций';
  const host = fixture(`<metro-table-view dir="${direction}" style="inline-size:190px" label="${label}"></metro-table-view>`);
  const table = host.querySelector('metro-table-view')!;
  table.columns = Array.from({ length: 6 }, (_, index) => ({
    key: `column-${index}`, label: `Направление ${index + 1}`,
  }));
  const oldSize = document.documentElement.style.fontSize;
  document.documentElement.style.fontSize = '200%';
  try {
    await expect.element(page.getByRole('table', { name: label, exact: true })).toBeVisible();
    const viewport = table.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!;
    const caption = table.shadowRoot!.querySelector('table > caption')!;
    expect(viewport.scrollWidth).toBeGreaterThan(viewport.clientWidth * 2);
    const range = document.createRange();
    range.selectNodeContents(caption.firstElementChild ?? caption);
    for (const fraction of [0, .4, 1]) {
      viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) * fraction * (direction === 'rtl' ? -1 : 1);
      const view = viewport.getBoundingClientRect();
      const lines = [...range.getClientRects()];
      expect(lines.length).toBeGreaterThan(1);
      for (const line of lines) {
        expect(line.left).toBeGreaterThanOrEqual(view.left - 1);
        expect(line.right).toBeLessThanOrEqual(view.right + 1);
      }
    }
  } finally {
    document.documentElement.style.fontSize = oldSize;
  }
});

it('keeps unbroken chart titles and legends within a narrow host at 200% text', async () => {
  const host = fixture(`<metro-chart style="inline-size: 220px" label="Электроснабжение"></metro-chart>`);
  const chart = host.querySelector('metro-chart')!;
  chart.categories = [{ id: 'one', label: 'Today' }];
  chart.series = [{ id: 'a', label: 'Электроснабжение', values: { one: 3 } }, { id: 'b', label: 'Target', values: { one: 4 } }];
  await expect.element(page.getByRole('img')).toBeVisible();
  const root = document.documentElement;
  const fontSize = root.style.fontSize;
  root.style.fontSize = '200%';
  try {
    const figure = chart.shadowRoot!.querySelector('figure')!;
    const plot = chart.shadowRoot!.querySelector('.plot')!;
    expect(figure.scrollWidth).toBe(figure.clientWidth);
    expect(plot.scrollWidth).toBeGreaterThan(plot.clientWidth);
  } finally {
    root.style.fontSize = fontSize;
  }
});

it('draws signed bars at a zero baseline and exposes the exact native data table', async () => {
  const host = fixture(`<metro-chart label="Balances" category-label="Month" data-label="Exact data" style="width: 440px"></metro-chart>`);
  const chart = host.querySelector('metro-chart')!;
  chart.categories = [{ id: 'jan', label: 'January' }, { id: 'feb', label: 'February' }];
  chart.series = [{ id: 'balance', label: 'Balance', values: { jan: 7, feb: -4 } },
    { id: 'target', label: 'Target', values: { jan: 3, feb: null } }];

  const figure = page.getByRole('img', { name: 'Balances, bar chart' });
  await expect.element(figure).toBeVisible();
  const drawing = figure.element();
  expect(drawing.namespaceURI).toBe('http://www.w3.org/2000/svg');
  const marks = Array.from(drawing.querySelectorAll<SVGRectElement>('[part="bar"]'));
  const zero = Number(drawing.querySelectorAll('[part="axis"]')[1].getAttribute('y1'));
  expect(marks).toHaveLength(3);
  expect(Number(marks[0].getAttribute('y'))).toBeLessThan(zero);
  expect(Number(marks[1].getAttribute('y'))).toBe(zero);
  expect(Number(marks[1].getAttribute('height'))).toBeGreaterThan(0);

  await page.getByText('Exact data', { exact: true }).click();
  const values = page.getByRole('table', { name: 'Balances Exact data' });
  await expect.element(values).toBeVisible();
  await expect.element(values.getByRole('rowheader', { name: 'February' })).toBeVisible();
  await expect.element(values.getByRole('cell', { name: '-4' })).toBeVisible();
  await expect.element(values.getByRole('cell', { name: 'No value' })).toBeVisible();
});

it('lets the keyboard scroll exact chart values and recovers focus after data disappears', async () => {
  const host = fixture(`<button type="button">Before chart</button>
    <metro-chart label="Trips" data-label="Exact values" style="inline-size:180px"></metro-chart>
    <button type="button">After chart</button>`);
  const chart = host.querySelector('metro-chart')!;
  chart.categories = [{ id: 'today', label: 'Today' }];
  const records = Array.from({ length: 6 }, (_, index) => ({
    id: `series-${index}`, label: `Station ${index + 1}`, values: { today: index + 1 },
  }));
  chart.series = records;
  const plot = page.getByRole('region', { name: 'Trips', exact: true });
  await expect.element(plot).toBeVisible();
  host.querySelector('button')!.focus();
  await userEvent.keyboard('{Tab}');
  await focused(plot);
  await userEvent.keyboard('{ArrowRight}');
  await expect.poll(() => plot.element().scrollLeft).toBeGreaterThan(0);
  const summary = page.getByText('Exact values', { exact: true });
  await userEvent.keyboard('{Tab}');
  await focused(summary);
  await userEvent.keyboard(' ');
  const values = page.getByRole('region', { name: 'Exact values', exact: true });
  await expect.element(values).toBeVisible();
  await userEvent.keyboard('{Tab}');
  await focused(values);
  const scroller = values.element();
  expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
  await userEvent.keyboard('{ArrowRight}');
  await expect.poll(() => scroller.scrollLeft).toBeGreaterThan(0);
  expect(window.scrollX).toBe(0);

  chart.series = records.map((record, index) => ({ ...record, values: { today: index + 31 } }));
  await expect.element(page.getByRole('cell', { name: '36', exact: true })).toBeVisible();
  await focused(values);
  chart.series = [];
  await expect.element(values).not.toBeInTheDocument();
  const title = chart.shadowRoot!.querySelector('[part="title"]');
  expect(chart.shadowRoot?.activeElement).toBe(title);
  await userEvent.keyboard('{Tab}');
  await expect.element(page.getByRole('button', { name: 'After chart' })).toHaveFocus();
});

it.skipIf(server.browser !== 'chromium')('keeps chart series distinguishable and matches legend samples in forced colors', async () => {
  const host = fixture('<metro-chart label="Trips"></metro-chart>');
  const chart = host.querySelector('metro-chart')!;
  chart.categories = [{ id: 'today', label: 'Today' }, { id: 'tomorrow', label: 'Tomorrow' }];
  chart.series = [{ id: 'a', label: 'North', values: { today: 12, tomorrow: 10 } },
    { id: 'b', label: 'South', values: { today: 7, tomorrow: 9 } }];
  await chart.updateComplete;
  const root = chart.shadowRoot!;
  const styles = (selector: string) => [...root.querySelectorAll(selector)].map(element => getComputedStyle(element));
  try {
    await commands.setMetroMedia({ colorScheme: 'dark', forcedColors: 'active' });
    expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    await expect.element(page.getByRole('img', { name: 'Trips, bar chart' })).toBeVisible();
    const fills = [...new Set(styles('[part="bar"]').map(style => style.fill))];
    expect(fills).toHaveLength(2);
    expect(styles('.marker rect').map(style => style.fill)).toEqual(fills);

    chart.type = 'line';
    await expect.element(page.getByRole('img', { name: 'Trips, line chart' })).toBeVisible();
    expect([...root.querySelectorAll('[part="line"]')].every(line => line.getAttribute('d')?.includes('L'))).toBe(true);
    const paths = styles('[part="line"]').map(style => style.strokeDasharray);
    expect(paths).toHaveLength(2);
    expect(new Set(paths).size).toBe(2);
    expect(styles('.marker line').map(style => style.strokeDasharray)).toEqual(paths);

    await page.getByText('Data', { exact: true }).click();
    await expect.element(page.getByRole('table', { name: 'Trips Data' }).getByRole('cell', { name: '7' })).toBeVisible();
  } finally {
    await commands.setMetroMedia({ colorScheme: null, forcedColors: null });
  }
});

it('resizes a line chart, draws gaps between missing values and keeps an accessible empty state', async () => {
  const host = fixture(`<metro-chart label="Temperatures" type="line" style="width: 580px"></metro-chart>`);
  const chart = host.querySelector('metro-chart')!;
  chart.categories = [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }, { id: 'three', label: 'Three' }];
  chart.series = [{ id: 'actual', label: 'Actual', values: { one: -Number.MAX_VALUE, two: null, three: Number.MAX_VALUE } }];

  const plot = page.getByRole('img', { name: 'Temperatures, line chart' });
  await expect.element(plot).toBeVisible();
  await expect.poll(() => plot.element().getAttribute('viewBox')?.split(' ')[2]).toBe('580');
  const line = plot.element().querySelector('path')?.getAttribute('d');
  expect(line?.match(/M/g)).toHaveLength(2);
  expect(line).not.toMatch(/NaN|Infinity/);
  expect(plot.element().querySelectorAll('circle')).toHaveLength(2);

  chart.style.width = '290px';
  await expect.poll(() => plot.element().getAttribute('viewBox')?.split(' ')[2]).toBe('290');
  chart.series = [{ id: 'actual', label: 'Actual', values: { one: Infinity } }];
  await expect.element(plot).not.toBeInTheDocument();
  await expect.element(page.getByText('No data')).toBeVisible();
});

it.each(['ltr', 'rtl'])('keeps localized extreme tick labels outside the plot in %s', async direction => {
  const host = fixture(`<metro-chart dir="${direction}" locale="ar-EG" label="Readings" style="width:290px"></metro-chart>`);
  const chart = host.querySelector('metro-chart')!;
  const minimum = -Number.MAX_VALUE;
  const maximum = Number.MAX_VALUE;
  chart.categories = [{ id: 'minimum', label: 'Minimum' }, { id: 'maximum', label: 'Maximum' }];
  chart.series = [{ id: 'selected', label: 'Sensor', values: { minimum, maximum } }];
  const plot = page.getByRole('img', { name: 'Readings, bar chart' });
  await expect.element(plot).toBeVisible();
  await expect.poll(() => plot.element().getAttribute('viewBox')?.split(' ')[2]).toBe('290');
  const checkTicks = (minimum: number, maximum: number) => {
    const drawing = plot.element();
    const axis = Number(drawing.querySelector('[part="axis"]')!.getAttribute('x1'));
    const ticks = [...drawing.querySelectorAll<SVGTextElement>('[part="tick"]')];
    const format = new Intl.NumberFormat('ar-EG', { notation: 'scientific', maximumSignificantDigits: 3 });
    expect(ticks[0].textContent?.trim()).toBe(format.format(minimum));
    expect(ticks.at(-1)?.textContent?.trim()).toBe(format.format(maximum));
    for (const tick of ticks) {
      const bounds = tick.getBBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(axis - 2);
    }
  };
  checkTicks(minimum, maximum);
  await page.getByText('Data', { exact: true }).click();
  await expect.element(page.getByRole('cell', { name: String(maximum), exact: true })).toBeVisible();

  const small = 1e-9;
  chart.series = [{ id: 'selected', label: 'Sensor', values: { minimum: -small, maximum: small } }];
  await chart.updateComplete;
  checkTicks(-small, small);
  await expect.element(page.getByRole('cell', { name: String(small), exact: true })).toBeVisible();
});

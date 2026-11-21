import { LitElement, css, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { defineElement } from './define.js';
import { uniqueByKey } from './keyed-data.js';
import { metroTheme } from './theme.js';

export type MetroTableValue = string | number | boolean | null;

export interface MetroTableColumn {
  readonly key: string;
  readonly label: string;
  readonly sortable?: boolean;
  readonly rowHeader?: boolean;
}

export interface MetroTableRow {
  readonly id: string;
  readonly label?: string;
  readonly cells: Readonly<Partial<Record<string, MetroTableValue>>>;
  readonly disabled?: boolean;
}

export interface MetroTableSort {
  readonly key: string;
  readonly direction: 'ascending' | 'descending';
}

export type MetroSortChangeEvent = CustomEvent<MetroTableSort>;
export type MetroRowActivateEvent = CustomEvent<{ id: string; row: MetroTableRow }>;

function cellValue(row: MetroTableRow, key: string): MetroTableValue {
  const value = Object.hasOwn(row.cells, key) ? row.cells[key] : undefined;
  return value === undefined || (typeof value === 'number' && !Number.isFinite(value)) ? null : value;
}

function collator(locale: string): Intl.Collator {
  const options: Intl.CollatorOptions = { numeric: true, sensitivity: 'base' };
  try { return new Intl.Collator(locale || undefined, options); }
  catch { return new Intl.Collator(undefined, options); }
}

function compareValues(first: Exclude<MetroTableValue, null>, second: Exclude<MetroTableValue, null>, strings: Intl.Collator): number {
  if (typeof first === 'number') return typeof second === 'number' ? first - second : -1;
  if (typeof second === 'number') return 1;
  if (typeof first === 'boolean') return typeof second === 'boolean' ? Number(first) - Number(second) : -1;
  if (typeof second === 'boolean') return 1;
  return strings.compare(first, second);
}

export class MetroTableView extends LitElement {
  static override properties = {
    columns: { attribute: false },
    rows: { attribute: false },
    sort: { attribute: false },
    label: { type: String },
    locale: { type: String },
    emptyLabel: { type: String, attribute: 'empty-label' },
    actionLabel: { type: String, attribute: 'action-label' },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; color: var(--_metro-fg); background: var(--_metro-bg); }
    .viewport { overflow-x: auto; container-type: inline-size; }
    table { inline-size: 100%; border-collapse: collapse; text-align: start; }
    caption { margin-block-end: .5rem; font-size: 1.625rem; font-weight: 300; text-align: start; }
    .caption-text {
      display: block;
      position: sticky;
      inset-inline-start: 0;
      inline-size: 100cqi;
      box-sizing: border-box;
      overflow-wrap: anywhere;
    }
    :is(th, td) {
      padding: var(--metro-table-cell-padding, .375rem .75rem);
      border-block-end: 1px solid var(--_metro-border);
      text-align: start;
      vertical-align: middle;
    }
    thead { background: var(--_metro-chrome); }
    thead th { font-weight: 600; }
    tbody th { font-weight: 500; }
    .numeric { text-align: end; font-variant-numeric: tabular-nums; }
    .empty { color: var(--_metro-muted); }
    button {
      min-block-size: 2.75rem;
      padding: .125rem .375rem;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button:hover:enabled { text-decoration: underline; }
    button:disabled { color: var(--_metro-disabled); cursor: default; }
    :is(table, button):focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
    .indicator { margin-inline-start: .35em; color: var(--_metro-accent-text); }
  `];

  declare columns: readonly MetroTableColumn[];
  declare rows: readonly MetroTableRow[];
  declare sort: MetroTableSort | null;
  declare label: string;
  declare locale: string;
  declare emptyLabel: string;
  declare actionLabel: string;

  #columns: MetroTableColumn[] = [];
  #rows: MetroTableRow[] = [];
  #effectiveSort: MetroTableSort | null = null;
  #restore?: { key: string; kind: 'column' | 'row'; wasVisible: boolean };
  #viewportWidth = 0;
  #resize = new ResizeObserver(() => {
    const viewport = this.#viewport;
    if (!viewport || viewport.clientWidth === this.#viewportWidth) return;
    this.#viewportWidth = viewport.clientWidth;
    const control = this.shadowRoot?.activeElement;
    if (this.#viewportWidth && control instanceof HTMLButtonElement) this.#reveal(control);
  });

  constructor() {
    super();
    this.columns = [];
    this.rows = [];
    this.sort = null;
    this.label = 'Data';
    this.locale = '';
    this.emptyLabel = 'No rows';
    this.actionLabel = '';
  }

  get #viewport(): HTMLElement | null | undefined { return this.renderRoot?.querySelector<HTMLElement>('.viewport'); }

  #observeViewport(): void {
    const viewport = this.#viewport;
    if (!viewport) return;
    this.#viewportWidth = viewport.clientWidth;
    this.#resize.observe(viewport);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observeViewport();
  }

  override disconnectedCallback(): void {
    this.#resize.disconnect();
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    if (this.isConnected) this.#observeViewport();
  }

  protected override willUpdate(): void {
    const active = this.shadowRoot?.activeElement as HTMLElement | null;
    const viewport = active?.closest('.viewport')?.getBoundingClientRect();
    const bounds = active?.getBoundingClientRect();
    const wasVisible = Boolean(viewport && bounds && bounds.left < viewport.right && bounds.right > viewport.left);
    this.#restore = active?.dataset.row ? { key: active.dataset.row, kind: 'row', wasVisible }
      : active?.dataset.column ? { key: active.dataset.column, kind: 'column', wasVisible } : undefined;

    this.#columns = uniqueByKey(this.columns, column => column.key);
    this.#rows = uniqueByKey(this.rows, row => row.id);
    const sort = this.sort;
    this.#effectiveSort = sort && (sort.direction === 'ascending' || sort.direction === 'descending')
      && this.#columns.some(column => column.key === sort.key && column.sortable) ? sort : null;
    if (!this.#effectiveSort) return;

    const { key, direction } = this.#effectiveSort;
    const multiplier = direction === 'ascending' ? 1 : -1;
    const strings = collator(this.locale);
    this.#rows.sort((a, b) => {
      const first = cellValue(a, key);
      const second = cellValue(b, key);
      if (first === null) return second === null ? 0 : 1;
      if (second === null) return -1;
      return multiplier * compareValues(first, second, strings);
    });
  }

  protected override updated(): void {
    const restore = this.#restore;
    if (!restore) return;
    const active = this.shadowRoot?.activeElement;
    if (!active && this.ownerDocument.activeElement !== this.ownerDocument.body) return;
    const controls = Array.from(this.renderRoot.querySelectorAll<HTMLButtonElement>(`[data-${restore.kind}]:enabled`));
    const preferred = controls.find(control => control.dataset[restore.kind] === restore.key) ?? controls[0]
      ?? this.renderRoot.querySelector<HTMLElement>('table');
    if (preferred !== active) preferred?.focus({ preventScroll: true });
    if (restore.wasVisible && preferred instanceof HTMLButtonElement) this.#reveal(preferred);
  }

  #reveal(control: HTMLButtonElement): void {
    const viewport = this.#viewport;
    if (!viewport) return;
    const left = viewport.getBoundingClientRect().left + viewport.clientLeft;
    const right = left + viewport.clientWidth;
    const button = control.getBoundingClientRect();
    let delta = 0;
    if (button.width > viewport.clientWidth) {
      delta = getComputedStyle(viewport).direction === 'rtl' ? button.right - right : button.left - left;
    } else if (button.left < left) {
      delta = button.left - left;
    } else if (button.right > right) {
      delta = button.right - right;
    }
    if (Math.abs(delta) >= 1) viewport.scrollBy({ left: delta, behavior: 'instant' });
  }

  #requestSort(key: string): void {
    const current = this.#effectiveSort;
    const direction = current?.key === key && current.direction === 'ascending' ? 'descending' : 'ascending';
    this.sort = { key, direction };
    this.dispatchEvent(new CustomEvent('metro-sort-change', { detail: this.sort, bubbles: true, composed: true }) satisfies MetroSortChangeEvent);
  }

  #activate(id: string): void {
    const row = this.rows.find(item => item.id === id);
    if (!row || row.disabled) return;
    this.dispatchEvent(new CustomEvent('metro-row-activate', { detail: { id, row }, bubbles: true, composed: true }) satisfies MetroRowActivateEvent);
  }

  protected override render() {
    const rowHeader = this.#columns.find(column => column.rowHeader) ?? this.#columns[0];
    const action = this.actionLabel;
    return html`
      <div class="viewport" part="viewport">
        <table part="table" tabindex="-1">
          <caption part="caption"><span class="caption-text">${this.label || 'Data'}</span></caption>
          <thead>
            <tr>
              ${repeat(this.#columns, column => column.key, column => {
                const direction = this.#effectiveSort?.key === column.key ? this.#effectiveSort.direction : nothing;
                return html`
                  <th scope="col" part="header" aria-sort=${direction}>
                    ${column.sortable ? html`
                      <button type="button" part="sort" data-column=${column.key} @click=${() => this.#requestSort(column.key)}>
                        ${column.label || column.key}${direction === nothing ? nothing
                          : html`<span class="indicator" aria-hidden="true">${direction === 'ascending' ? '↑' : '↓'}</span>`}
                      </button>` : column.label || column.key}
                  </th>`;
              })}
              ${action ? html`<th scope="col" part="header">${action}</th>` : nothing}
            </tr>
          </thead>
          <tbody>
            ${this.#rows.length && (this.#columns.length || action) ? repeat(this.#rows, row => row.id, row => {
              const rowName = row.label || ((rowHeader && cellValue(row, rowHeader.key)) ?? row.id);
              return html`
                <tr part="row">
                  ${repeat(this.#columns, column => column.key, column => {
                    const value = cellValue(row, column.key);
                    return column.rowHeader
                      ? html`<th scope="row" part="cell" class=${typeof value === 'number' ? 'numeric' : nothing}>${value ?? '—'}</th>`
                      : html`<td part="cell" class=${typeof value === 'number' ? 'numeric' : nothing}>${value ?? '—'}</td>`;
                  })}
                  ${action ? html`
                    <td part="cell"><button type="button" part="action" data-row=${row.id} aria-label=${`${action} ${rowName}`}
                      ?disabled=${row.disabled} @click=${() => this.#activate(row.id)}>${action}</button></td>` : nothing}
                </tr>`;
            }) : html`<tr><td class="empty" part="empty" colspan=${Math.max(1, this.#columns.length + Number(Boolean(action)))}>
                ${this.emptyLabel || 'No rows'}
              </td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  }
}

defineElement('metro-table-view', MetroTableView);

declare global {
  interface HTMLElementTagNameMap { 'metro-table-view': MetroTableView; }
  interface HTMLElementEventMap {
    'metro-sort-change': MetroSortChangeEvent;
    'metro-row-activate': MetroRowActivateEvent;
  }
}

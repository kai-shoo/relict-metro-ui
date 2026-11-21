import { LitElement, css, html, nothing, svg } from 'lit';
import { defineElement } from './define.js';
import { uniqueByKey } from './keyed-data.js';
import { metroTheme } from './theme.js';

export type MetroChartType = 'bar' | 'line';

export interface MetroChartCategory {
  readonly id: string;
  readonly label: string;
}

export interface MetroChartSeries {
  readonly id: string;
  readonly label: string;
  readonly values: Readonly<Partial<Record<string, number | null>>>;
  readonly color?: string;
}

const colors = [
  'var(--_metro-accent)', 'light-dark(#9f0048, #ff86b1)', 'light-dark(#067647, #63de91)',
  'light-dark(#6a3699, #d3a3ff)', 'light-dark(#984700, #ffba70)', 'light-dark(#006977, #79dce9)',
];
const dashes = ['', '8 4', '2 6', '12 5 2 5'];
const hatches = [
  '', 'M-2 2L2-2M0 8L8 0M6 10L10 6', 'M-2 6L2 10M0 0L8 8M6-2L10 2',
  'M0 2H8M0 6H8', 'M2 0V8M6 0V8', 'M2 2h1M6 6h1',
];

function patternStyle(index: number): string {
  const pattern = index % hatches.length;
  return pattern ? `--_chart-pattern:url(#metro-chart-pattern-${pattern})` : '';
}

function valueFor(series: MetroChartSeries, id: string): number | null {
  const value = Object.hasOwn(series.values, id) ? series.values[id] : null;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function colorFor(series: MetroChartSeries, index: number): string {
  const fallback = colors[index % colors.length];
  const color = series.color && CSS.supports('color', series.color) ? series.color : fallback;
  return `var(--metro-chart-series-${index + 1}, ${color})`;
}

function axisFormatter(locale: string): (value: number) => string {
  const formatter = (notation: 'compact' | 'scientific') => {
    const options: Intl.NumberFormatOptions = { maximumSignificantDigits: 3, notation };
    try { return new Intl.NumberFormat(locale || undefined, options); }
    catch { return new Intl.NumberFormat(undefined, options); }
  };
  const compact = formatter('compact');
  const scientific = formatter('scientific');
  return value => {
    const magnitude = Math.abs(value);
    return (magnitude >= 1e12 || (magnitude > 0 && magnitude < .001) ? scientific : compact).format(value || 0);
  };
}

export class MetroChart extends LitElement {
  static override properties = {
    categories: { attribute: false },
    series: { attribute: false },
    type: { type: String, reflect: true },
    label: { type: String },
    locale: { type: String },
    categoryLabel: { type: String, attribute: 'category-label' },
    dataLabel: { type: String, attribute: 'data-label' },
    emptyLabel: { type: String, attribute: 'empty-label' },
    missingLabel: { type: String, attribute: 'missing-label' },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; color: var(--_metro-fg); background: var(--_metro-bg); }
    figure { margin: 0; }
    figcaption { font-size: 1.625rem; font-weight: 300; overflow-wrap: anywhere; }
    .plot, .values { overflow-x: auto; }
    [part="chart"] { display: block; inline-size: 100%; min-inline-size: 16rem; block-size: auto; }
    svg text { fill: var(--_metro-fg); font: 12px var(--_metro-font); }
    [part="tick"] { direction: ltr; unicode-bidi: isolate; }
    .grid { stroke: var(--_metro-border); vector-effect: non-scaling-stroke; }
    .axis { stroke: var(--_metro-fg); vector-effect: non-scaling-stroke; }
    :is(.line, .marker-line) { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: .375rem 1rem;
      margin: .25rem 0 .75rem;
      padding: 0;
      list-style: none;
    }
    .legend li { display: flex; align-items: center; gap: .375rem; min-inline-size: 0; overflow-wrap: anywhere; }
    .marker { display: block; inline-size: 2rem; block-size: .75rem; flex: none; }
    summary { min-block-size: 2.75rem; align-content: center; cursor: pointer; }
    :is(summary, figcaption, .plot, .values):focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
    table { inline-size: 100%; border-collapse: collapse; text-align: start; }
    thead { background: var(--_metro-chrome); }
    :is(th, td) { padding: .3125rem .625rem; border-block-end: 1px solid var(--_metro-border); text-align: start; }
    td { text-align: end; font-variant-numeric: tabular-nums; }
    .empty { color: var(--_metro-muted); }
    .caption {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    @media (forced-colors: active) {
      svg :is(.axis, .grid, .line, .marker-line) { stroke: CanvasText; }
      svg .point { fill: CanvasText; }
      svg :is(.bar, .marker-bar, pattern) { forced-color-adjust: none; }
      svg :is(.bar, .marker-bar) { fill: var(--_chart-pattern, CanvasText); stroke: CanvasText; vector-effect: non-scaling-stroke; }
    }
  `];

  declare categories: readonly MetroChartCategory[];
  declare series: readonly MetroChartSeries[];
  declare type: MetroChartType;
  declare label: string;
  declare locale: string;
  declare categoryLabel: string;
  declare dataLabel: string;
  declare emptyLabel: string;
  declare missingLabel: string;

  #width = 640;
  #axisContext?: CanvasRenderingContext2D;
  #focusedSurface?: Element;
  #resizeFrame?: number;
  #resize = new ResizeObserver(([entry]) => {
    this.#syncScrollRegions();
    const width = Math.max(256, Math.round(entry.contentRect.width));
    if (width === this.#width) return;
    this.#width = width;
    if (this.#resizeFrame !== undefined) return;
    this.#resizeFrame = this.ownerDocument.defaultView?.requestAnimationFrame(() => {
      this.#resizeFrame = undefined;
      this.requestUpdate();
    });
  });

  constructor() {
    super();
    this.categories = [];
    this.series = [];
    this.type = 'bar';
    this.label = 'Chart';
    this.locale = '';
    this.categoryLabel = 'Category';
    this.dataLabel = 'Data';
    this.emptyLabel = 'No data';
    this.missingLabel = 'No value';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#resize.observe(this);
  }

  override disconnectedCallback(): void {
    this.#resize.disconnect();
    if (this.#resizeFrame !== undefined) this.ownerDocument.defaultView?.cancelAnimationFrame(this.#resizeFrame);
    this.#resizeFrame = undefined;
    super.disconnectedCallback();
  }

  protected override willUpdate(): void {
    const active = this.shadowRoot?.activeElement;
    this.#focusedSurface = active?.matches('.plot, .values, summary') ? active : undefined;
  }

  protected override updated(): void {
    this.#syncScrollRegions();
    if (this.#focusedSurface && !this.#focusedSurface.isConnected && this.isConnected
      && this.ownerDocument.activeElement === this.ownerDocument.body) {
      this.shadowRoot?.querySelector<HTMLElement>('figcaption')?.focus({ preventScroll: true });
    }
    this.#focusedSurface = undefined;
  }

  #syncScrollRegions = (): void => {
    for (const region of this.shadowRoot?.querySelectorAll<HTMLElement>('.plot, .values') ?? []) {
      const scrollable = region.scrollWidth > region.clientWidth + 1;
      region.tabIndex = scrollable ? 0 : -1;
      if (scrollable) {
        region.setAttribute('role', 'region');
        region.setAttribute('aria-label', region.matches('.values') ? this.dataLabel || 'Data' : this.label || 'Chart');
      } else {
        region.removeAttribute('role');
        region.removeAttribute('aria-label');
      }
    }
  };

  #plot(categories: MetroChartCategory[], series: MetroChartSeries[], values: (number | null)[][]) {
    let lower = 0;
    let upper = 0;
    for (const column of values) for (const value of column) {
      if (value === null) continue;
      lower = Math.min(lower, value);
      upper = Math.max(upper, value);
    }
    if (lower === upper) upper = 1;

    // Scale extremes before subtracting to keep signed finite values representable.
    const magnitude = Math.max(upper, -lower);
    const low = lower / magnitude;
    const span = upper / magnitude - low;
    const width = this.#width;
    const height = Math.max(200, Math.min(340, Math.round(width * .52)));
    const format = axisFormatter(this.locale);
    const ticks = [lower, ...[.25, .5, .75].map(fraction => (low + fraction * span) * magnitude), upper].map(format);
    this.#axisContext ??= this.ownerDocument.createElement('canvas').getContext('2d') ?? undefined;
    const context = this.#axisContext;
    if (context) context.font = `12px ${getComputedStyle(this).fontFamily}`;
    const left = Math.max(63, ...ticks.map(tick => 9 + Math.ceil(context?.measureText(tick).width ?? 0)));
    const right = width - 16;
    const top = 16;
    const bottom = height - 36;
    const band = (right - left) / categories.length;
    const x = (index: number) => left + (index + .5) * band;
    const y = (value: number) => bottom - ((value / magnitude - low) / span) * (bottom - top);
    const zero = y(0);
    const barWidth = Math.min(42, band * .76 / series.length);
    const line = this.type === 'line';
    const stride = Math.max(1, Math.ceil(66 / band));
    const labelLimit = Math.max(4, Math.floor(band * stride / 7));

    return html`
      <div class="plot" part="plot">
        <svg part="chart" viewBox=${`0 0 ${width} ${height}`} role="img"
          aria-label=${`${this.label || 'Chart'}, ${line ? 'line' : 'bar'} chart`}>
          ${line ? nothing : svg`<defs>${hatches.slice(1).map((path, index) => svg`
            <pattern id=${`metro-chart-pattern-${index + 1}`} width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="Canvas"></rect>
              <path d=${path} stroke="CanvasText" fill="none"></path>
            </pattern>`)}</defs>`}
          ${ticks.map((tick, i) => {
            const position = bottom - (i / 4) * (bottom - top);
            return svg`
              <line class="grid" part="gridline" x1=${left} x2=${right} y1=${position} y2=${position}></line>
              <text x=${left - 6} y=${position} text-anchor="end" dominant-baseline="middle" part="tick">
                ${tick}
              </text>`;
          })}
          <line class="axis" part="axis" x1=${left} x2=${left} y1=${top} y2=${bottom}></line>
          <line class="axis" part="axis" x1=${left} x2=${right} y1=${zero} y2=${zero}></line>
          ${categories.map((category, index) => {
            if (index % stride !== 0) return nothing;
            const full = category.label || category.id;
            const characters = Array.from(full);
            const shortened = characters.length > labelLimit ? `${characters.slice(0, labelLimit - 1).join('')}…` : full;
            return svg`<text x=${x(index)} y=${bottom + 20} text-anchor="middle" part="category-label">
              <title>${full}</title>${shortened}</text>`;
          })}
          ${series.map((item, seriesIndex) => {
            const color = colorFor(item, seriesIndex);
            const points = values[seriesIndex];
            const description = (value: number, index: number) =>
              `${item.label || item.id} · ${categories[index].label || categories[index].id} · ${value}`;
            if (line) {
              let continues = false;
              const path = points.map((value, index) => {
                if (value === null) { continues = false; return ''; }
                const direction = continues ? 'L' : 'M';
                continues = true;
                return `${direction}${x(index)} ${y(value)}`;
              }).join(' ');
              return svg`
                <path d=${path} class="line" part="line" stroke=${color} stroke-dasharray=${dashes[seriesIndex % dashes.length]}></path>
                ${points.map((value, index) => value === null ? nothing : svg`
                  <circle class="point" part="point" cx=${x(index)} cy=${y(value)} r="3" fill=${color}>
                    <title>${description(value, index)}</title>
                  </circle>`)}
              `;
            }
            return points.map((value, index) => value === null ? nothing : svg`
              <rect class="bar" part="bar" x=${x(index) + (seriesIndex - series.length / 2) * barWidth}
                y=${Math.min(zero, y(value))} width=${barWidth} height=${Math.abs(zero - y(value))} fill=${color}
                style=${patternStyle(seriesIndex)}>
                <title>${description(value, index)}</title>
              </rect>`);
          })}
        </svg>
      </div>
    `;
  }

  protected override render() {
    const categories = uniqueByKey(this.categories, category => category.id);
    const series = uniqueByKey(this.series, entry => entry.id);
    const values = series.map(entry => categories.map(category => valueFor(entry, category.id)));
    const hasData = values.some(column => column.some(value => value !== null));
    return html`
      <figure part="figure" aria-labelledby="title">
        <figcaption part="title" id="title" tabindex="-1">${this.label || 'Chart'}</figcaption>
        ${hasData ? this.#plot(categories, series, values) : html`<p class="empty" part="empty">${this.emptyLabel || 'No data'}</p>`}
        ${hasData && series.length > 1 ? html`<ul class="legend" part="legend" role="list">
          ${series.map((entry, index) => {
            const color = colorFor(entry, index);
            return html`<li><svg class="marker" viewBox="0 0 32 12" aria-hidden="true">
              ${this.type === 'line'
                ? svg`<line class="marker-line" x1="1" x2="31" y1="6" y2="6" stroke=${color}
                    stroke-dasharray=${dashes[index % dashes.length]}></line>`
                : svg`<rect class="marker-bar" x=".5" y=".5" width="31" height="11"
                    fill=${color} style=${patternStyle(index)}></rect>`}
            </svg>${entry.label || entry.id}</li>`;
          })}
        </ul>` : nothing}
        ${categories.length && series.length ? html`
          <details part="data" @toggle=${this.#syncScrollRegions}>
            <summary part="data-toggle">${this.dataLabel || 'Data'}</summary>
            <div class="values">
              <table part="table">
                <caption class="caption">${this.label || 'Chart'} ${this.dataLabel || 'data'}</caption>
                <thead><tr>
                  <th scope="col">${this.categoryLabel || 'Category'}</th>
                  ${series.map(entry => html`<th scope="col">${entry.label || entry.id}</th>`)}
                </tr></thead>
                <tbody>${categories.map((category, categoryIndex) => html`
                  <tr>
                    <th scope="row">${category.label || category.id}</th>
                    ${values.map(column => column[categoryIndex] === null
                      ? html`<td aria-label=${this.missingLabel || 'No value'}>—</td>` : html`<td>${column[categoryIndex]}</td>`)}
                  </tr>`)}
                </tbody>
              </table>
            </div>
          </details>` : nothing}
      </figure>
    `;
  }
}

defineElement('metro-chart', MetroChart);

declare global {
  interface HTMLElementTagNameMap { 'metro-chart': MetroChart; }
}

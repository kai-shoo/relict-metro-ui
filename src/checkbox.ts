import { css, html } from 'lit';
import { CheckControl, choiceStyles } from './check-control.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export class MetroCheckbox extends CheckControl {
  static override properties = {
    indeterminate: { type: Boolean, reflect: true },
  };

  static override styles = [metroTheme, choiceStyles, css`
    .check, .mixed {
      display: none;
      grid-area: 1 / 1;
      color: var(--_metro-choice-mark, currentColor);
    }

    .check {
      inline-size: 1.23rem;
      block-size: .62rem;
      border-block-end: 3px solid currentColor;
      border-inline-start: 3px solid currentColor;
      transform: translateY(-.12rem) rotate(-45deg);
    }

    .mixed {
      inline-size: 1rem;
      block-size: 1rem;
      background: currentColor;
    }

    input:checked:not(:indeterminate) + .choice-mark .check,
    input:indeterminate + .choice-mark .mixed {
      display: block;
    }

    @media (forced-colors: active) {
      .mixed { forced-color-adjust: none; background: CanvasText; }
      input:disabled + .choice-mark .mixed { background: GrayText; }
    }
  `];

  declare indeterminate: boolean;

  constructor() {
    super();
    this.indeterminate = false;
  }

  protected override get isMixed() { return this.indeterminate; }

  protected override updateMixed(value: boolean) {
    this.indeterminate = value;
  }

  protected override render() {
    return this.renderControl(html`
      <span class="choice-mark" part="indicator" aria-hidden="true">
        <span class="check" part="check"></span><span class="mixed" part="mixed"></span>
      </span>
    `);
  }
}

defineElement('metro-checkbox', MetroCheckbox);

declare global {
  interface HTMLElementTagNameMap {
    'metro-checkbox': MetroCheckbox;
  }
}

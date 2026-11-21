import { css } from 'lit';
import { defineElement } from './define.js';
import { MetroRadioGroup } from './radio-group.js';

export class MetroSelectorBar extends MetroRadioGroup {
  static override styles = [...MetroRadioGroup.styles, css`
    fieldset {
      display: flex;
      flex-wrap: wrap;
      align-items: stretch;
      gap: .25rem .75rem;
    }

    legend { padding-inline: 0; }

    .choice {
      justify-content: center;
      min-block-size: 2.75rem;
      padding-block: .375rem;
      border-block-end: 3px solid transparent;
      font-size: 1.125rem;
    }

    .choice:has(input:checked) {
      border-block-end-color: var(--metro-selector-indicator, var(--_metro-accent));
    }

    .choice:has(input:focus-visible) {
      outline: 2px solid var(--_metro-focus);
      outline-offset: -2px;
    }

    .choice-mark { display: none; }

    @media (forced-colors: active) {
      .choice:has(input:checked) { border-block-end-color: Highlight; }
    }
  `];
}

defineElement('metro-selector-bar', MetroSelectorBar);

declare global {
  interface HTMLElementTagNameMap { 'metro-selector-bar': MetroSelectorBar; }
}

import { css } from 'lit';

export const metroButtonStyles = css`
  :host { display: inline-flex; max-inline-size: 100%; vertical-align: middle; }

  button {
    display: inline-grid;
    box-sizing: border-box;
    place-items: center;
    min-inline-size: min(3rem, 100%);
    max-inline-size: 100%;
    min-block-size: 3rem;
    padding: 0.3125rem 0.625rem 0.375rem;
    border: 3px solid currentColor;
    border-radius: 0;
    background: transparent;
    color: var(--_metro-fg);
    font: 600 1.4167rem / 1.15 var(--_metro-font);
    overflow-wrap: anywhere;
    cursor: pointer;
  }

  button:active:not(:disabled) {
    background: var(--_metro-accent);
    color: var(--_metro-on-accent);
  }

  button:disabled { color: var(--_metro-disabled); cursor: default; }
  button:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
`;

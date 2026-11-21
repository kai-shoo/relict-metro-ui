import { css } from 'lit';
import { metroTheme } from './theme.js';

export type MetroTextVariant = 'body' | 'subtle' | 'small' | 'title1' | 'title2' | 'title3' | 'large'
  | 'group-header' | 'contrast' | 'accent' | 'huge';

export const textStyles = [metroTheme, css`
  :host {
    display: block;
    min-inline-size: 0;
    color: var(--metro-text-color, var(--_text-color, var(--_metro-fg)));
    font-size: var(--metro-text-size, var(--_text-size, 1.25rem));
    font-weight: var(--metro-text-weight, var(--_text-weight, 400));
    line-height: var(--metro-text-line-height, var(--_text-line-height, 1.3));
  }
  :host([variant="subtle"]), :host([variant="small"]), :host([variant="group-header"]) { --_text-color: var(--_metro-muted); }
  :host([variant="small"]) { --_text-size: 1.1667rem; }
  :host([variant="title1"]) { --_text-size: 4.5rem; }
  :host([variant="title2"]), :host([variant="group-header"]) { --_text-size: 2rem; }
  :host([variant="title3"]) { --_text-size: 1.4167rem; }
  :host([variant="large"]) { --_text-size: 2.6667rem; }
  :host([variant="huge"]) { --_text-size: 11.6667rem; --_text-weight: 200; --_text-line-height: 1; }
  :host([variant^="title"]), :host([variant="group-header"]), :host([variant="large"]) {
    --_text-weight: 300;
    --_text-line-height: 1.1;
  }
  :host([variant="contrast"]), :host([variant="accent"]) { --_text-weight: 600; }
  :host([variant="accent"]) { --_text-color: var(--_metro-accent-text); }
`];

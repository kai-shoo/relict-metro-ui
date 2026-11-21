import { css } from 'lit';

export const metroTheme = css`
  :host {
    color-scheme: var(--metro-color-scheme, light dark);
    --_metro-font: var(--metro-font, "Segoe WP", "Segoe UI", system-ui, sans-serif);
    --_metro-bg: var(--metro-bg, light-dark(#fff, #000));
    --_metro-fg: var(--metro-fg, light-dark(#000d, #fff));
    --_metro-muted: var(--metro-muted, light-dark(#0009, #fff9));
    --_metro-disabled: var(--metro-disabled, light-dark(#0005, #fff6));
    --_metro-chrome: var(--metro-chrome, light-dark(#ddd, #1f1f1f));
    --_metro-accent: var(--metro-accent, #0050ef);
    --_metro-accent-text: var(--metro-accent-text, light-dark(var(--_metro-accent), color-mix(in srgb, var(--_metro-accent) 65%, white)));
    --_metro-on-accent: var(--metro-on-accent, #fff);
    --_metro-input-bg: light-dark(#00000026, #ffffffbf);
    --_metro-input-fg: light-dark(#000000de, #000);
    --_metro-focus: var(--metro-focus, var(--_metro-fg));
    --_metro-border: var(--metro-border, light-dark(#0006, #fff6));
    --_metro-motion: var(--metro-motion, 180ms);
    --_metro-space: var(--metro-space, 0.75rem);

    font-family: var(--_metro-font);
  }

  :host([data-metro-theme="dark"]) { color-scheme: dark; }
  :host([data-metro-theme="light"]) { color-scheme: light; }

  @media (prefers-reduced-motion: reduce) {
    :host { --_metro-motion: 0ms; }
  }

  :host([hidden]) { display: none; }
`;

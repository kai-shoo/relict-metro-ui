import { css } from 'lit';

export const pickerChevron = css`
  .chevron {
    display: block;
    inline-size: .75rem;
    block-size: .4375rem;
    background: currentColor;
    clip-path: polygon(0 20%, 12% 0, 50% 65%, 88% 0, 100% 20%, 50% 100%);
    pointer-events: none;
    forced-color-adjust: none;
  }
`;

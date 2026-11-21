import { defineElement } from './define.js';
import { MetroHub } from './hub.js';

export class MetroPanorama extends MetroHub {
  protected override get panorama(): boolean { return true; }
}

defineElement('metro-panorama', MetroPanorama);

declare global {
  interface HTMLElementTagNameMap { 'metro-panorama': MetroPanorama; }
}

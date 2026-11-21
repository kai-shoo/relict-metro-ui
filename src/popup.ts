import { defineElement } from './define.js';
import { MetroFlyout, type MetroFlyoutCloseReason } from './flyout.js';

export class MetroPopup extends MetroFlyout {
  protected override get lightDismiss(): boolean { return false; }

  focusContent(options?: FocusOptions): void {
    this.surface?.focus(options);
  }

  protected override focusSurface(): void {
    // Focus remains with the caller until the application moves it into the popup.
  }

  protected override closeLayer(reason: MetroFlyoutCloseReason, restoreFocus = false): void {
    super.closeLayer(reason, restoreFocus);
  }
}

defineElement('metro-popup', MetroPopup);

declare global {
  interface HTMLElementTagNameMap { 'metro-popup': MetroPopup; }
}

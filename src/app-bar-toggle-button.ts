import { MetroAppBarButton } from './app-bar-button.js';
import { defineElement } from './define.js';

export class MetroAppBarToggleButton extends MetroAppBarButton {
  static override properties = {
    ...MetroAppBarButton.properties,
    checked: { type: Boolean, reflect: true },
  };

  declare checked: boolean;

  constructor() {
    super();
    this.checked = false;
  }

  protected override get pressedState(): boolean { return this.checked; }

  protected override toggle(): boolean {
    this.checked = !this.checked;
    return this.checked;
  }
}

defineElement('metro-app-bar-toggle-button', MetroAppBarToggleButton);

declare global {
  interface HTMLElementTagNameMap { 'metro-app-bar-toggle-button': MetroAppBarToggleButton; }
}

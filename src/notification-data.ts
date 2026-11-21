import type { MetroIconName } from './icon.js';

export interface MetroNotification {
  id: string;
  title: string;
  message?: string;
  source?: string;
  icon?: MetroIconName;
  href?: string;
  destination?: unknown;
  read?: boolean;
}

export type MetroNotificationActivation = CustomEvent<{
  id: string;
  notification: MetroNotification;
  surface: 'toast' | 'center';
}>;

export type MetroNotificationDismissal = CustomEvent<{
  id: string;
  notification: MetroNotification;
  reason: 'dismiss' | 'timeout' | 'activate';
  surface: 'toast' | 'center';
}>;

export function requestNotificationActivation(
  owner: HTMLElement, notification: MetroNotification, surface: 'toast' | 'center', event: MouseEvent,
): boolean {
  if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
  const approved = owner.dispatchEvent(new CustomEvent('metro-notification-activate', {
    detail: { id: notification.id, notification, surface }, bubbles: true, composed: true, cancelable: true,
  }));
  if (!approved) event.preventDefault();
  return approved;
}

declare global {
  interface HTMLElementEventMap {
    'metro-notification-activate': MetroNotificationActivation;
    'metro-notification-dismiss': MetroNotificationDismissal;
  }
}

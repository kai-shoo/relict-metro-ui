import type { MetroLiveTileContent } from './live-tile.js';

export type MetroShellResult = 'applied' | 'declined' | 'unsupported';

export interface MetroTileDestination {
  readonly href: string;
  readonly parameters?: Readonly<Record<string, string>>;
}

export interface MetroSecondaryTileRequest {
  readonly id: string;
  readonly label: string;
  readonly destination: MetroTileDestination;
  readonly content?: MetroLiveTileContent;
  readonly expiresAt?: number;
}

export interface MetroSecondaryTileHost {
  isPinned(id: string): boolean | PromiseLike<boolean>;
  requestPin(request: MetroSecondaryTileRequest): MetroShellResult | PromiseLike<MetroShellResult>;
  requestUnpin(id: string): MetroShellResult | PromiseLike<MetroShellResult>;
}

export type MetroLockScreenRole = 'badge' | 'status' | 'background';

export type MetroLockScreenUpdate = { readonly version: number } & (
  | { readonly role: 'badge'; readonly count: number | null }
  | { readonly role: 'status'; readonly text: string | null }
  | { readonly role: 'background'; readonly image: string | null }
);

export interface MetroLockScreenHost {
  readonly roles: readonly MetroLockScreenRole[];
  publish(update: MetroLockScreenUpdate): MetroShellResult | PromiseLike<MetroShellResult>;
}

export interface MetroShellHost {
  readonly secondaryTiles?: MetroSecondaryTileHost;
  readonly lockScreen?: MetroLockScreenHost;
  readonly reminders?: MetroReminderHost;
}

export async function requestMetroSecondaryTile(host: MetroShellHost | undefined, request: MetroSecondaryTileRequest): Promise<MetroShellResult> {
  return host?.secondaryTiles ? host.secondaryTiles.requestPin(request) : 'unsupported';
}

export async function unpinMetroSecondaryTile(host: MetroShellHost | undefined, id: string): Promise<MetroShellResult> {
  return host?.secondaryTiles ? host.secondaryTiles.requestUnpin(id) : 'unsupported';
}

export async function publishMetroLockScreen(host: MetroShellHost | undefined, update: MetroLockScreenUpdate): Promise<MetroShellResult> {
  const provider = host?.lockScreen;
  return provider?.roles.includes(update.role) ? provider.publish(update) : 'unsupported';
}

export type MetroBadgeNavigator = Partial<Pick<Navigator, 'setAppBadge' | 'clearAppBadge'>>;

/** Updates the installed web application's badge when the browser exposes the Badging API. */
export async function publishMetroAppBadge(
  count: number, navigator: MetroBadgeNavigator | undefined = globalThis.navigator,
): Promise<MetroShellResult> {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('A badge requires a non-negative integer.');
  const publish = count ? navigator?.setAppBadge?.bind(navigator, count) : navigator?.clearAppBadge?.bind(navigator);
  if (!publish) return 'unsupported';
  try {
    await publish();
    return 'applied';
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') return 'declined';
    if (name === 'NotSupportedError') return 'unsupported';
    throw error;
  }
}

export interface MetroScheduledReminder {
  readonly id: string;
  readonly scheduledAt: number;
  readonly title: string;
  readonly message?: string;
  readonly destination: MetroTileDestination;
}

export interface MetroReminderHost {
  /** Replace a pending reminder with the same ID when the host confirms success. */
  upsert(request: MetroScheduledReminder): MetroShellResult | PromiseLike<MetroShellResult>;
  cancel(id: string): MetroShellResult | PromiseLike<MetroShellResult>;
}

/** Orders updates to the same host reminder, including retries following an error. */
export class MetroReminderScheduler {
  #pending = new Map<string, Promise<MetroShellResult>>();

  constructor(private readonly host?: MetroShellHost) {}

  async schedule(request: MetroScheduledReminder): Promise<MetroShellResult> {
    if (!request.id.trim() || !request.destination.href.trim() ||
      !Number.isFinite(request.scheduledAt) || request.scheduledAt <= 0) {
      throw new RangeError('A reminder needs an ID, a destination and a valid time in milliseconds.');
    }
    const provider = this.host?.reminders;
    if (!provider) return 'unsupported';
    const { destination } = request;
    const snapshot = {
      ...request,
      destination: {
        href: destination.href,
        ...(destination.parameters && { parameters: { ...destination.parameters } }),
      },
    };
    return this.#submit(snapshot.id, () => provider.upsert(snapshot));
  }

  async cancel(id: string): Promise<MetroShellResult> {
    if (!id.trim()) throw new RangeError('A reminder needs an ID.');
    const provider = this.host?.reminders;
    return provider ? this.#submit(id, () => provider.cancel(id)) : 'unsupported';
  }

  #submit(id: string, operation: () => MetroShellResult | PromiseLike<MetroShellResult>): Promise<MetroShellResult> {
    const previous = this.#pending.get(id) ?? Promise.resolve();
    const next = previous.then(operation, operation);
    this.#pending.set(id, next);
    const settle = () => {
      if (this.#pending.get(id) === next) this.#pending.delete(id);
    };
    void next.then(settle, settle);
    return next;
  }
}

export interface MetroDestinationActivation {
  readonly kind: 'link' | 'protocol' | 'tile' | 'notification' | 'reminder';
  readonly destination: MetroTileDestination;
  readonly id?: string;
}

export type MetroActivation =
  | { readonly kind: 'launch' }
  | { readonly kind: 'file'; readonly file: File }
  | MetroDestinationActivation;

export interface MetroActivationDestination {
  readonly identity: string;
  readonly route: string;
  readonly params?: unknown;
  readonly state?: unknown;
}

export interface MetroActivationOptions {
  resolve(
    activation: MetroActivation,
    signal: AbortSignal,
  ): MetroActivationDestination | null | PromiseLike<MetroActivationDestination | null>;
  current(): string | null;
  navigate(destination: MetroActivationDestination, activation: MetroActivation): boolean;
}

export type MetroActivationResult = 'opened' | 'current' | 'unavailable' | 'blocked' | 'superseded';

/** Resolves host entries against live application data and commits the latest destination. */
export class MetroActivationScope {
  #controller: AbortController | undefined;

  constructor(private readonly options: MetroActivationOptions) {}

  async activate(activation: MetroActivation): Promise<MetroActivationResult> {
    const previous = this.#controller;
    const controller = new AbortController();
    this.#controller = controller;
    previous?.abort();
    const { signal } = controller;
    try {
      if (signal.aborted) return 'superseded';
      const destination = await this.options.resolve(activation, signal);
      if (signal.aborted) return 'superseded';
      if (!destination) return 'unavailable';
      if (destination.identity === this.options.current()) return 'current';
      if (signal.aborted) return 'superseded';
      return this.options.navigate(destination, activation) ? 'opened' : 'blocked';
    } catch (error) {
      if (signal.aborted) return 'superseded';
      throw error;
    } finally {
      if (this.#controller === controller) this.#controller = undefined;
    }
  }

  cancel(): void {
    const controller = this.#controller;
    this.#controller = undefined;
    controller?.abort();
  }
}

export interface MetroSystemNotification {
  readonly id: string;
  readonly title: string;
  readonly message?: string;
  readonly icon?: string;
  readonly destination: MetroTileDestination;
  readonly expiresAt?: number;
}

export type MetroNotificationPermission = NotificationPermission | 'unsupported';

export interface MetroNotificationPermissions {
  readonly permission: NotificationPermission;
  requestPermission(): PromiseLike<NotificationPermission>;
}

const notificationFormat = 'metro-notification/1';

function scopedHref(href: string, scope: string): string | null {
  if (!href.trim()) return null;
  try {
    const base = new URL(scope);
    const destination = new URL(href, base);
    if (destination.origin === base.origin && ['https:', 'http:'].includes(destination.protocol) &&
      !destination.username && !destination.password && destination.pathname.startsWith(base.pathname)) {
      return destination.href;
    }
  } catch {
    return null;
  }
  return null;
}

function notificationData(data: unknown): { href: string; parameters?: Record<string, string>; expiresAt?: number } | null {
  if (!data || typeof data !== 'object') return null;
  const { format, href, parameters, expiresAt } = data as Record<string, unknown>;
  if (format !== notificationFormat || typeof href !== 'string' ||
    (expiresAt !== undefined && (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)))) return null;
  if (parameters !== undefined && (!parameters || typeof parameters !== 'object' || Array.isArray(parameters) ||
    !Object.values(parameters).every(value => typeof value === 'string'))) return null;
  return { href, parameters: parameters as Record<string, string> | undefined, expiresAt };
}

/** Reads a scoped activation from a browser NotificationEvent, including from a service worker. */
export function readMetroNotificationActivation(
  notification: Pick<Notification, 'tag' | 'data'>, scope: string, now = Date.now(),
): MetroDestinationActivation | null {
  const payload = notificationData(notification.data);
  if (!notification.tag.trim() || !payload || (payload.expiresAt !== undefined && payload.expiresAt <= now)) return null;
  const href = scopedHref(payload.href, scope);
  return href ? { kind: 'notification', id: notification.tag, destination: {
    href, ...(payload.parameters && { parameters: { ...payload.parameters } }),
  } } : null;
}

type NotificationRegistration = Pick<ServiceWorkerRegistration, 'scope' | 'showNotification' | 'getNotifications'>;

/** Publishes web notifications after permission has been requested by an application action. */
export class MetroBrowserNotifications {
  constructor(
    private readonly registration: NotificationRegistration,
    private readonly permissions: MetroNotificationPermissions | null = globalThis.Notification ?? null,
  ) {}

  get permission(): MetroNotificationPermission {
    return this.permissions?.permission ?? 'unsupported';
  }

  async requestPermission(): Promise<MetroNotificationPermission> {
    if (this.permission !== 'default') return this.permission;
    const provider = this.permissions;
    return typeof provider?.requestPermission === 'function' ? provider.requestPermission() : 'unsupported';
  }

  async publish(notification: MetroSystemNotification): Promise<MetroShellResult> {
    const href = scopedHref(notification.destination.href, this.registration.scope);
    const { expiresAt } = notification;
    if (!notification.id.trim() || !notification.title.trim() || !href ||
      (expiresAt !== undefined && !Number.isFinite(expiresAt))) {
      throw new RangeError('A notification needs an ID, a title and a destination in the service worker scope.');
    }
    if (this.permission === 'unsupported') return 'unsupported';
    if (this.permission !== 'granted' || (expiresAt !== undefined && expiresAt <= Date.now())) return 'declined';
    await this.registration.showNotification(notification.title, {
      tag: notification.id, body: notification.message, icon: notification.icon,
      data: { format: notificationFormat, href, expiresAt, parameters: notification.destination.parameters },
    });
    return 'applied';
  }

  async dismiss(id: string): Promise<MetroShellResult> {
    if (!id.trim()) throw new RangeError('A notification needs an ID.');
    if (this.permission === 'unsupported') return 'unsupported';
    for (const notification of await this.registration.getNotifications({ tag: id })) {
      if (notification.tag === id && notificationData(notification.data)) notification.close();
    }
    return 'applied';
  }

  async pruneExpired(now = Date.now()): Promise<number> {
    if (this.permission === 'unsupported') return 0;
    let count = 0;
    for (const notification of await this.registration.getNotifications()) {
      const { expiresAt } = notificationData(notification.data) ?? {};
      if (expiresAt !== undefined && expiresAt <= now) {
        notification.close();
        count++;
      }
    }
    return count;
  }
}

import { beforeEach, expect, test, vi } from 'vitest';
import { page, server, userEvent } from 'vitest/browser';
import '../src/breadcrumb-bar.js';
import '../src/navigation-view.js';
import '../src/page.js';
import '../src/selector-bar.js';

beforeEach(() => { document.body.replaceChildren(); });

test('SelectorBar drives the selected view using a group of native keyboard controls', async () => {
  document.body.innerHTML = `
    <metro-selector-bar label="View" value="recent">
      <metro-radio value="recent">Recent</metro-radio>
      <metro-radio value="flagged">Flagged</metro-radio>
    </metro-selector-bar>
  `;
  const selector = document.querySelector('metro-selector-bar')!;
  const changes = vi.fn();
  selector.addEventListener('change', changes);

  const group = page.getByRole('radiogroup', { name: 'View' });
  await expect.element(group.getByRole('radio', { name: 'Recent' })).toBeChecked();
  await userEvent.tab();
  await userEvent.keyboard('{ArrowRight}');
  await expect.element(group.getByRole('radio', { name: 'Flagged' })).toBeChecked();
  expect(selector.value).toBe('flagged');
  expect(changes).toHaveBeenCalledTimes(1);

  selector.value = 'recent';
  await expect.element(group.getByRole('radio', { name: 'Recent' })).toBeChecked();
  expect(changes).toHaveBeenCalledTimes(1);
});

test('SelectorBar retains focus through replacement and disabling of an option', async () => {
  document.body.innerHTML = `<metro-selector-bar label="View" value="recent">
    <metro-radio value="recent">Recent</metro-radio><metro-radio value="all">All</metro-radio>
  </metro-selector-bar>`;
  const selector = document.querySelector('metro-selector-bar')!;
  const changes = vi.fn();
  selector.addEventListener('change', changes);
  const original = page.getByRole('radio', { name: 'Recent' });
  await expect.element(original).toBeChecked();
  (original.element() as HTMLInputElement).focus();
  const replacement = document.createElement('metro-radio');
  replacement.value = 'recent';
  replacement.label = 'Latest';
  selector.querySelector('[value="recent"]')!.replaceWith(replacement);
  const latest = page.getByRole('radio', { name: 'Latest' });
  await expect.element(latest).toBeChecked();
  expect(selector.shadowRoot?.activeElement).toBe(latest.element());

  replacement.disabled = true;
  await expect.element(latest).toBeDisabled();
  expect(selector.shadowRoot?.activeElement).toBe(page.getByRole('radio', { name: 'All' }).element());
  expect(selector.value).toBe('');
  expect(changes).not.toHaveBeenCalled();
});

test.each(['metro-selector-bar', 'metro-radio-group'] as const)('%s reveals the fallback when a focused option is disabled', async tag => {
  const options = Array.from({ length: 8 }, (_, index) =>
    `<metro-radio value="option-${index}">Document view option ${index + 1}</metro-radio>`).join('');
  document.body.innerHTML = `<div id="viewport" style="inline-size:200px;block-size:160px;overflow:auto">
    <${tag} label="View" value="option-7">${options}</${tag}>
  </div>`;
  const selector = document.querySelector(tag)!;
  const viewport = document.querySelector<HTMLElement>('#viewport')!;
  const first = page.getByRole('radio', { name: 'Document view option 1', exact: true });
  const last = page.getByRole('radio', { name: 'Document view option 8', exact: true });
  await expect.element(last).toBeChecked();
  (last.element() as HTMLInputElement).focus();
  await expect.poll(() => viewport.scrollTop).toBeGreaterThan(0);
  const change = vi.fn();
  selector.addEventListener('change', change);

  selector.querySelector('metro-radio[value="option-7"]')!.disabled = true;
  await expect.poll(() => selector.shadowRoot?.activeElement).toBe(first.element());
  const bounds = viewport.getBoundingClientRect();
  await expect.poll(() => first.element().getBoundingClientRect().top).toBeGreaterThanOrEqual(bounds.top - 1);
  expect(first.element().getBoundingClientRect().bottom).toBeLessThanOrEqual(bounds.bottom + 1);
  expect(selector.value).toBe('');
  expect(change).not.toHaveBeenCalled();

  await userEvent.keyboard('{ArrowDown}');
  const second = page.getByRole('radio', { name: 'Document view option 2', exact: true });
  await expect.element(second).toBeChecked();
  expect(selector.shadowRoot?.activeElement).toBe(second.element());
  expect(change).toHaveBeenCalledTimes(1);
});

test('BreadcrumbBar presents an ancestor link and marks its last item as the current page', async () => {
  const breadcrumbs = document.createElement('metro-breadcrumb-bar');
  breadcrumbs.label = 'Location';
  breadcrumbs.items = [
    { id: 'projects', label: 'Projects', href: '#projects' },
    { id: 'tasks', label: 'Tasks' },
  ];
  document.body.append(breadcrumbs);

  const requests = vi.fn();
  breadcrumbs.addEventListener('metro-breadcrumb', event => {
    requests(event.detail);
    event.preventDefault();
  });

  const trail = page.getByRole('navigation', { name: 'Location' });
  await expect.element(trail.getByText('Tasks', { exact: true })).toHaveAttribute('aria-current', 'page');
  const ancestor = trail.getByRole('link', { name: 'Projects' });
  await expect.element(ancestor).toHaveAttribute('href', '#projects');
  const original = location.hash;
  await userEvent.tab();
  expect(breadcrumbs.shadowRoot?.activeElement).toBe(ancestor.element());
  await userEvent.keyboard('{Enter}');
  expect(requests).toHaveBeenCalledExactlyOnceWith({ id: 'projects', href: '#projects' });
  expect(location.hash).toBe(original);
});

test('a narrow page title keeps words intact at 200% text', async () => {
  document.body.innerHTML = `
    <metro-page lang="ru" style="inline-size:256px" label="Северный маршрут">
      <metro-breadcrumb-bar label="Расположение проекта"></metro-breadcrumb-bar>
    </metro-page>`;
  const view = document.querySelector('metro-page')!;
  const trail = view.querySelector('metro-breadcrumb-bar')!;
  trail.items = [
    { id: 'projects', label: 'Проекты', href: '#projects' },
    { id: 'north', label: 'Северный маршрут' },
  ];
  const root = document.documentElement;
  const original = root.style.fontSize;
  root.style.fontSize = '200%';
  try {
    const heading = page.getByRole('heading', { name: 'Северный маршрут' });
    await expect.element(heading).toBeVisible();
    const slot = heading.element().querySelector('slot')!;
    const title = [...slot.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())!;
    const words = Array.from(title.textContent!.matchAll(/\S+/g));
    for (const word of words) {
      const range = document.createRange();
      range.setStart(title, word.index!);
      range.setEnd(title, word.index! + word[0].length);
      expect(range.getClientRects()).toHaveLength(1);
    }
    expect(view.scrollWidth).toBe(view.clientWidth);
  } finally {
    root.style.fontSize = original;
  }
});

test('NavigationView switches layout while the application controls the current route', async () => {
  const navigation = document.createElement('metro-navigation-view');
  navigation.label = 'Projects navigation';
  navigation.menuLabel = 'Sections';
  navigation.value = 'projects';
  navigation.items = [
    { id: 'projects', label: 'Projects', href: '#projects' },
    { id: 'team', label: 'Team', href: '#team' },
    { id: 'archive', label: 'Archive', href: '#archive', disabled: true },
  ];
  document.body.append(navigation);

  const requests = vi.fn();
  navigation.addEventListener('metro-navigation', event => {
    requests(event.detail);
    event.preventDefault();
  });
  const projects = page.getByRole('link', { name: 'Projects', exact: true });
  const team = page.getByRole('link', { name: 'Team' });
  const toggle = page.getByRole('button', { name: 'Sections' });
  await expect.element(projects).toHaveAttribute('aria-current', 'page');
  await expect.element(toggle).not.toBeInTheDocument();

  navigation.style.width = '350px';
  await expect.element(toggle).toBeVisible();
  await expect.element(projects).not.toBeInTheDocument();
  await toggle.click();
  await team.click();
  await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(navigation.shadowRoot?.activeElement).toBe(toggle.element());
  expect(requests).toHaveBeenCalledExactlyOnceWith({ id: 'team', href: '#team' });
  expect(navigation.value).toBe('projects');

  navigation.value = 'team';
  navigation.style.width = '100%';
  await expect.element(team).toHaveAttribute('aria-current', 'page');
  await expect.element(projects).not.toHaveAttribute('aria-current');

  (team.element() as HTMLAnchorElement).focus();
  navigation.style.width = '350px';
  await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(navigation.shadowRoot?.activeElement).toBe(team.element());
  await userEvent.keyboard('{Escape}');
  await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(navigation.shadowRoot?.activeElement).toBe(toggle.element());
});

test.each([320, 720])('NavigationView recovers link focus after a data update at %i px', async width => {
  document.body.innerHTML = `<metro-navigation-view label="Sections" value="reports" style="width:${width}px"></metro-navigation-view>`;
  const navigation = document.querySelector('metro-navigation-view')!;
  const overview = { id: 'overview', label: 'Overview', href: '#overview' };
  const reports = { id: 'reports', label: 'Reports', href: '#reports' };
  const archive = { id: 'archive', label: 'Archive', href: '#archive' };
  navigation.items = [overview, reports, archive];
  const request = vi.fn();
  navigation.addEventListener('metro-navigation', request);
  if (width === 320) await page.getByRole('button', { name: 'Menu' }).click();
  const focused = page.getByRole('link', { name: 'Overview' });
  await expect.element(focused).toBeVisible();
  (focused.element() as HTMLElement).focus();
  navigation.items = [reports, archive];
  await expect.poll(() => navigation.shadowRoot?.activeElement?.textContent?.trim()).toBe('Reports');
  navigation.items = [{ ...reports, disabled: true }, archive];
  await expect.poll(() => navigation.shadowRoot?.activeElement?.textContent?.trim()).toBe('Archive');
  expect(navigation.value).toBe('reports');
  expect(request).not.toHaveBeenCalled();
});

test('compact NavigationView scrolls to the current route within a long menu', async () => {
  document.body.innerHTML = '<metro-navigation-view value="route-17" style="inline-size:320px"></metro-navigation-view>';
  const navigation = document.querySelector('metro-navigation-view')!;
  navigation.items = Array.from({ length: 18 }, (_, index) => ({
    id: `route-${index}`, label: `Route ${index}`, href: `#route-${index}`,
  }));
  const menu = page.getByRole('button', { name: 'Menu' });
  await menu.click();
  const nav = page.getByRole('navigation', { name: 'Navigation' });
  const selected = nav.getByRole('link', { name: 'Route 17', exact: true });
  await expect.element(selected).toHaveAttribute('aria-current', 'page');
  const panel = nav.element();
  const box = panel.getBoundingClientRect();
  expect(box.height).toBeLessThanOrEqual(window.innerHeight * .6 + 1);
  expect(panel.scrollTop).toBeGreaterThan(0);
  expect(selected.element().getBoundingClientRect().bottom).toBeLessThanOrEqual(box.bottom + 1);
  expect(navigation.shadowRoot?.activeElement).toBe(menu.element());

  const first = nav.getByRole('link', { name: 'Route 0', exact: true });
  (first.element() as HTMLAnchorElement).focus();
  await expect.poll(() => first.element().getBoundingClientRect().top >= panel.getBoundingClientRect().top - 1).toBe(true);
  navigation.items = navigation.items.slice(1);
  await expect.poll(() => navigation.shadowRoot?.activeElement).toBe(selected.element());
  expect(selected.element().getBoundingClientRect().bottom).toBeLessThanOrEqual(box.bottom + 1);
});

test('keyboard activation closes a compact menu while preserving focus set by the app', async () => {
  document.body.innerHTML = `<metro-navigation-view value="projects" style="inline-size:320px">
    <h1 tabindex="-1">Team page</h1>
  </metro-navigation-view>`;
  const navigation = document.querySelector('metro-navigation-view')!;
  const heading = navigation.querySelector('h1')!;
  navigation.items = [{ id: 'projects', label: 'Projects', href: '#projects' }, { id: 'team', label: 'Team', href: '#team' }];
  navigation.addEventListener('metro-navigation', event => {
    event.preventDefault();
    navigation.value = event.detail.id;
    heading.focus();
  });
  const menu = page.getByRole('button', { name: 'Menu' });
  await menu.click();
  const team = page.getByRole('link', { name: 'Team' });
  await expect.element(team).toBeVisible();
  (team.element() as HTMLAnchorElement).focus();
  await userEvent.keyboard('{Enter}');
  await expect.element(menu).toHaveAttribute('aria-expanded', 'false');
  expect(document.activeElement).toBe(heading);
  expect(navigation.value).toBe('team');
});

test('top NavigationView keeps the same links across layout changes and requests app-owned Back', async () => {
  document.body.innerHTML = `
    <metro-navigation-view placement="top" label="Main sections" show-back back-label="Previous page"
      data-metro-theme="dark" value="reports" style="width:720px;--metro-font:Arial,sans-serif">
      <button type="button" style="margin:1rem">Page content</button>
    </metro-navigation-view>
  `;
  const navigation = document.querySelector('metro-navigation-view')!;
  navigation.items = [
    { id: 'overview', label: 'Overview', href: '#overview' },
    { id: 'reports', label: 'Reports', href: '#reports' },
    { id: 'settings', label: 'Settings', href: '#settings' },
  ];
  const overview = page.getByRole('link', { name: 'Overview' });
  const reports = page.getByRole('link', { name: 'Reports' });
  const back = page.getByRole('button', { name: 'Previous page' });
  const toggle = page.getByRole('button', { name: 'Menu' });
  const request = vi.fn();
  navigation.addEventListener('metro-navigation-back', request);
  await expect.element(reports).toHaveAttribute('aria-current', 'page');
  await expect.element(back).toBeDisabled();
  await expect.element(toggle).not.toBeInTheDocument();

  const selected = reports.element() as HTMLAnchorElement;
  const first = overview.element().getBoundingClientRect();
  const second = selected.getBoundingClientRect();
  expect(first.top).toBe(second.top);
  expect(first.left).toBeLessThan(second.left);
  expect(navigation.shadowRoot!.querySelector('[part="content"]')!.getBoundingClientRect().top).toBeGreaterThanOrEqual(second.bottom);
  if (server.browser === 'chromium') {
    await page.getByRole('button', { name: 'Page content' }).hover();
    await expect.element(page.getByRole('navigation', { name: 'Main sections' })).toMatchScreenshot('navigation-top');
  }

  navigation.placement = 'side';
  await navigation.updateComplete;
  expect(overview.element().getBoundingClientRect().top).toBeLessThan(selected.getBoundingClientRect().top);
  navigation.placement = 'top';
  await navigation.updateComplete;
  selected.focus();
  navigation.style.width = '365px';
  await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(navigation.shadowRoot?.activeElement).toBe(selected);
  expect(navigation.closeMenu()).toBe(true);
  await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
  navigation.style.width = '720px';
  await expect.poll(() => navigation.shadowRoot?.activeElement).toBe(selected);
  expect(reports.element()).toBe(selected);

  navigation.canGoBack = true;
  await back.click();
  expect(request).toHaveBeenCalledOnce();
  expect(navigation.value).toBe('reports');
  navigation.canGoBack = false;
  await expect.element(back).toBeDisabled();
  expect(navigation.shadowRoot?.activeElement).toBe(selected);
});

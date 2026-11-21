# Relict Metro UI

Relict Metro UI is a library of web components built with Lit and TypeScript. Its visual profile follows **Windows Phone 8 Silverlight**. Version 0.2.0 includes navigation, collections, tiles, forms, commands, adaptive panes, media, and Toolkit effects. Components from later versions of Windows also use Phone 8 geometry and theme resources. Use standard DOM markup, properties, and events.

[Mail](examples/mail/index.html) · [Start screen](examples/start/index.html) · [Mail settings](examples/controls/index.html) · [Workspace](examples/workspace/index.html) · [Recording archive](examples/media/index.html) · [Component API reference](docs/api.md) · [Design documentation](#design-documentation)

The catalog has all 119 tags, with an individual import and an example for each tag. The component tag button opens an alphabetical LongListSelector with short names such as `text-block`. The jump button scrolls to the selected letter. After the build, run `npm run serve`. Open `http://127.0.0.1:4173/examples/catalog/`. [Component catalogue](examples/catalog/index.html) · [Coverage and Host Capabilities](docs/implementation.md)

## Build and test

### Documentation website

[Read the English documentation](https://kai-shoo.github.io/relict-metro-ui/). The Astro site uses `relict-metro-ui@0.2.0` from npm. It includes live components, search, and client-side navigation.

```sh
npm --prefix website ci
npm run docs:dev
```

Open `http://localhost:4321/relict-metro-ui/`. Run `npm run docs:build` to create the static site in `website/dist/`. [Development and deployment](website/README.md)

### Library

The component audit maps each tag to its example and browser tests. [Component verification map](docs/component-audit.md)

Use Node.js 22.12, 24, or a newer version that Vitest supports.

```sh
npm ci
npm run typecheck
npm run build
npx playwright install chromium
npm test
npm run test:package
npm pack
```

`npm test` builds the library and runs Vitest Browser Mode in Chromium. To run just the browser tests after a build, run `npm run test:browser`. To update the reference screenshots after a visual change, run `npm run test:browser -- --update`. On Linux, the tests use the Chromium reference screenshots for Linux.

Set `METRO_CHROMIUM_PATH` to use a local Chromium executable for the browser and package tests. `npm run test:package` builds a temporary npm archive and installs it in a separate project. It tests consumers in HTML, React 19 with TypeScript, and Vue 3. It also builds all 119 individual imports and loads each one in a separate Custom Elements registry. Access to the npm registry is necessary to install the test dependencies.

`npm pack` creates `relict-metro-ui-0.2.0.tgz`. The archive contains the browser module, ESM modules with TypeScript declarations, the API reference, the design documentation, and the example source files. The library uses a system font stack.

### Release candidate

Push a version tag that matches `package.json`, for example `v0.2.0`. The `v` prefix is optional. A prerelease tag such as `v0.3.0-rc.1` requires the same prerelease version in `package.json`.

Open the **Release** run for the tag in GitHub Actions. After the browser and package installation checks pass, download **release-candidate** from the run's **Artifacts** section. It contains the one `.tgz` that the workflow installed and tested. The workflow does not require npm credentials and does not publish to npm.

## Install and use

### Plain HTML

Get `dist/metro-ui.js` from the build output or the unpacked npm archive. Put the module next to your HTML file. Serve the page over HTTP. The module includes Lit and registers all library tags.

```html
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<script type="module" src="./metro-ui.js"></script>

<metro-pivot id="folders" label="Folders" value="inbox">
  <metro-pivot-item value="inbox" label="Inbox">
    <p>Inbox messages</p>
  </metro-pivot-item>
  <metro-pivot-item value="archive" label="Archive">
    <p>Archived messages</p>
  </metro-pivot-item>
</metro-pivot>

<script type="module">
  await customElements.whenDefined('metro-pivot');
  const pivot = document.querySelector('#folders');
  pivot.addEventListener('metro-change', (event) => {
    console.log(event.detail.value);
  });
</script>
</html>
```

### Application with a bundler

```sh
npm install relict-metro-ui
```

Before publication, install the archive that `npm pack` creates: `npm install ./relict-metro-ui-0.2.0.tgz`.

Add the same Pivot markup to your application. The import registers Pivot and its panels. Use separate imports for CommandBar and Tile if you use those components.

```ts
import 'relict-metro-ui/pivot';
import type { MetroPivot } from 'relict-metro-ui/pivot';

const pivot = document.querySelector<MetroPivot>('#folders')!;
pivot.addEventListener('metro-change', ({ detail }) => console.log(detail.value));
pivot.value = 'archive';
```

Each tag has its own import. For example, import `relict-metro-ui/checkbox` to register `metro-checkbox`. The root import registers all elements. `relict-metro-ui/browser` points to the standalone browser module. TypeScript exposes element and event types through the standard DOM API. In a component framework, use a reference to the DOM element to set properties and attach listeners with `addEventListener`.

## Public API

| Element | Attributes and properties | Markup and events |
| --- | --- | --- |
| `metro-pivot` | `value` and `label` are strings. `label` sets the accessible name of the tab list. The default is Sections. | Use `metro-pivot-item` as direct children. `metro-change` with `detail.value` |
| `metro-pivot-item` | `value` - stable empty string, `label` - visible name, `disabled` - Boolean attribute | Default slot for panel content. `label` is displayed without `value` |
| `metro-command-bar` | `commands` is a DOM property with an array of commands. `label` and `more-label` (`moreLabel` in JS) serve as accessible names. `open` is a Boolean attribute and property. | `metro-command` with `detail.id`. Ellipsis opens labels and list of additional commands |
| `metro-tile` | `href`, `target`, `rel`, `size` (`small`, `medium`, `wide`), `label` | The default slot for the content. With `href`, the tile uses a conventional link, including Ctrl/Cmd+Click and `target="_blank"`. `label` is a visible label and an accessible name. |

`metro-change` and `metro-command` bubble and cross the Shadow DOM boundary. See the [component-book](docs/api.md) for the attributes, slots, and events of form controls, overlays, and indicators.

### Panel selection and focus

- Click a different tab, activate it with the keyboard, or complete a horizontal swipe to change `value`. Pivot emits one `metro-change` event. If you activate the current tab again, the selection does not change.
- Set `pivot.value` or change its attribute to update the selection without an event. Pivot selects the first available panel in DOM order if `value` is unknown, the panel is disabled, or the selected panel is removed. If no panel is available, `value` becomes an empty string. For duplicate values, Pivot uses the first panel.
- The arrow keys move focus between tabs and wrap at the ends. Home and End move focus to the first and last tabs. Enter and Space activate the focused tab. Each Pivot has its own focus and selection. `Tab` moves to the active panel.
- If the tab headings are wider than the viewport, you can select the visible part of the adjacent heading. The tab row scrolls to the selected tab and shows part of the preceding tab, with wraparound.
- On a touch screen, swipe horizontally to move to an adjacent panel. Swipe vertically to scroll its content. A canceled swipe keeps the current panel. Add `data-metro-no-swipe` to a nested area to exclude it from the Pivot swipe handler.
- Keep the routes, list position, and item key in the application so that it can restore them when the user returns. The mail example manages this data along with the selected folder and browser history.

### Commands and tiles

Assign a new array to `commands` when the set of commands changes. Give each action a unique `id` and a readable `label`. Use `iconName` for a monochrome library icon, or `icon` for a text symbol. Commands also support `disabled`, `placement`, and `priority`. The bar shows up to four actions in the primary row, depending on the container width. Select the ellipsis to show the other actions. [Icons](docs/api.md#icons) · [Declarative teams](docs/api.md#command-bar-and-overlays)

```js
const bar = document.querySelector('metro-command-bar');
bar.commands = [
  { id: 'new', label: 'Compose', iconName: 'add' },
  { id: 'mark-read', label: 'Mark as read', placement: 'secondary' },
];
bar.addEventListener('metro-command', ({ detail }) => console.log(detail.id));
```

When the command bar is open, use Up, Down, Home, or End to move focus between available actions. Escape closes the bar and returns focus to the ellipsis. If you select an overflow command, the bar returns focus to the ellipsis before it sends the action to the application. The bar closes when focus moves outside it.

A linked tile can contain text, an image, or a custom decorative symbol. If nested elements have their own actions, use a tile without `href` or put the elements in a separate part of the page.

### Theme and CSS parts

By default, components use the system light or dark theme with the Cobalt accent. To set the theme on one element, use `data-metro-theme="light"` or `"dark"`. To set the theme for a group of components, set the inherited `--metro-color-scheme` property. This example sets the dark theme and a different accent:

```css
.mail {
  --metro-color-scheme: dark;
  --metro-accent: #b61861;
  --metro-on-accent: #fff;
}
.mail metro-pivot::part(tab) {
  font-weight: 300;
}
```

| The Domain | CSS custom properties |
| --- | --- |
| Colour | `--metro-bg`, `--metro-fg`, `--metro-muted`, `--metro-disabled`, `--metro-chrome`, `--metro-border`, `--metro-accent`, `--metro-accent-text`, `--metro-on-accent`, `--metro-focus` |
| Font, indentation and movement | `--metro-font`, `--metro-space`, `--metro-motion` |
| Tile. | `--metro-tile-bg`, `--metro-tile-fg`, `--metro-tile-width`, `--metro-tile-aspect` |

| Element | Open names for `::part()` |
| --- | --- |
| Pivot | `tablist`, `tab`, `viewport`, `panel` |
| CommandBar | `bar`, `primary`, `command`, `icon`, `overflow-toggle`, `overflow` |
| Tile | `surface`, `content`, `label` |

The visual profile uses the heading proportions, accent colors, square tile edges, and circular command buttons of Windows Phone 8 Silverlight. Pivot reduces the heading size in a narrow container. The light theme uses a more readable secondary tab style. With `prefers-reduced-motion`, Pivot changes panels without a transition. Buttons still give visual feedback. [Fonts and themes](docs/foundations.md) · [Pivot geometry](docs/components.md#title-geometry-and-navigation) · [Application Bar](docs/components.md#application-bar-in-phone-8-silverlight)

## Examples you can copy

Run `npm run build`, then `npm run serve`. Open `http://127.0.0.1:4173/`. The Start screen links tiles to mail routes. In the mail example, you can change folders, run folder commands, open a message, and return to the previous list position and focus. In a short landscape window, the commands appear at the side.

Open `http://127.0.0.1:4173/examples/controls/` to change mail settings, save the form, and open Help. Use the menu and dialog to restore the original values.

In the workspace, edit a notebook and drop its tab outside the tab row. Continue the session in a separate window from the same site. Drop the tab back in the original row to keep the draft, restore focus, and insert the tab at the marker. Buttons next to the tab row also open and return the tab. [Workspace](examples/workspace/index.html)

The recording archive at `http://127.0.0.1:4173/examples/media/` uses one player for the queue and notifications. When you change panels, the app keeps the position. When a toast closes, the message stays in the log. You can zoom in on the diagram. The example generates its audio and diagram locally.

In the note editor, Ctrl+S and the menu item run the same command. Back closes the category picker first, then exits selection mode. The app also checks for unsaved text. [Editor](examples/editor/index.html)

The camera example shows a viewfinder, a preview, and a confirmation step. Capture a photo directly or select a file from your device. The app saves the photo in IndexedDB. You can open it again from a link, rotate it, and save a separate PNG. [Camera](examples/camera/index.html)

The collection examples let you select records in different groups and use one Move or Copy operation for all selected records. Use the mouse, the keyboard, or the second Cross-slide threshold to select the insertion point. [Transfer of records](examples/collections/index.html) · [Compilation](examples/collections/selection.html)

The drafts form restores its fields and focus. It queues draft versions and uses the same key when it retries an HTTP submission. After the first visit, the form opens offline. The demo server keeps receipts until its process restarts. [Drafts](examples/drafts/index.html) · [Contract of dispatch](examples/drafts/README.md)

The gallery uses the same collection for the phone Pivot and the wide navigation menu. A shared key links the card to the enlarged photo during the transition. The photo stays open at the same zoom level when the width changes. Back returns to the card. [Photo Photo](examples/photos/index.html)

From the Hub overview, open the map, zoom in, and select a location. Use Back to return through the map to the overview. The geolocation button requests permission separately. [Map.](examples/map/index.html)

The launch screen accepts a direct link or a saved route. While a record loads, Back returns to the list. The splash screen does not appear in the history. [Launch.](examples/launch/index.html)

The contact editor uses the visible viewport size and keeps the text when you go Back. The save command remains available when the on-screen keyboard opens. [keyboard](examples/keyboard/index.html)

After the user grants permission, the log sends a system notification through a service worker. The same link opens the event in an existing tab or on a cold start. On supported devices, the log updates the app badge. [Notifications](examples/notifications/index.html)

The top navigation shows the current route. It keeps links available in compact mode and restores focus after Back. [Projects](examples/navigation/index.html)

The radio archive keeps the destination if the demo sign-in fails. Search and recent records use the same player. Back restores the filter and the list position. [Radio archive](examples/music/index.html)

The clipboard commands in the two-document example check the document version and selection. The field sheets store notes and ink strokes with their page keys. [Exchange buffer](examples/clipboard/index.html) · [Annotations](examples/annotations/index.html)

The import example accepts files from a local picker. After installation, the PWA can also receive data through its manifest and service worker. Review the content and select a destination before you save. [Import](examples/imports/index.html)

In the visit form, Back closes the picker. The form continues navigation after it saves. In the voice directory, speech, text input, and the visible command open the same record. [Form](examples/form/) · [Speech](examples/speech/)

Phone Hub uses the commands of the first visible section. When the app refreshes the list, it keeps the anchor record. If the result is empty, it returns focus to the filter. [Phone Hub panels](examples/phone-hub/) · [Desktop Hub](examples/phone-hub/desktop.html) · [Update of the list](examples/refresh/) · [Keeping the group offline](examples/offline/)

The appearance settings apply the theme immediately. The slider and the number field change the brightness of the same preview. You can save the brightness or restore the previous value. [Processing](examples/appearance/)

Copy the example directory with its HTML, CSS, and JavaScript. Replace the path to `metro-ui.js` with the module path in your project. The example source contains the data, commands, and routes. If you copy more than one screen, keep the relative paths or update the links. The catalog shows an HTML snippet for use with `metro-ui.js`. To reuse a complete application, open its full example and copy its files and assets.

## Compatibility

Vitest Browser Mode supports Chromium, Firefox, and WebKit through Playwright. Tests use Chromium CDP for touch gestures and IME composition. Run tests that require CDP or Chromium reference screenshots in Chromium. To use a different engine, set `METRO_BROWSER=firefox` or `METRO_BROWSER=webkit`.

```sh
npx playwright install firefox
METRO_BROWSER=firefox npm run test:browser
```

Use a modern browser with Custom Elements, Shadow DOM with manual slot assignment, Pointer Events, `light-dark()`, and CSS container units. Forms use `ElementInternals`. Dialogs and menus use the native `dialog` and Popover APIs. The package runs in the browser.

Camera capture uses `getUserMedia`. It needs a secure context and user permission. Browser notifications need permission and an active service worker. System reminders, tile pinning, and the lock screen need host support. Tests use simulated touch in Chromium and a test video stream for camera capture. Browser tests ran on Linux with Chromium 155, Firefox 159, and Playwright WebKit 27.2. Form accessibility checks used Orca and AT-SPI. Mobile Safari and Chrome on physical devices, the system file sharing menu, Windows Shell, and a physical pen still need integration tests.

## Design documentation

The historical references below link to the repository's `docs/` directory.

The design documentation starts with Windows Phone 7–8.1: typography, large horizontal surfaces, direct touch input, system Back, and live tiles. Windows 8/8.1, early UWP, and modern WinUI add patterns for navigation, adaptive layout, and interaction.

| Section | What's in it? |
| --- | --- |
| [Principles and Visual Grammar](docs/foundations.md) | Text hierarchy, grid, light and dark themes, accent, movement, input, availability and localization |
| [Components and their contracts](docs/components.md) | Application and shell surfaces, states, dependencies, matching with WinUI and [collaboration map](docs/components.md#component-interaction-map) |
| [Scripts and mechanics](docs/flows.md) | 41 step-by-step scenarios with checks, status owners, Back order and recovery rules |
| [Windows Phone Dev Center Archive](docs/windows-phone-archive.md) | 47 reviewed pages for Phone 8 and 7.1 Silverlight, 41 entries from the Phone 8.1 table of contents, the Windows Runtime UX index, and original templates |
| [UX Windows Runtime Index in April 2014](docs/winrt-ux-index.md) | 126 links from the MSDN directory, source addresses and related PDF sections |
| [Catalogue of primary sources](docs/sources.md) | 64 WinUI Catalogue Positions, 14 Windows Design Sections, Microsoft Generation Guides, and Archival Status |

## Visual specifications

| What's happening | Where to look at sizes, conditions and resources |
| --- | --- |
| Color and typography | [Segoe WP Styles](docs/foundations.md#silverlight-sdk-text-sizes-and-styles) · [Light and Dark from SDK 8.0](docs/foundations.md#light-and-dark-color-roles-in-sdk-80) · [SDK dictionaries 7.0 and 7.1](docs/foundations.md#color-roles-in-sdk-70-and-71) · [Palette of accents](docs/foundations.md#phone-75-and-8-accent-palette) |
| Standard Silverlight Controls | The [Sizes, brushes and states of 19 SDK 8.0 styles, including base and derivatives](docs/silverlight-controls.md) is compared to the SDK 7.0 and 7.1. |
| Controls Phone 8.1 Store apps | [XAML and WinJS geometry](docs/store-81-visual-specs.md) · [Four Theme Colors and XAML Text Sizes](docs/foundations.md#xaml-themes-and-typography-in-phone-81-store-apps) |
| Navigation and lists | [SDK numbers for Panorama, Pivot, LongListSelector and JumpList](docs/components.md#title-geometry-and-navigation) |
| Toolkit extensions | [Pickers, switches, ContextMenu, HubTile and others](docs/toolkit-visual-specs.md) |
| Icons, App Bar and Start Resources | [Names and geometry of Microsoft icons](docs/metro-icons.md) · [Sizes of exported graphics](docs/foundations.md#phone-8-export-asset-sizes) |

## Platform generations

| Generation. | Role in the design doc |
| --- | --- |
| Windows Phone 7 / 7.1 | Original Metro, PhoneApplicationFrame/Page, Panorama, Pivot, Application Bar, Start and tiles, hardware buttons |
| Windows Phone 8 | Continuation of Silverlight UX, LongListSelector, new tiles sizes and more lock screen features |
| Windows Phone 8.1 | The Silverlight branch and a separate Windows Runtime branch for Phone Store apps. Documentation II describes the Phone Hub and Pivot, shared with Windows 8.1 model part of the controls and new system surfaces |
| Windows 8 / 8.1 Store apps | Related Desktop and Tablet Branch. Hub → Section → Details, Charms, Contracts and Semantic Zoom refer to the respective environment |
| Windows 10/UWP, including Mobile | A transition layer. UWP added Phone Pivot and AutoSuggestBox for different device families. Windows 10 Mobile has a separate Continuum guide. |
| WinUI 2 / WinUI 3 and Fluent | Modern collection, command, navigation, focus and adaptation mechanics. WinUI 2 refers to UWP. WinUI 3 comes with the Windows App SDK for desktop Windows applications |

[Windows Phone and Windows 8: Comparison](docs/sources.md#windows-phone-8-and-windows-8) · [Windows Phone 8.1](docs/sources.md#windows-81-and-windows-phone-81) · [UWP and Windows 10 Mobile](docs/sources.md#windows-10-uwp-and-mobile) · [WinUI and Fluent](docs/sources.md#winui-and-fluent)

## Use the design documentation

First, select the screen model. **Hub/Panorama** shows parts of a wide overview. **Pivot** changes the view within the same task. **List/details** opens a page for the selected item. Phone 8 also describes a top-level menu, a set of independent panels, and paging between similar pages. Decide where commands belong, what Back does, and which state to restore. Apply the visual profile tokens. Test the same flow with touch, keyboard, mouse, and assistive technology. [Windows Phone Structure Models](docs/flows.md#windows-phone-app-structure-models) · [Links in the source samples of Phone 8.1](docs/windows-phone-archive.md#sample-source-analysis)

Historical guidance specifies its platform generation and source. The **Library contract** sections and flows describe project decisions. They cover platforms without a hardware Back button, reduced motion, and state restoration with stable identifiers.

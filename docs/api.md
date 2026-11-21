# Component API reference

In the catalog, select a tag to see its individual import and open an example with markup. [Catalog of 119 components](../examples/catalog/)

Use HTML attributes for simple values. Use DOM properties for command arrays, node references, and other objects. Import `relict-metro-ui/<name>` to register a component. Replace `<name>` with the tag name without the `metro-` prefix. The root module and the standalone browser module register all components.

## Buttons and forms

| Tag | Attributes and properties | Slots and parts |
| --- | --- | --- |
| `metro-button` | `type` (`button`, `submit`, `reset`), `name`, `value`, `disabled`, `form`, `formnovalidate` (`formNoValidate`), `label` | Text in the default slot. Part `button` |
| `metro-toggle-button` | `checked`, `disabled`, `label`. A user toggle emits `input` and `change`. The accessible name does not change with the state. | Text in the default slot. Part: `button`. |
| `metro-repeat-button` | `disabled`, `label`, `delay` (400 ms), `interval` (80 ms). Hold the mouse button, Space, or Enter to repeat `metro-activate` with `detail.repeat = true`. A short activation emits one event with `repeat = false`. | Text in the default slot. Part: `button`. |
| `metro-hyperlink` | `href`, `target`, `rel`, `label`. Supports normal link behavior, including opening in a new tab | Default slot, part of `link` |
| `metro-checkbox` | `name`, `value`, `label`, `checked`, `indeterminate`, `required`, `disabled`, `form` | label in the default slot: Parts `control`, `input`, `indicator`, `label` |
| `metro-toggle-switch` | `name`, `value`, `label`, `checked`, `on-label`, `off-label`, `required`, `disabled`, `form` | label in the default slot: Parts `control`, `input`, `track`, `thumb`, `label`, `state` |
| `metro-radio-group` | `name`, `value`, `label`, `required`, `disabled`, `form`. The arrow keys change the selection. | Direct `metro-radio` children. Use the `label` slot for the group label. Parts: `group`, `legend`, `option`, `input`, `indicator`, `label`. |
| `metro-radio` | `value` with stable key, `label`, `disabled` | The label is taken from `label`, textual content, or `value`. |
| `metro-combo-box` | `name`, `value`, `label`, `placeholder`, `empty-label`, `required`, `disabled`, `form` | Direct `metro-option` children and a `label` slot. Parts: `label`, `control`, `select`, `indicator`. The browser renders the menu. |
| `metro-option` | `value` with stable key, `label`, `disabled` | The label is taken from `label`, textual content, or `value`. |
| `metro-text-box` | `name`, `value`, `label`, `description`, `placeholder`, `required`, `readonly`, `disabled`, `form`, `autocomplete`, `inputmode`, `minlength`, `maxlength`, `pattern`. `type` accepts `text`, `search`, `email`, `url`, or `tel`. `multiline` and `rows` include multi-line input | `label` and `description` slots Parts `label`, `control`, `input`, `description` |
| `metro-password-box` | A string field with TextBox attributes for a single line. `reveal` includes displaying the password for the time the button is held, `reveal-label` sets its accessible name. When you hide the focused button, the password is masked, the focus returns to the available field. | Slots and parts of the text field, as well as part of `reveal` |

The `checked` attribute sets the initial state. The `checked` property changes the current state. `defaultChecked` sets the state for a form reset. When a checkbox or switch is checked, it submits its `value`, which defaults to `on`. For a radio group or ComboBox, use the `value` attribute, the `value` property, and `defaultValue` for the same purposes. If there is no initial value or `placeholder`, ComboBox selects the first available option. If the key is unknown or the option is removed or unavailable, the selection is empty. To read the form data, use `FormData`.

A user action in a checkbox, switch, radio group, or ComboBox emits `input` and `change`. Both events bubble and cross the Shadow DOM boundary. If you set the current state in JavaScript, you can read the new value immediately. The controls emit those events only for user actions.

If the app disables or removes the focused item in RadioGroup or SelectorBar, focus moves to an available item, if there is one. The browser scrolls it into view.

`metro-toggle-switch` commits a drag when the user releases the pointer. Setting `checked`, resetting the form, or disabling the control cancels the current gesture.

For text fields, the `value` attribute and the `defaultValue` property set the initial text. The `value` property sets the current text. The browser handles editing, selection, undo, and IME input. The `beforeinput`, `input`, and `change` events notify the app about user input. Use `autocomplete="new-password"` for a field that creates a password. Do not write a password entered by the user to an HTML attribute.

`metro-rich-edit-box` supports `name`, `label` or the `label` slot, `value`, `defaultValue`, `required`, `readonly`, and `disabled`. The editor submits plain text with line breaks. To keep the formatting, use the `runs` DOM property with an array of `{ text, bold?, italic?, underline? }` objects. Call `format('bold')`, `format('italic')`, `format('underline')`, or `insertText(text)`. The editor inserts clipboard text and uses the browser's edit history. Parts: `control`, `label`, `toolbar`, `format`, `editor`.

The context menu contains Copy, Cut, and Paste. Open it with its button, a right click, or Shift+F10. Escape returns focus to the toolbar button or to the editor with its previous selection. `clipboardAction('copy' | 'cut' | 'paste')` runs the same command and returns `Promise<boolean>`. By default, the editor uses the browser Clipboard API in a secure context. The `clipboard` DOM property accepts `{ readText(signal)?, writeText(text, signal)? }`. Set it to `null` to turn off asynchronous access. Native clipboard events still work. Use `document-key` or `documentKey` to link the editor to a record. A change to the document, text, or selection cancels a pending command. A key change starts a separate undo history. `metro-clipboard-result` reports `action` and `status` without the clipboard content. Use `clipboard-label`, `copy-label`, `cut-label`, and `paste-label` to localize the menu. To style it, use the `clipboard-trigger`, `clipboard-menu`, and `clipboard-command` parts. [Two-document example](../examples/clipboard/index.html)

```html
<form id="preferences">
  <metro-checkbox name="digest" checked>Weekly digest</metro-checkbox>
  <metro-button type="submit">Save</metro-button>
</form>
```

```js
document.querySelector('#preferences').addEventListener('submit', (event) => {
  event.preventDefault();
  const preferences = new FormData(event.currentTarget);
  console.log(preferences.has('digest'));
});
```

On the host, use `aria-describedby` to associate external hint or error text with TextBox, PasswordBox, SpeechTextBox, ListPicker, or RecurringDaysPicker. The component reads the references from the host's tree and combines their text with its own accessible description. If the text changes or the element is replaced, the description updates.

## Numbers and ratings

| Tag | Attributes and properties | Slots and parts |
| --- | --- | --- |
| `metro-slider` | `min`, `max`, `step` (default 0–10, step 1, `step="any"`), `orientation` (`horizontal` or `vertical`), `show-bounds`, `value-text` | `label` slot. Parts of `label`, `control`, `input`, `track`, `fill`, `thumb`, `bounds` |
| `metro-number-box` | `min`, `max`, `step` (1 or `any`), `required`, `readonly`, `placeholder`, `spin-buttons`, `increment-label`, `decrement-label`. Methods `stepUp()` and `stepDown()`. `value` equals `null` for empty field, `draft` returns editable string | `label` slot. Parts: `label`, `control`, `input`, `increment`, `decrement`, `error` |
| `metro-rating` | `max` stars (default 5), `step` (1 or 0.5), `required`, `readonly`, `show-value`, `value-text`, `unrated-label`. A value of 0 means no rating. | `label` slot. Parts: `label`, `control`, `input`, `stars`, `star`, `fill`, `value`. |

All three controls accept `name`, `label`, `disabled`, and `value`. The `value` property contains the current value. Use `defaultValue` to read or change the value for a form reset. Moving Slider or Rating emits `input`. When the user commits the value, the control emits `change`. In NumberBox, press Enter or move focus out of the field to commit the number. Press Escape to cancel the edit. A successful change emits `input` and `change`. Use a period or a comma as the decimal separator. Built-in NumberBox validation messages use English.

Setting `value` or resetting the form stops the current Slider or Rating gesture. If the app disables the control during a gesture, the control restores its value from before the gesture. NumberBox handles Escape only when there is a draft.

For Slider available `--metro-slider-thickness`, `--metro-slider-track`, `--metro-slider-fill`, `--metro-slider-thumb` and `--metro-slider-length`. In NumberBox, the background is adjusted through `--metro-number-box-background`, in Rating, the color of the stars is adjusted through `--metro-rating-empty` and `--metro-rating-fill`.

```html
<metro-slider name="volume" label="Volume" max="100" value="40" show-bounds></metro-slider>
<metro-number-box name="limit" label="Limit" min="1" max="30" value="10" spin-buttons></metro-number-box>
<metro-rating name="rating" label="Rating" max="5" step="0.5"></metro-rating>
```

## Date and time selection

`metro-date-picker` and `metro-time-picker` take `name`, `value`, `min`, `max`, `step`, `required`, `readonly`, `disabled`, `form`, and `autocomplete`. The name and explanation are given by the attributes or slots `label` and `description`. For the theme, parts of `control`, `input`, `label`, `description` and tokens `--metro-picker-height`, `--metro-picker-border`, `--metro-picker-bg`, `--metro-picker-fg` are available.

Form and JS receive strings of the format `YYYY-MM-DD` and `HH:mm` (with seconds, if they are in the value). An empty value is an empty string. `defaultValue` is used for resetting. The assignment of `value` takes place without an event. User input sends `input` and `change`. Date step is measured in days, time in seconds. In `presentation="native"` default mode, the browser is responsible for display, locale, and pop-up picker. Where supported, the `showPicker()` method can be invoked from a user action handler.

```html
<metro-date-picker name="day" label="Meeting date" required></metro-date-picker>
<metro-time-picker name="time" label="Meeting time" value="13:45" step="900"></metro-time-picker>
```

With `presentation="phone"`, the field opens a phone dialog with scrollable columns. The dialog opens at the start and focuses the first column. In a short window, Tab scrolls the dialog to show the next column or action. The dialog holds the selection as a draft. Confirmation applies a valid selection. If the value changes, the control emits one `input` event and one `change` event. Escape, the cancel button, and `closePicker()` cancel the selection. Use `showPicker()` to open the dialog. Read `pickerOpen` to check its state. Set `locale`, `dialog-label`, `apply-label`, `cancel-label`, and `placeholder` as necessary. Set `pickerLabels` to label the columns, for example `{ day: 'Day', month: 'Month', year: 'Year' }`. To style the picker, use the `trigger`, `picker-surface`, `column`, `wheel`, `selected-cell`, `apply`, and `cancel` parts.

```html
<metro-date-picker presentation="phone" name="day" locale="en-GB" label="Meeting date"
  value="2026-11-19" min="2026-01-01" max="2027-12-31"
  dialog-label="Select a date" apply-label="Done" cancel-label="Cancel"></metro-date-picker>
```

`metro-calendar-view` shows a Gregorian date grid. Use ISO date strings for `value`, `min`, `max`, and the `disabledDates` DOM property. Set `locale` and `first-day-of-week` to control the display. Days are numbered from 0 to 6, with Sunday as 0. `showDate(date)` changes the visible month without changing the selection. If a day had focus, focus follows the new date. Focus outside the calendar does not change. The arrow keys move focus between days. PageUp and PageDown move focus between months. In a narrow container, the grid can scroll horizontally to keep the focused day visible. A selection emits `input` and `change`.

`metro-calendar-date-picker` shows the same grid in a dialog. In a short window, the dialog scrolls vertically to keep the focused day visible. At window heights of 360 CSS pixels or more, the month heading stays above the grid as the user moves between days. In shorter windows, the heading scrolls with the grid. In addition to the calendar attributes, the picker accepts `name`, `required`, `disabled`, `label` or the `label` slot, and `placeholder`. `value` shows the confirmed date. `defaultValue` sets the reset value. Setting `value` while the dialog is open replaces the draft. `showPicker()` opens the calendar. Escape or `close()` cancels the draft. To localize labels, set `apply-label`, `cancel-label`, `clear-label`, `previous-label`, `next-label`, and `dialog-label`. Parts: `trigger`, `value`, `dialog`, `calendar-grid`, `calendar-day`, `calendar-selected`, `apply`, `cancel`, `clear`.

```html
<metro-calendar-date-picker name="deadline" label="Due date" locale="en-GB"
  min="2026-01-01" max="2026-12-31" value="2026-11-19" required
  previous-label="Previous month" next-label="Next month"
  dialog-label="Select a date" apply-label="Apply" cancel-label="Cancel">
</metro-calendar-date-picker>
```

## List selection and recurring days

`metro-list-picker` receives direct children of `metro-option`. The short list opens next to the field. For a long list and `full-screen`, dialog is used. In `multiple` mode, the confirmation applies the entire draft, and `selectedValues` returns the array of keys. The initial multiple selection can be set by the `selected` attribute on the variants. If an application assigns `value` or `selectedValues` to an open list, the new choice immediately replaces the draft.

`metro-recurring-days-picker` takes `value="mon wed fri"` or the `selectedDays` DOM property. `locale` and `first-day-of-week` change the order of days. Confirmed keys keep the order Monday-Sunday. Multiple selections are sent by single values under a single name in `FormData`.

Both components have available `name`, `required`, `disabled`, `label` or slot `label`, `placeholder`, `value`, `defaultValue`, `showPicker()` and `close()`. Only the user confirmation calls `input` and `change`. Parts are available through `label`, `trigger`, `value`, `list`, `option`, `status`, `dialog`, `actions`, `apply` and `cancel`.

```html
<metro-list-picker name="folder" label="Folder" value="inbox">
  <metro-option value="inbox">Inbox</metro-option>
  <metro-option value="archive">Archive</metro-option>
</metro-list-picker>
<metro-recurring-days-picker name="days" label="Repeat" locale="en-GB" value="mon wed fri">
</metro-recurring-days-picker>
```

## Color

`metro-color-picker` takes `value` in HEX format and saves it as `#rrggbb`. In the palette, you can select a sample, enter HEX or edit the channels R, G, B. The DOM property of `palette` is set by the `{ value, label }` array. Changes become the value of the form after confirmation. Escape cancels the draft, and `defaultValue` sets the original color for the reset. The `name`, `required`, `disabled` and `label` slot or attributes work like other pickers. Parts are available through `trigger`, `value`, `sample`, `preview`, `palette`, `swatch`, `hex`, `channel` and `actions`.

```html
<metro-color-picker name="accent" value="#0050ef" label="Accent"
  dialog-label="Select a color" apply-label="Apply" cancel-label="Cancel">
</metro-color-picker>
```

## Search suggestions

`metro-auto-suggest-box` accepts `value`, `label` (or the `label` slot), `placeholder`, and `disabled`. User input emits `metro-query` with `detail.query` and `detail.queryId`. Pass results to `setSuggestions(queryId, items, options?)`. This method returns `false` if the request ID is out of date. In `options`, you can set `status` (`ready`, `loading`, or `error`) and `message`.

Use the arrow keys to highlight available suggestions. Press Enter to commit the selection or the text. `metro-submit` contains `detail.query`. If the user selects a suggestion, it also contains `detail.item`. Escape and `close()` close the list. Call `requestSuggestions()` to request suggestions for a `value` that you set in code.

```html
<metro-auto-suggest-box id="search" label="Search folders" clear-label="Clear"></metro-auto-suggest-box>
```

```js
const search = document.querySelector('#search');
const folders = [{ id: 'archive', label: 'Archive' }, { id: 'drafts', label: 'Drafts' }];
search.addEventListener('metro-query', ({ detail: { query, queryId } }) => {
  const items = folders.filter(({ label }) => label.toLowerCase().includes(query.toLowerCase()));
  search.setSuggestions(queryId, items);
});
```

Use `suggestions-label`, `clear-label`, `loading-label`, `empty-label`, and `error-label` to localize suggestions and states. The list opens below the field inside the component. A container with a restrictive `overflow` value can clip the list. To style the control, use the `label`, `control`, `input`, `clear`, `popup`, `list`, `option`, and `status` parts.

## Dialogs and flyout menus

| Tag | Attributes, properties and methods | Slots and parts |
| --- | --- | --- |
| `metro-dialog` | `label`, `trigger-label`, `open`. `show(trigger?)`, `close(value?)`, `returnValue`, `returnFocus` | The main slot and slot `actions` with buttons `data-metro-value`. Parts `trigger`, `surface`, `heading`, `body`, `actions` |
| `metro-flyout` | `label`, `trigger-label`, `open`, `pass-through`. `show(anchor?)`, `showAt(anchor, { x, y })`, `close()`, `returnFocus` | The main slot accepts any content, including the `data-metro-close` buttons. When opened, the element with `autofocus` gets a focus and scrolls into the visible region within the layer. Parts of `trigger`, `surface` |
| `metro-menu-flyout` | Flyout Opening API and `commands` DOM Property with `{ id, label, icon?, disabled? }` Array | In addition to the parts of Flyout available `item`, `icon`, `label`. Arrows, Home and End translate focus to available commands. When you update the array, the focus is retained on the available command with the same `id`, and the menu is scrolled to it. If the command disappears or is disabled, the first command or empty menu surface gets the focus. |
| `metro-context-menu` | The MenuFlyout API. `for` associates a menu with an item ID in the same document or Shadow Root. the `target` DOM property allows you to transfer the item itself. | Right-click, Shift+F10, context menu key, or finger-holding open one set of commands. When closed, the focus returns to the button or other focusable element from which the menu was opened within the specified area. |
| `metro-drop-down-button` | `label`, `menu-label`, `disabled`, `commands` array, `show()` and `close()` methods. The `open` property is available for reading. `returnFocus` specifies the DOM element to return focus if the menu button is no longer available. | The default button text in the slot. Parts of `trigger`, `indicator` and parts of MenuFlyout |
| `metro-split-button` | DropDownButton and `primary-command` APIs with a primary action identifier (`primary`) by default. If the menu button is unavailable and `returnFocus` is not set, the focus returns to the main action. | Default slot for the main action text. additionally available part of `primary` |
| `metro-tooltip` | `text` with a short description appearing when focusing or hovering. Escape hides the clue | One Focusable Trigger in the Default Slot Part of `surface` |

The `trigger-label` includes a built-in button. In the program, transfer the initiator to `show()` to restore focus. `showAt` accepts window coordinates, such as `event.clientX` and `event.clientY`, for context menus. Flyout by default intercepts an external click and closes. `pass-through` transmits a click to the underlying element.

- Dialog gives the initial focus to an available element with `autofocus` if it is given. A long dialogue starts from the beginning. If the browser has selected the surface itself or action below the visible area, the focus goes to the header, and in its absence to the beginning of the content. Tab continues its usual bypass. [WAI-ARIA Recommendations for Modal Dialogues](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- Dialog sends the cancelled `metro-before-close` with `detail.reason` (`action`, `escape` or `programmatic`) and `detail.value`. After closing, `metro-close` is sent with the same fields. The direct assignment of `open = false` closes the dialogue immediately.
- Flyout and MenuFlyout send `metro-close` with `detail.reason` (`action`, `dismiss`, `escape` or `programmatic`). MenuFlyout command selection also sends `metro-command` with `detail.id`. These events pop up and cross the Shadow DOM.
- DropDownButton transmits `metro-command` from its menu. SplitButton sends the same event for the main action.
- DropDownButton and SplitButton both accept `show()` immediately after being added to the DOM. The menu opens after rendering, and the `close()` call before it cancels the opening. Tab and Shift+Tab close the menu and continue to crawl the page.

For the modal layer background, use `--metro-dialog-backdrop`. The standard backgrounds of MenuFlyout and ContextMenu are opaque, black in a light theme and white in a dark one. The menu surface supports `--metro-menu-bg` and `--metro-menu-fg`, the context menu frame is `--metro-context-menu-border`, the hint is `--metro-tooltip-bg` and `--metro-tooltip-fg`.

## Command bar and overlays

The `mode` attribute specifies a closed panel. `default` shows the usual row, `compact` reduces its height, `minimal` leaves the opening button. The `--metro-command-bar-compact-height` and `--metro-command-bar-minimal-height` tokens set the height. In the phone landscape profile, install `orientation="vertical"` and place the panel at the end of the page. The vertical panel uses the usual height of the buttons and takes into account the available length. `hide-secondary` hides secondary commands. `--metro-command-bar-bg` sets the background, and the position on top of the content or in its own band sets the CSS of the page. [Postmarking](../examples/mail/index.html)

The `closeMenu()` method returns `true` if the menu has been opened. [The panel in the Phone Hub](../examples/phone-hub/)


The `metro-command-bar` hosts the `commands` array and direct daughters `metro-app-bar-button`, `metro-app-bar-toggle-button` and `metro-app-bar-separator`. Specify `command-id`, `label`, `icon-name`, `placement`, `priority` and, if necessary, `disabled`. Program teams go first, key matches are resolved in favor of the array. Overflow takes into account the available width and priority. The `fixed-overflow` retains a fixed four seats, while the `context` shift closes the menu. In the `metro-command` event for the switch there is `detail.checked`. The declarative button has this reflected state, the command from the array applies the request to its array.

Set `profile="wp8"` to use fixed primary icon buttons and a secondary text menu instead of adaptive overflow. See the [WP8 Application Bar profile](components.md#use-the-wp8-profile) for modes, orientation, and page layout.

```html
<metro-command-bar label="Record commands" more-label="More">
  <metro-app-bar-button command-id="save" label="Save" icon-name="save" priority="10"></metro-app-bar-button>
  <metro-app-bar-toggle-button command-id="pin" label="Pin" checked></metro-app-bar-toggle-button>
  <metro-app-bar-separator placement="secondary"></metro-app-bar-separator>
</metro-command-bar>
```

`metro-command-bar-flyout` uses the Flyout API with additional `commands`, `more-label` and `context`. Selection closes the layer and returns focus to the initiator. `metro-popup` opens through `show(anchor)` and closes through `close()`. Use `focusContent()` to clearly shift focus. `metro-teaching-tip` adds `heading`, `dismiss-label` and the closing button. In Popup and TeachingTip, the main content is set by the default slot.

When the focused team disappears, CommandBar looks for an accessible element of its dashboard. Pass the source list element through the `returnFocus` DOM property to return focus to it when clearing all commands. Dialog, Flyout, and MenuFlyout also use their `returnFocus` when the source element is hidden, disabled, or removed.

## Progress and status

`metro-transfer-control` displays background operation with `transfer-id`. Use `phase` (`queued`, `waiting`, `transferring`, `complete`, `error`, `cancelled`), `waiting-reason`, `transferred` and optional `total`. At an unknown volume, the indicator remains uncertain. `metro-transfer-action` transmits `{ id, action, phase }` when cancelled or repeated. `pending` blocks repeated requests and keeps the focus on the button. The application performs the operation and updates the state. If the focus button disappears or receives the `disabled` HTML attribute, the focus moves to the transfer status. The clearly established external focus is maintained.

| Tag | Attributes and properties | Slots and parts |
| --- | --- | --- |
| `metro-progress-bar` | `min`, `max`, `value` (default 0-100), `indeterminate`, `state` (`normal`, `paused`, `error`), `label`, `value-text` for state description | Parts of `track`, `fill`, `indicator` |
| `metro-progress-ring` | `active`, `size` (`small`, `large`), `label` | Part of `ring` |
| `metro-info-bar` | `open` (originally open), `severity` (`info`, `success`, `warning`, `error`), `heading`, `message`, `dismissible`, `dismiss-label` | The main slot and `action`. Parts of `surface`, `heading`, `message`, `icon`, `content`, `actions`, `dismiss` |
| `metro-info-badge` | `value` for the counter, `max` (99 by default) for limiting the displayed digit, `label` for the accessible name | No value shows the point or contents of the `icon` slot. Parts `badge`, `dot`, `value` |

The InfoBar Closing Button sends the cancelled `metro-dismiss` event from `detail.reason: 'dismiss-button'`. If the focus was inside the message when closed or on the button that the application removes through `dismissible = false`, the focus returns to the previous available element. To show a new error or result, update the content and assign `open = true`.

```html
<metro-progress-bar value="42" label="Loading attachments"></metro-progress-bar>
<metro-info-bar severity="warning" heading="Mail is unavailable" dismissible dismiss-label="Close">
  <button slot="action" type="button">Retry</button>
</metro-info-bar>
```

## Expansion and scrolling

- The `metro-expander` accepts the `label` or `label` slot for the header and the default slot for the content. The `open` attribute sets the state. A custom disclosure sends `metro-toggle` with `detail.open`. When software folds or removes the focus element from the content, the focus returns to the header. If the app has already set the focus elsewhere, it is saved. Parts are available via `header`, `chevron` and `content`.
- `metro-scroll-viewer` uses native scrolling. Limit its size in CSS and specify `label` for the available domain name. `orientation` accepts `vertical`, `horizontal`, or `both`. Add `data-metro-no-swipe` if the horizontal area is inside Pivot. For strings with stable keys, set `data-metro-key`. Save the result of `getAnchor()` and send it to `restoreAnchor(anchor)` after content recovery. If the string is hidden or gone, the method returns `false` and the application can select a different return point. If the line is shorter than the saved offset, the recovery shows it from the beginning. The horizontal anchor RTL retains the shift from the right edge with `edge: "right"`. For preserved anchors without `edge`, the horizontal shift is still counted from the left edge.

```html
<metro-expander label="History">
  <metro-scroll-viewer label="Events" style="max-block-size: 12rem">
    <p data-metro-key="a17">Message sent</p>
    <p data-metro-key="b21">Message received</p>
  </metro-scroll-viewer>
</metro-expander>
```

## Collections

| Tag | Attributes and properties | Slots and parts |
| --- | --- | --- |
| `metro-list-box` | `label`, `value`, `selectedValues`, `selection-mode`, `activatable`, `disabled`. | Direct children `metro-list-item` and slot `empty`. Parts of `viewport`, `item`, `content`, `mark` |
| `metro-list-view` | Same contract. By default, the list is readable. `activatable` adds a line opening. | Parts of ListBox and `row`. You can use your own button or link in the string |
| `metro-grid-view` | ListView Contract, `columns` Specifies Column Number, `0` Includes Adaptation | ListView Parts. `--metro-grid-gap` and `--metro-grid-item-background` are available for registration |
| `metro-list-item` | Unique `value`, optional `label` and `disabled` | The main slot accepts the contents of the line |

`selection-mode` accepts `none`, `single`, or `multiple`. `value` returns the first selected key, `selectedValues` returns the entire set. For confirmed user actions only, listen to `metro-selection-change` with `detail.selectedValues` and a separate `metro-item-activate` with `detail.value`. The property of `items` takes the new array `{ value, label, disabled? }`. Assigning `null` returns declarative markup. `getAnchor()`, `restoreAnchor(anchor)`, and `focusItem(value)` help the app regain position after the update. If the old offset completely hides the shortened line, the recovery shows it from the beginning. This rule also applies to LongListSelector and RefreshContainer.

```html
<metro-list-view id="contacts" label="Contacts" activatable>
  <metro-list-item value="zoe">Zoe</metro-list-item>
  <metro-list-item value="mira">Mira</metro-list-item>
</metro-list-view>
```

```js
document.querySelector('#contacts').addEventListener('metro-item-activate', ({ detail }) => {
  console.log(detail.value);
});
```

`metro-long-list-selector` accepts direct `metro-list-group` with `value`, `label` and daughter `metro-list-item`. For dynamic data, specify `groups` with a `{ value, label, items }` array. All lines need unique keys. Fixed `item-height` and `group-height` are set in CSS pixels. Virtualized strings use selection and label metadata. In the usual ListView and GridView, the content of the lines remains a living markup.

Slots and parts of `header` and `footer` are scrolled along with the list and remain available when dialed empty. The `empty` slot is shown between them. The header and basement retain the roles of the transferred elements and are not included in the grid lines.

After scrolling the list from the outside, Tab shifts focus to the visible line. When you change the height of a window or rows, the list holds a previously visible line with a focus in the scroll area. Entering the beginning of the label shifts the focus to the matching available line, and repeating one letter sorts out the coincidences. The prefix input saves the current choice. The `current-item` attribute, or `currentItem` property, tags the record that the app is currently showing. The mark uses `aria-current` and is stored when the focus is moved. In `multiple` mode, Shift extends the range, and Ctrl+Shift adds it to the already selected rows. On macOS, you can use Command+Shift to add range.

When the list scrolls, the current group header stays at the top until the next header pushes it out. If the viewport cannot show both the header and one row, the header scrolls with the list. Pinning does not change the key or offset that the list uses to restore its position.

Open Quick Jump with a group header, including a pinned header, or with the overview button. Quick Jump uses the same keys as the list. A user jump emits `metro-group-jump` with the group key and the first available row key. `jumpToGroup(value)` scrolls without an event. `focusItem(value)` focuses an available row and scrolls it into view. You can call it immediately after opening a dialog that contains the list. Set `group-selection` to enable group selection in `multiple` mode. Parts: `viewport`, `row`, `item`, `mark`, `group`, `group-button`, `group-select`, `overview`, `jump-grid`, `jump-tile`.

```html
<metro-long-list-selector label="Phone book" selection-mode="multiple" group-selection>
  <metro-list-group value="a" label="A">
    <metro-list-item value="alina">Alina</metro-list-item>
  </metro-list-group>
  <metro-list-group value="m" label="M">
    <metro-list-item value="mikhail">Mikhail</metro-list-item>
  </metro-list-group>
</metro-long-list-selector>
```

`metro-flip-view` flicks through Direct children with `data-value`. Specify `value` for the initial frame or program transition. The buttons, keyboard, and complete horizontal gesture send `metro-change`. If the button or key interrupts the swipe, the transition immediately reaches the selected frame. Assigning `value` interrupts the swipe without an event. When removing the frame, the next in order or the previous one at the end is selected. If a focused element disappears along with the frame or navigation buttons, the focus moves to the viewing area. The `swipe-disabled` transmits horizontal input to nested interactive content, leaving buttons and a keyboard. `label`, `previous-label`, and `next-label` all specify the accessible names, while the `empty` slot shows the empty state. Parts are available through `viewport`, `track`, `slide`, `controls`, `previous`, `next` and `status`.

The `metro-pips-pager` displays positions independently. Use `count`, `page` (with one, and with empty set 0), `max-visible` and `label`. The component leaves visible the boundaries of a large set and position near the current page. If the pages are gone, the already established focus stays on the navigation container and moves to the current page when it appears. The user transition sends `metro-page-change` with the numerical `detail.page`. Parts are available through `navigation` (also `nav`), `button`, `pip`, and `overflow`. The application can sync PipsPager and FlipView using the current key.

Both components accept the `position-label` template, also available as the DOM property `positionLabel`. The template uses the one-based position `{current}` and the total count `{total}`. For example, `{current} of {total}` changes the visible count and the accessible name of the FlipView slide. In PipsPager, `Page {current} of {total}` changes the accessible button names and the announcement for the current page. In FlipView, use `carousel-description` and `slide-description` to localize role descriptions for assistive technology.

`metro-tree-view` builds a nested tree of `metro-tree-item` with unique `value`, `label`, `expanded` and `disabled`. `value` contains the selected node, `expandedValues` contains the opened branches. The attached button or link is placed in the `actions` slot. To the right opens a branch or transfers focus to the child, to the left closes the branch or returns to the parent, up and down go through visible nodes. Custom disclosure sends `metro-expand-change`, selection sends `metro-selection-change`, and activation with `activatable` sends `metro-item-activate`.

In a narrow tree, the indentations of nested rows are limited by a fraction of the width. Long actions from the `actions` slot can move to the next line.

```html
<metro-tree-view label="Directory" value="letters">
  <metro-tree-item value="archives" label="Archive" expanded>
    <metro-tree-item value="letters" label="Messages"></metro-tree-item>
  </metro-tree-item>
</metro-tree-view>
```

The `metro-items-repeater` displays a `items` array with a stable key from `keyFor(item)`. Use the `template` daughter with `data-metro-field` or the `renderItem(item, container, index)` DOM function. The line container retains the identity when rearranged. `getElement(key)` returns the container. `metro-items-view` adds selection, activation, and `layout="list"` and `layout="grid"` modes to the templates. In ItemsView, the key is taken from the `value` data element. A portion of `item-content` is available for both surfaces.

The `metro-semantic-zoom` accepts the `groups: { value, label, anchor?, disabled? }[]` slot, the `detail` slot, and the optional `overview`. `showOverview()`, `showDetail()` and `zoomToGroup(value)` control the review. The user transition sends `metro-zoom-change` with the `view` and `value` fields and returns the scroll to the saved anchor or selected group. If the anchor is removed or hidden, the choice leaves the view open without an event. When returning, focus is restored inside the detailed view or on the switch if the former element is not available. If the focus is already outside of SemanticZoom, it stays there.

`metro-annotated-scroll-bar` communicates with the scroll area via `for` or the `target` DOM property. Specify `annotations: { value, label, anchor?, disabled? }[]` for string labels with `data-metro-key`. `scrollToAnnotation(value)` goes to the tag, and the user action sends `metro-annotation-change`. If a line is hidden, its label is temporarily disabled and ceases to be current, and the risk disappears from the scale before the line appears. When you disable or remove the tag with focus, the component transfers the focus to the available label or scale.

`metro-swipe-control` receives `value` strings and `actions: { id, label, side?, disabled?, destructive? }[]` array. The horizontal gesture reveals the side of `start` or `end`, and in `mode="execute"` confirms the action available when the threshold is exceeded. The `metro-swipe-action` event transmits the line key, action, and side. The same commands are available through the menu button and `showActions(side)`. `busy`, `disabled`, and `closeActions()` help the application manage execution. Replacing the `actions` array, changing the `mode`, `openSide`, or string key interrupts the current gesture. Release of the pointer after cancellation does not call the command. If the focus button becomes unavailable when updating data or blocking, the focus button is given to the available open side command, menu button, or line area. From the line area, Tab continues the usual roundabout. The `actions-label` attribute defines the name of the button and the open menu. The menu is closed when the key is changed, all available commands are blocked or disappeared.

`metro-refresh-container` sends `metro-refresh` when you gesture from the top edge, activate a button, or `requestRefresh()`. The application confirms the state via `refreshing` and communicates the result via `status`. `getAnchor()` and `restoreAnchor(anchor)` help to keep the list at the previous row after receiving the data. The content is placed in the main slot, `scrollViewport` returns the scroll area. Once the update is complete, focus recovery will try the previous button available, replacing it with the same `data-metro-focus` or list area. The clearly translated focus remains.

`metro-reorder-list` displays `items` or `metro-list-item` Direct children. The native drag and drop handle works with a mouse. With the Space or Enter keyboard, start and confirm the transfer, the arrows select the position and scroll the list to the marker, the Escape cancels the transfer and shows the original handle. `metro-reorder-preview` transmits the preorder. In `metro-reorder`, the application receives `{ value, before, values, source }` and applies the selected order to its data. If the handler explicitly translates the focus, the list saves it. A component rearranges a single entry within a single list.

### Transfer and shared selection

`metro-collection-transfer` combines `metro-reorder-list` listings with a unique `id` attribute and `transfer="move copy"` attribute. The direction and place of insertion are selected by the drag handle or available form in the transfer area. The `labels` property localizes fields, buttons, and messages. The `metro-transfer-preview` event transmits `source`, `target`, `value`, `before`, `operation` and `input`. The target list confirms `metro-before-transfer` with a `event.detail.accept()` call. Pass the string for a new key or Promise for an asynchronous solution. `event.detail.signal` is terminated when the request is cancelled. `metro-transfer` contains `sourceValues`, `targetValues`, and `targetValue` after rechecking the keys. The app uses both collections in one update. The `target.focusItem(targetValue)` is available for its own focus management.

While waiting, the form keeps the focus on the confirmation button and blocks resending. The next Tab shifts focus to the cancellation button. After transferring through the form, the component scrolls to the line in the target list, after canceling, returns the focus to the visible source line.

`metro-cross-slide` wraps the line of the collection. A short transverse motion changes the choice. `axis="horizontal"` is suitable for vertical tape and `axis="vertical"` for horizontal tape. The selection button also works from the keyboard. Enter `value`, `selected` and the accessible name via `select-label`. `metro-cross-slide-change` reports the key, the state of `selected`, and the source of `slide` or `button`. Parts of `surface`, `row`, `content`, `select` and the `--metro-cross-slide-background` token are available for registration.

With `transfer-gesture`, the second threshold triggers the transfer. `threshold` and `max-distance` set the thresholds in CSS pixels. `metro-cross-slide-transfer` reports `phase` (`start`, `move`, `drop` or `cancel`), `value`, `pointerId` and coordinates `clientX`, `clientY`. Within a suitable ReorderList and CollectionTransfer, the movement shows the insertion location, the release confirms it, and the release outside the available group removes the preview. Without the `transfer-gesture`, a long movement completes the pre-selection.

`MetroSelectionSet` stores selected application keys and checks them against the directory. `toggle(key, selected?)` changes one key, `replaceScope(keys, selectedKeys)` changes the choice of visible group, `setCatalog(items)` takes into account remote and inaccessible elements. Read `values` and `selectedItems` and update views on the `change` event. [Move/Copy transfer](../examples/collections/index.html) · [Compilation of several groups](../examples/collections/selection.html)

For group transfer, specify `group-key` on each ReorderList and specify `transfer.selection`. The grouping uses a list ID if there is no separate group key. The keyboard, pen, and Cross-slide all use a single transaction. `beginBatch(source, anchorValue)`, `propose(target, before, operation)` and `commit()` calls are available for the user interface. `metro-transfer-batch-preview` transmits `items`, `targetGroup` and `before`. In `metro-before-transfer-batch`, call `accept()` for Move or `accept(newKeys)` for Copy. Copy keys are in order `items`. Confirmed `metro-transfer-batch` gives `targetKeys` and `updates` to apply lists simultaneously. [Group transfer](../examples/collections/index.html)

## Tables and charts

`metro-table-view` receives `columns` with `key`, `label`, `sortable?`, `rowHeader?` and `rows` fields with `id`, `cells`, `label?`, `disabled?`. `sort` has fields `key`, `direction` or equal to `null`. `metro-sort-change` reports sorting, `metro-row-activate` reports activated string if given `action-label`. The table uses native headings and cells. The label is carried along the width of the visible area and remains in place when horizontally scrolling. The focus is retained by the key of a line or column. When rearranging the columns, the table is scrolled horizontally so that the previously visible focus button remains visible.

`metro-chart` accepts `categories: { id, label }[]` and `series: { id, label, values, color? }[]`, where `values` is indexed by category identifiers. `type` receives `bar` or `line`. The graph displays negative and positive values relative to zero, and the missing data leaves a gap. Labels of the scale use `locale`, including in the scientific record for very large and small values. The exact values are available in the table. If the graph or open table is wider than the component, you can reach the scroll area through the Tab and scroll through it with arrows. When the focused area disappears after updating the data, the focus goes to the graph header. The patterns of lines in the legend repeat the strokes of the graph. In the mode of forced flowers, columns and their samples differ in casting and hatching. For long sets, the series uses these drawings cyclically. Legend and labels are customized via `label`, `locale`, `category-label`, `data-label` and `missing-label`.

## Pages and history

The `metro-frame` displays one direct daughter `metro-page`. Specify the unique `value` page and `label` for the title. The page accepts `title`, `commands` slots and the default slot. If an HTML header or element with `role="heading"` is transferred to `title`, it retains its level, and the part of `heading` serves as a named group for focus. For plain text in a slot or `label`, this part is itself a first-level header. Parts are available via `page`, `heading` and `body`.

The application can explicitly move the focus in the `metro-navigate` handler, for example, immediately put the cursor in the field on the page that opens. Frame prioritizes this focus in transition and back.

Use `frame.navigate(value, { params, state, replace })` for transition and `frame.back()` for return. The current record is available as `frame.visit`. The `frame.saveState(snapshot)` method saves the state of the page. When you re-open one route, each visit gets its own parameters and status. After Back, the focus is returned to the previous node or to replace it with the same `data-metro-focus`. In the absence of both, Frame focuses the page title.

`metro-before-navigate` and `metro-navigate` carry `detail` with `from`, `to` and `direction` fields. The first event can be canceled, for example, to request confirmation of withdrawal. `frame.value = 'list'` switches the page and resets the local story without an event. If the value is unknown, Frame selects the first available page. The URL, browser history and priority of closing open layers belong to the application.

```html
<metro-frame id="frame" value="list">
  <metro-page value="list" label="Notes">
    <button id="open-note" type="button" data-metro-focus="note-12">Open note</button>
  </metro-page>
  <metro-page value="note" label="Note">
    <button id="back" type="button">Back</button>
  </metro-page>
</metro-frame>
```

```js
const frame = document.querySelector('#frame');
document.querySelector('#open-note').onclick = () => frame.navigate('note', { params: { id: 'note-12' } });
document.querySelector('#back').onclick = () => frame.back();
```

## Sections and breadcrumbs

- The `metro-selector-bar` shows several equal representations. Use direct children `metro-radio` and radio group properties `label`, `value` and `defaultValue`. The arrows switch the selection, and the `change` passes the selection to the handler via `event.currentTarget.value`. The `--metro-selector-indicator` token specifies the color of the feature under the selected item.
- `metro-breadcrumb-bar` takes the `items` DOM property with the `{ id, label, href? }` array in order from root to current page. The last element is marked `aria-current="page"`. Ancestors with `href` remain references. `label` is the name of the navigation. Parts are available through `nav`, `list`, `item`, `link`, `text`, `current` and `separator`.
- The `metro-navigation-view` takes the main content in the slot by default and the `items` DOM property with the `{ id, label, href, disabled? }` array. The application specifies the current partition in `value`. With a container width from `40rem`, the `placement="top"` attribute places links above the content, and `placement="side"` places them on the side. The narrow container uses a menu button with the label `menu-label`. Escape or `closeMenu()` closes the menu and returns the focus to the button. `open` controls the display in narrow mode, `label` sets the navigation name. With the `show-back` attribute, a `back-label` button is available, which the app turns on via `canGoBack`. She's sending `metro-navigation-back`. Parts are available through `toggle`, `back`, `nav`, `list`, `item`, `link` and `content`. The width of the sidebar is configured via `--metro-navigation-width`. [Upper navigation with Frame](../examples/navigation/index.html)

BreadcrumbBar and NavigationView send `metro-breadcrumb` and `metro-navigation` with `detail.id` and `detail.href` respectively. In SPA, you can cancel the standard transition through `preventDefault()` and transfer the address to the router. Links save the usual opening via Ctrl/Cmd+Click.

In the compact NavigationView, a long list is scrolled inside the menu. When opened, the current section is displayed in the visible area. If the `metro-navigation` handler moves the focus to a new page, the menu closes while retaining that focus.

## Panorama and Hub

`sectionsInView` returns the keys of the visible sections in order, `firstVisible` returns the key first. The `metro-sections-in-view-change` event transmits `{ values, first }` as visibility changes. For the Phone Hub command panel, use the first visible section. To write the current section to the page state, use the confirmed `value` from `metro-change`. [Example of section commands](../examples/phone-hub/)


`metro-panorama` and `metro-hub` take `metro-hub-section` Direct children with resistant `value` and visible `label`. In the section, you can specify `href` for the normal header reference and `hero` for the review section. `heading` signs the entire review, `label` sets the accessible name, `background` slot takes the decorative background.

With a standard section width, Panorama, after swiping horizontally or scrolling with a trackpad, brings the selected section to the edge of the viewing area. You can see the edge of the next one. If the section is wider than the viewing area, the trackpad can also stop inside it.

Hub uses `profile="phone"` or `profile="desktop"`. In the wide layout of the desktop, several sections are visible, in a narrow one they line up vertically. `loop` accepts `auto`, `always`, or `never`. The automatic cycle runs from two sections in Panorama and three in the Phone Hub. A swipe or navigation from the keyboard sends `metro-change` to `detail.value` after the switch is completed. The direct assignment of `value` takes place without an event. `focusSection(value?)` focuses the section header. The link transmits the cancelled `metro-section-open` event with the key, address, and initiator. The attached interactive area can be given a gesture axis via `data-metro-no-swipe`.

```html
<metro-panorama heading="Music" value="recent">
  <metro-hub-section value="recent" label="Recent" href="/music/recent" hero>
    <p>Recently added albums</p>
  </metro-hub-section>
  <metro-hub-section value="artists" label="Artists">
    <p>Find an artist in the collection</p>
  </metro-hub-section>
</metro-panorama>
```

The `metro-lockable-pivot` uses the same `metro-pivot-item` panels as the Pivot. The `locked` attribute or property holds the current panel, removes adjacent tabs from the row, and interrupts the current swipe. The content of the selected panel remains available. After removing the lock, the neighboring tabs return, and a new swipe can start with a new touch.

## Document tabs

The `metro-tab-view` displays `metro-tab-view-item` Direct children with unique `value` names, `label` titles, and the main content slot. The tab can be set to `closable` and `disabled`. When the last tab is closed, the `empty` slot is displayed. The arrows move the focus on the headlines, Enter or Space activate the document. User selection is sent by `metro-change`. The combinations Ctrl+Tab and Ctrl+F4 work when the browser transmits them to the page.

When you change `value`, row width, or direction of writing, the row scrolls to the focus header. If the focus is outside the row, the scroll shows the selected title and leaves the focus on the current item.

`closeTab(value)` is requesting closure. The `metro-before-tab-close` handler may cancel it or transmit the result of the save or dialogue to `detail.waitUntil(promise)`. The promise must be resolved in `true` for confirmation. `metro-tab-close` comes after the tab is deleted. `reorderable` includes native drag and drop with an insert label. `moveTab(value, index)` moves the tab through the API.

`transferTab(value, { target, item?, index? })` transmits the session after the target TabView receives it. The current document carries over the existing markup. In another window of the same site, the application creates a target `item` with the same `value`; TabView transmits the original `session` object to it. TabView may cancel `metro-before-tab-receive`. The app stores the draft, address and history in `session` and is responsible for opening the window. The pending closing request applies in the current owner window after the transfer. Parts are available through `tablist`, `tab`, `close`, `panel` and `empty`. [Work area with two windows](../examples/workspace/index.html)

`detachable` sends `metro-tab-detach-request` after resetting the title to a page outside of a series of tabs. The handler can immediately request a window and forward to `event.detail.accept(destination)` a ready-made assignment or a Preparation Promise. `null` retains its current owner. An element with `data-metro-no-detach` excludes its area from this gesture. The window opening policy is determined by the browser.

To reset to a number of other windows, configure the receiving TabView with `reorderable` and the `dragAdapter` DOM property. `peers()` returns permissioned source TabViews of the same origin, `canReceive?(detail)` allows preview and paste, `createItem(detail)` creates a tab in the receiving document. The same `data-metro-focus` on the elements of the two views allows you to restore focus after transfer. `--metro-tab-drop-indicator` is used to tag the insert. [Opening and returning window code](../examples/workspace/workspace.js)

## Adaptive panes

- `metro-list-details` hosts content from `list`, `details` and `empty` slots. The application selects the object via `value` or `showDetails(value, source?)`. `back()` closes the card and returns focus to the original available list item, then tries a replacement with the same `data-metro-focus`. If neither of them can get the focus, it goes to the list bar. In a compact card, Escape calls Back. When focusing in a nested modal dialogue, Escape processes the dialogue itself. `metro-before-details-change` can be canceled, and `metro-details-change` transmits a new key and reason. Changing the width saves the DOM of both slots and does not send a transition event. Parts are available via `list`, `details` and `back`.
- `metro-two-pane-view` accepts `first` and `second` slots. `wide-mode` and `tall-mode` accept `first-second`, `second-first`, or `single`. `min-wide-width` and `min-tall-height` set the thresholds in CSS pixels. With one visible slot, the choice is made by `pane-priority`. The current value of `mode` and the event of `metro-layout-change` reflect the layout.
- The `metro-split-view` uses `pane`, `compact` and the main slot. `display-mode` accepts `inline`, `overlay`, `compact-inline`, or `compact-overlay`. The `placement` attribute chooses `start` or `end`, `open` controls the state. `showPane(source?)` and `closePane()` send `metro-pane-change` with `detail.open`. Escape closes the panel in overlay mode. Focus is returned to `source` or the panel button if the source is no longer available. When you change the mode, the focus from the hidden compact column goes to the button, and from the content that has become inaccessible under the overlay, to the open panel. `--metro-split-pane-size` and `--metro-split-compact-size` set widths.

## Icons

`metro-icon` draws a named monochrome character by inheriting the color of the text. `metroIconNames` contains character names including `add`, `check`, `close`, `search`, `delete`, `save`, `folder`, `mail`, `settings`, and `play`. For your icon, use the main slot. For a sign with an independent meaning, specify `label`. Without it, the icon is hidden from the means of availability.

`metro-animated-icon` changes one character to another when assigned `name`. `duration` gives the duration in milliseconds. Enabling `prefers-reduced-motion`, the `hidden` attribute, and deleting the DOM cancel the transition. Both tags have parts of `glyph` and `icon` and `--metro-icon-size` and `--metro-icon-stroke` tokens. In commands, use `iconName` for the finished sign or `icon` for the character.

```html
<metro-button><metro-icon name="save"></metro-icon> Save</metro-button>
<metro-icon name="mail" label="Unread messages"></metro-icon>
```

## Typography and layout

| Tag | Contract |
| --- | --- |
| `metro-text-block` | `variant` receives `body`, `subtle`, `small`, `title1`, `title2`, `title3`, `large`, `group-header`, `contrast`, `accent` or `huge`. `level` sets the semantic level of the header. `trim` accepts `wrap`, `ellipsis`, or `balance`. The main slot is either `text`, part of `text`. |
| `metro-rich-text-block` | Same options, regular paragraphs, titles and slot links. `--metro-prose-width` controls width, part of `content` |
| `metro-label` | Designs nested native `label` with regular `for`. Use `--metro-label-size` and `--metro-label-color` |
| `metro-stack-panel`, `metro-wrap-panel` | They are placed vertically or horizontally through `orientation`. Horizontal WrapPanel transfers elements to new lines over the available width. To transfer to neighboring columns, specify `orientation="vertical"` and limit the height of the component through `block-size` or `max-block-size`. The space sizes are given by `--metro-layout-gap`, a part of `panel`. |
| `metro-grid` | The `columns` and `rows` take the equal number of tracks or the CSS Grid size list. `--metro-grid-column` and `--metro-grid-row` on the daughter node define its position, part of `grid` |
| `metro-canvas` | Set the coordinates and layer on each child element. `--metro-canvas-x` counts from the beginning of the line, `--metro-canvas-y` from the beginning of the block, `--metro-canvas-layer` controls the overlay inside the canvas. In a nested Canvas, the child elements without predefined coordinates begin with its own beginning and the `auto` layer. Set the altitude through `--metro-canvas-height`, part of `canvas` |
| `metro-border` | Designs the slot with an internal frame. `--metro-border-width`, `--metro-border-color`, `--metro-border-padding`, part of `surface` |
| `metro-content-presenter`, `metro-content-control` | Main slot or DOM property `content` with text, number or DOM. ContentControl adds slots `header` and `footer` and token `--metro-content-padding` |
| `metro-shape` | `kind` accepts `rectangle`, `ellipse`, `line`, or `polygon`. The polygon `points` has an array of coordinates `{ x, y }` in the region 0-100. `label` gives you an accessible name. Without him, the figure is decorative. The dimensions are set by `--metro-shape-width` and `--metro-shape-height`, the color and trim are `--metro-shape-color`, `--metro-shape-fill`, `--metro-shape-stroke` and `--metro-shape-stroke-width`. Part of `shape` |

```html
<metro-stack-panel style="--metro-layout-gap: 1rem">
  <metro-text-block variant="title2" level="2">Contacts</metro-text-block>
  <metro-label><label for="search">Contact name</label></metro-label>
  <input id="search" type="search">
</metro-stack-panel>
```

## Media, maps, and documents

- `metro-media-player` uses the native element `media`. Specify `kind="audio"` or `"video"`, `src` or the `sources` array and, if necessary, `poster`, `muted`, `autoplay`, `loop`, `preload`. The `tracks` DOM property transmits tracks. The `play()`, `pause()`, `seek(seconds)`, and `state` allow multiple screens to work in a single session. `metro-media-state` separately transmits position, playback, buffer expectation, and download ranges. `native-controls` includes a browser bar, including its choice of subtitles. The `hide-controls` is suitable for its own panel. In the built-in panel, turning off the focused rewind or removing the full-screen button shifts the focus to Play. When changing panels, save the element in the DOM. Parts are available through `player`, `media`, `controls`, `play`, `seek`, `time`, `mute`, `fullscreen` and `status`. [Copyable archive of records](../examples/media/index.html)
- `metro-image` accepts `src`, `srcset`, `sizes`, `alt`, `width`, `height`, `loading`, and `fit`. The error has a `fallback` slot and a `metro-image-error` event. If the source is empty or not loaded, `alt` text is displayed when the slot is empty. `metro-image-load` transmits the original dimensions. The `metro-image-brush` uses the image as a decorative background behind the main slot. For the avatar, `metro-person-picture` takes `name`, `src`, `initials` and the `badge` slot. Prior to successfully downloading the current source, the avatar shows the person’s initials or icon. When you change the `src`, the result of the previous download does not affect the portrait. The circle size is `--metro-person-size`. `--metro-person-font-size` sets the upper text size, and in a compact circle, the initials are reduced. The icon is located at the bottom edge of the circle on the side of the end of the line, even if the element itself is stretched in width.
- `metro-multi-scale-image` accepts `src`, `alt`, `zoom`, and `max-zoom`. Buttons, keys, double-clicks and pinch change the scale. When you zoom in, the arrow or pointer moves the image. Save `view` with `zoom`, `x`, `y` fields for return and change it programmatically. Assigning `zoom` or `view` interrupts an incomplete gesture without an event. The buttons and keys scale the last confirmed position. `metro-image-view-change` comes after a user action. In an enlarged state, the area itself serves the swipe. When the pointer is canceled, the capture is lost, the size or source is changed, the incomplete gesture returns the last confirmed position without the change event. If the scale button becomes unavailable, focus moves to the image and scale commands remain available from the keyboard.

`MediaPlayer.play()` uses a new source after assigning a source. The promise of the previous call still communicates its result, and the state of the player is determined by the current record. Assigning `MultiScaleImage.view` interrupts the current gesture without `metro-image-view-change`.
- `metro-map-view` receives coordinates, `zoom`, `markers`, and when `userLocation` is present. The `tileSource({ x, y, z })` DOM function delivers tiles according to the XYZ/Web Mercator scheme. Without the provider, the coordinate grid is displayed. `metro-map-view-change` transmits `view` and `bounds`, `metro-map-select` transmits the tag. `metro-map-locate` asks the application for position determination. To attribute the supplier, use the `attribution` slot. If the focus tag goes beyond the map, the focus goes to the same point on the list. When a point disappears, the selected entry, the first available point, or the area of the map is used. If the scale button becomes unavailable, the focus goes to the map, where the arrows and scale keys work.
- `metro-web-view` opens `src` in the iframe. In `history-enabled` mode, it keeps its own history of `navigate(url)` calls and the usual links of the available iframe. Moving to the anchor and back inside the same document retains its DOM. `back()` returns `false` when it is time to transfer Back to the host. When scripts are disabled, WebKit tracks available iframe transitions, and the browser can also add them to its history. The `sandbox`, `allow` settings and embedding restrictions determine access to content. For another site document, the download event is reported by `documentAccessible: false`. For a known host bug, there are `reportError(message)` and `reload()`. When a timeout or error occurs during booting, the unfinished iframe is deleted. Retry uploads the same address without a new entry in the story. If Back or Forward becomes unavailable, the focus goes to the remaining navigation button or document. When a document with a focus is mistaken, it goes to Retry, and a re-download returns it to the document.

## Files, speech, and ink

An example of import uses `share_target` for the incoming form and `file_handlers` along with `launchQueue` to run with the file. Service worker stores incoming data in IndexedDB. The page shows the action and destination section before confirmation. The local `metro-file-picker` goes through the same check. System inputs depend on PWA support and installation. [Incoming files](../examples/imports/index.html)

- `metro-file-picker` uses system-based file selection through native input. `accept`, `multiple`, `capture`, `name`, and `required` customize it as part of the form. `metro-file-select` transmits the `files` array and query and context identifiers. After a `context-key` change, the previous result or cancellation is ignored, even if a new choice is opened. `metro-file-cancel` announces cancellation of current request. The `files` property contains selected files, `clear()` cleanses it.
- `metro-speech-text-box` saves normal text input and adds recognition via the `speechAdapter` or Web Speech API in a supported environment. The draft recognition requires explicit confirmation. If the focused command or option disappears, the focus goes to the start button, and if it is not available in the input field. The clearly established external focus is maintained. `metro-speech-recognized` can be cancelled before insertion. `startRecognition()`, `cancelRecognition()`, `speechAvailable` and `speechStatus` are available to manage the request.
- `metro-ink-canvas` stores `strokes` with normalized coordinates, size and tool. The pen and mouse work immediately, touch drawing is enabled via `draw-touch`. `serialize()` and `restore(json)` store the stroke data. `undo()`, `clear()` and pen and eraser tools are available from the keyboard. `metro-ink-change` transmits the saved strokes and the reason for the change. An unfinished stroke uses the tool, color, and thickness selected at the beginning of the input. Changing the size of the canvas cancels this stroke and retains the completed annotations. The `description` slot adds a text description of the annotation. Ctrl+Z and Cmd+Z remove the touch when focusing in the toolbar. In the elements of the slot, the usual browser cancellation works. If the cancel or clear button loses availability due to an empty history, the focus shifts to the current tool.
- `metro-share-button` accepts `text`, `url`, `share-title`, or the `data` DOM property with text, link, and files. The button accesses `shareAdapter` or Web Share after a user action. `copy-fallback` shows a separate copy command. If it disappears with focus, the component translates it to the accessible main button. The clearly established external focus is maintained. `metro-share-result` transmits the method, result, and context key.
- `metro-camera-capture` shows viewfinder, preview, re-shoot and confirmation. The `facing-mode` accepts the `environment` or `user`, the `file-fallback` adds the image selection, and the `file-name` sets the name of the camera snapshot. Specify `context-key` or `contextKey` for the destination to which the image relates. `metro-camera-capture` transmits `file`, `source`, `requestId` and `contextKey` upon confirmation. `metro-camera-cancel` transmits query and context keys when cancelled. `cameraLabels` and `cameraMessages` allow the application to localize commands and states.
- The camera is triggered by a button or `start(event)` from a trusted user action. `cancel()` frees up resources. Changing the context, disabling the item and leaving the page closes the current request. `cameraAvailable` and `cameraState` are available for reading. The `cameraAdapter` property allows you to delegate opening, shooting, and closing to the host. The default is `getUserMedia` in a protected context. Parts of `viewfinder`, `preview`, `actions`, `status` and `--metro-camera-height`, `--metro-camera-bg` tokens control the design. The `direct` attribute transmits the frame immediately after pressing the shooting button. File selection still opens preview. [Photo editor and repository](../examples/camera/README.md) · [Copyable example of a camera](../examples/camera/index.html)
- `metro-reminder` shows `heading`, `message`, `scheduled-at` and the state of `state`. The `metro-reminder-action` event transmits `open`, `snooze`, or `dismiss`, stable `id`, and time. If the focused command disappears or receives the `disabled` HTML attribute, the focus shifts to status. The clearly established external focus is maintained. Planning, repetition, and recording selection after activation are the responsibility of the host.

## Tiles and notifications

- `metro-live-tile` and `metro-hub-tile` accept `mode="flip"`, `"cycle"`, or `"iconic"`. `publish(content)` uses data with increasing `version`. The fields `front`, `back`, `frames`, `count`, `status`, and `sizes` provide representations. The missed field is saved, `null` clears it. Updating only the meter or status saves the current frame and the schedule of the change of frames. The new content of the sequence begins with the first frame. Animation is performed only for visible tiles, stops at focus, `paused` and reduced motion. Both tags retain a native link from `href`, `target`, and `rel`.
- `metro-toast` accepts either `notification` or `show(notification, source?)`. `duration` sets the time in milliseconds, zero leaves the message until it closes. The timer pauses when hovering, focusing, and hiding the tab. If the focused command disappears when the notification is replaced, the focus shifts to a new command or to the closing button, and the timer remains on pause. When the focused Toast is closed, the focus returns to `source`, transmitted for the current notification. `metro-notification-center` reads the long-term array of `notifications` applications. Both surfaces send `metro-notification-activate` with a stable key, object, and source. `metro-notification-dismiss` transmits the cause, and `metro-notifications-clear` requests the list to be cleaned. Records and routes belong to the app. [Copyable archive of records](../examples/media/index.html)
- `metro-status-bar` shows `time`, `signal`, `battery`, `charging`, `progress` and `busy` transmitted by the application. For naming there are attributes `network-label`, `battery-label`, `charging-label` and `progress-label`. The missing meanings are hidden. Parts are available through `status`, `signal`, `battery`, `time` and `progress`.
- The `metro-title-bar` accepts the `heading`, the main slot, the `start` and `actions` slots, and the optional `windowAdapter`. Buttons appear for implemented host actions. `metro-window-action` can be canceled. While the host processes the command, the button keeps the focus and reports the unavailability via `aria-disabled`. Deployment and recovery block each other until the request is complete. In normal browser mode, the buttons can move to a separate line if the header and commands lack space. The `overlay` attribute uses Window Controls Overlay geometry if it is provided by the browser of the installed application.
- The `relict-metro-ui/shell-host` module exports `requestMetroSecondaryTile`, `unpinMetroSecondaryTile` and `publishMetroLockScreen`. Operations use a host capability adapter and return `applied`, `declined`, or `unsupported`.

### Application activation and system schedulers

`MetroActivationScope` accepts `activate(entry)` for normal launch, file, link, protocol, tile, notification, and reminder. `resolve(entry, signal)` converts input to `{ identity, route, params?, state? }` from current data. `current()` returns an already open-source key, while `navigate(destination, entry)` uses a Frame route or router. When a new `cancel()` sign-in or call is made, the `superseded` gets an outdated result. Results `opened`, `current`, `unavailable` and `blocked` allow the application to select the desired message and return policy. [Launch with direct link and restoration](../examples/launch/index.html)

`new MetroReminderScheduler(host)` puts or replaces a reminder via `schedule({ id, scheduledAt, title, destination })`. `scheduledAt` is defined as Unix time in milliseconds. The host implements `reminders.upsert(request)` with the same ID and `reminders.cancel(id)` replacement. One copy of the dispatcher performs operations for each ID in order of receipt. The application updates the interface according to the confirmed result, stores the repeat rule and receives the fact of delivery from the host. A browser without a schedule adapter returns `unsupported`.

`new MetroBrowserNotifications(registration)` publishes system notifications through an active service worker. From the button handler, call `requestPermission()`, then `publish({ id, title, destination, expiresAt? })`. The destination address is in the same service worker area. `dismiss(id)` revokes notification, `pruneExpired()` closes expired, `readMetroNotificationActivation(event.notification, registration.scope)` reads the current assignment in `notificationclick`. Worker handler, window opening and application data relevance belong to the application. [Opening-notice log](../examples/notifications/index.html)

`publishMetroAppBadge(unreadCount)` updates the counter of the installed web application through the available browser Badging API. Zero clears the meter. The positive whole is taken from the application model. The operation returns `applied`, `declined`, or `unsupported`.

## Back and keyboard commands

`relict-metro-ui/input-scope` imports `MetroBackScope` and `MetroKeyboardScope`, both available from the browser module.

- `MetroBackScope` first requests the closure of the last open layer, then calls the `keyboard`, `mode`, `navigation`, and `host` handlers. `enterLayer(dismiss, active?)` registers the opening and returns the deregistration function to self-close the layer. `false` holds control in the layer. The step handler returns `handled`, `blocked`, or `pass` to continue the search. The `requestBack()` parallel calls receive the result of a single action. Button, system event and call router application connects itself.
- `MetroKeyboardScope` listens to events within the transmitted element. `commands()` returns current commands with `id`, `run(event)`, `disabled`, combinations of `keys` and optional `accessKey`. For editable fields, match availability is enabled by the `allowInEditable` property. `exclusive` holds the combinations within the nested area, `active()` includes the region by its state. The `renderTips` gets hints after a separate Alt and an empty array when closed. When dismantling the area, call `dispose()`. [Editor, Back and Draft Teams](../examples/editor/index.html)

### On-screen keyboard and viewport

`MetroFormViewport` from `relict-metro-ui/form-viewport` gives `snapshot` and `change` events the dimensions of `layout`, `visible`, `usable` and `scale`. Rectangles use CSS pixels relative to layout viewport. `visible` follows VisualViewport. The `usable` takes into account the lower overlap with the keyboard, which confirms VirtualKeyboard. `keyboard` is equal to `null` if the browser does not report the keyboard status.

Add `viewport.handleBack() ? 'handled' : 'pass'` to the `keyboard` step on MetroBackScope. `canHandleBack` reflects the availability of a hidden request. Native `hide()` depends on the `virtualkeyboardpolicy="manual"` policy for the active field, the user’s previous action, and the environment. The closing fact comes in the change in geometry. When dismantled, call `dispose()`. [Editor with a visible save command](../examples/keyboard/index.html).

## Motion effects

```html
<metro-navigation-transition transition="turnstile-feather">
  <metro-frame value="list">
    <metro-page value="list" label="Records"><p data-metro-feather>Recent records</p></metro-page>
    <metro-page value="detail" label="Details"><p data-metro-feather>Record description</p></metro-page>
  </metro-frame>
</metro-navigation-transition>
```

- `metro-navigation-transition` responds to the accepted Frame transition. Specify `transition="turnstile"`, `"turnstile-feather"`, `"slide"`, `"fade"`, `"connected"` or `"none"`. There are `play(target, direction?, phase?)` and `cancel()` for manual start-up. When importing separately, connect Frame and transition modules.
- `metro-slide-in-effect` defines `from="start|end|top|bottom"` and `distance` in CSS pixels. `metro-turnstile-feather-effect` sequentially animates direct children or `data-metro-feather` elements, with `direction`, `phase`, and `stagger` attributes. For both, `play()`, `cancel()`, `duration`, `autoplay` and `event` are available with a pop-up event name.
- `metro-tilt-effect` adds feedback when pressed with a pointer or keyboard. Regular buttons and links work immediately. `data-metro-tilt` marks an additional interactive target, while `data-metro-no-tilt` excludes a site. All effects take into account `prefers-reduced-motion`.

The `hidden` attribute cancels the running effect. Tilt also resets the press if the target is deleted, hidden or disabled during retention.

[Connection, Pivot, CommandBar and Tile](../README.md#public-api) · [Copyable example of settings](../examples/controls/index.html)

To switch between the card and the details, specify the key on both visual elements and pass the same key to the transition. The app can update `connectedKey` before `frame.navigate()` or `frame.back()`. The component measures the source before changing the page and then animates the appearance of the corresponding target. Hidden, deleted or scrolled outside your area card gives the usual appearance of the page. With reduced motion, the transition occurs immediately. [Example of a gallery](../examples/photos/)

```html
<metro-navigation-transition transition="connected" connected-key="coast">
  <metro-frame id="gallery" value="list">
    <metro-page value="list"><button data-metro-connected="coast">Lighthouse</button></metro-page>
    <metro-page value="photo" label="Details"><h2 data-metro-connected="coast">Lighthouse</h2></metro-page>
  </metro-frame>
</metro-navigation-transition>
<script type="module">
  const frame = document.querySelector('#gallery');
  frame.querySelector('button').onclick = () => frame.navigate('photo');
</script>
```

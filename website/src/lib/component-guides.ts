// Each entry describes a task and the public API needed to complete it.
// Keep the detailed contracts in docs/api.md; the section key links to them.
type Guide = [usage: string, api: string];
const sections: Record<string, Record<string, Guide>> = {
  'buttons-and-forms': {
    button: ['Submit a settings form or run an action when the user clicks.', 'Set `type="submit"` inside a form. The default is `button`. Use `disabled` to prevent activation. The default slot supplies the button text.'],
    'toggle-button': ['Let the reader mark an item as a favorite. Keep the button text the same in both states.', 'Set `checked` for the initial state. Read `checked` in the `change` handler. Use `disabled` when the action is unavailable.'],
    'repeat-button': ['Hold Increment to change a count repeatedly. A short click changes it once.', 'Listen for `metro-activate`. Read `detail.repeat` to distinguish a repeat from a short press. Set `delay` and `interval` in milliseconds.'],
    hyperlink: ['Link a label and icon to another page. The reader can open the link in a new tab.', 'Set `href` to the destination. Use the default slot for the link text. Set `target` and `rel` as on a native link.'],
    checkbox: ['Offer an independent choice in a form. Toggle the box, then submit the form to read the result.', 'Set `name` for form submission and `checked` for the initial state. Read the current `checked` property on `change`. An unchecked box contributes no form value.'],
    'toggle-switch': ['Switch a setting on or off without changing its name.', 'Use `checked` for the initial state and read the `checked` property on `change`. Set `on-label` and `off-label` for the state text.'],
    'radio-group': ['Offer mutually exclusive choices. Move between them with the arrow keys.', 'Give each direct `metro-radio` child a unique `value`. The group owns the current `value`, form `name`, and `change` event.'],
    radio: ['Add one named choice to a radio group or selector bar. Select another choice to see how the group updates.', 'Set a stable `value` on each child. Supply `label` or text content. Set `disabled` on an unavailable choice. Read selection from the parent.'],
    'combo-box': ['Choose a destination from a short list with the browser’s native select menu.', 'Add direct `metro-option` children. Set `name` on the box and `value` to an option key. Read the current `value` on `change`.'],
    option: ['Define a choice inside a list picker or combo box. Give it a stable key separate from its display text.', 'Set `value` on the option. Use text content or `label` for its name. Use `disabled` to keep an option visible but unavailable.'],
    'text-box': ['Collect a name with a visible label. Use a form to validate it before submission.', 'Set `label`, `name`, and `required` on the field. Read `value` on `input`. Use `multiline` and `rows` for longer text.'],
    'password-box': ['Collect a secret without displaying it. Press and hold the reveal control to check the entry.', 'Use `label` and `name` as on a text box. Add `reveal` and an accessible `reveal-label`. Read the `value` property; do not reflect the password into an attribute.'],
    'rich-edit-box': ['Format a note. Select some text, then choose Bold in the toolbar.', 'Read `value` for plain text or `runs` to keep formatting. Call `format("bold")` or `insertText(text)` from your own editing commands.'],
  },
  'numbers-and-ratings': {
    slider: ['Set the volume by dragging the thumb or using the arrow keys.', 'Set `min`, `max`, `step`, and the initial `value`. Listen to `input` for live updates and `change` for a committed value.'],
    'number-box': ['Enter a quantity or adjust it one step at a time. Press Enter to commit the edit.', 'Use `min`, `max`, and `step` to constrain the number. Add `spin-buttons` for step controls. The `value` property is null when the field is empty.'],
    rating: ['Rate an item with stars. Use half steps if whole stars are too coarse.', 'Set `max` for the number of stars and `step` to 1 or 0.5. The `value` property is 0 for an unrated item. Listen to `change` for a committed rating.'],
  },
  'date-and-time-selection': {
    'calendar-date-picker': ['Pick a deadline from a calendar dialog. Apply the date to commit it or press Escape to keep the old date.', 'Set `value`, `min`, and `max` to ISO dates. Use `showPicker()` to open the grid and `close()` to cancel. Read the committed `value` on `change`.'],
    'calendar-view': ['Display a month inline so the reader can compare dates before choosing one.', 'Set `value` to a YYYY-MM-DD string and `locale` for date labels. Call `showDate(date)` to display a month without changing the selection.'],
    'date-picker': ['Choose a meeting date with the native field or the phone-style picker.', 'Set `presentation="phone"` for the picker page. Use YYYY-MM-DD strings for `value`, `min`, and `max`. Read the confirmed date on `change`.'],
    'time-picker': ['Set a start time with separate hour and minute columns. Cancel to keep the previous time.', 'Use `presentation="phone"` and set `value` to a time such as 09:00. Set `step` in seconds. Pass translated column labels through the `pickerLabels` property.'],
  },
  'list-selection-and-recurring-days': {
    'list-picker': ['Choose one size from a named list. Put the display text on each option.', 'Add direct `metro-option` children with unique keys. Set `value` to the initial key. Read the picker’s `value` on `change`.'],
    'recurring-days-picker': ['Choose the days on which an alarm repeats. Apply the draft to save the selection.', 'Set the `selectedDays` property to weekday keys such as mon and fri. Use `locale` for day names and `apply-label` for the confirmation button. Read `selectedDays` on `change`.'],
  },
  color: {
    'color-picker': ['Choose an accent color for a theme. Open the picker to edit its value.', 'Set `value` to a hex color such as #0050ef. Set `label` for the control name. Read its current `value` on `change`.'],
  },
  'search-suggestions': {
    'auto-suggest-box': ['Type a city name to narrow the suggestions. Choose a result with the keyboard or pointer.', 'Listen for `metro-query`. Pass its `detail.queryId` and the matching `{ id, label }` records to `setSuggestions(queryId, items)` so stale results cannot replace a newer query.'],
  },
  'dialogs-and-flyout-menus': {
    dialog: ['Ask for confirmation in a modal dialog. Give each closing action its own result.', 'Set `trigger-label` for a built-in opener. Put action buttons in `slot="actions"` and set `data-metro-value` on each. Read `detail.value` on `metro-close`.'],
    flyout: ['Show supporting information next to the button that opens it.', 'Set `trigger-label` or call `show(anchor)`. Put the content in the default slot. Add `data-metro-close` to a button inside the flyout to dismiss it.'],
    'menu-flyout': ['Offer a short menu of actions for the current item. Open the menu and choose an action.', 'Set the `commands` property to an array of `{ id, label }` records. Use `trigger-label` or `show(anchor)` to open it. Read `detail.id` on `metro-command`.'],
    'context-menu': ['Attach actions to a particular record. Right-click the record or use Shift+F10.', 'Point `for` at the target’s id. Assign a `commands` array or replace it when the record changes. Read `detail.id` on `metro-command`.'],
    'drop-down-button': ['Offer several export formats behind one menu button.', 'Set `label` and assign `commands` as an array of `{ id, label }` objects. Call `show()` or use the trigger. Handle the selected `detail.id` on `metro-command`.'],
    'split-button': ['Send a document with the primary button. Use its adjacent menu for other actions.', 'Set `primary-command` to the default action id. Assign alternative actions to `commands`. Both surfaces emit `metro-command` with `detail.id`.'],
    tooltip: ['Add a short explanation to an existing focusable control. Hover or focus the control to read it.', 'Wrap one focusable child in the default slot. Set `text` to the description. Escape dismisses the tooltip without activating the child.'],
  },
  'command-bar-and-overlays': {
    'command-bar': ['Keep frequent actions in the primary row. Put less frequent actions in the overflow menu.', 'Use direct app-bar children or the `commands` property. Set `placement="secondary"` on a child to move it into overflow. Handle `metro-command` on the bar.'],
    'app-bar-button': ['Add a Save command to a command bar. Select the command to see its id.', 'Use a direct `metro-command-bar` parent. Set `command-id`, `label`, and `icon-name`. Read the command id from the bar’s `metro-command` event.'],
    'app-bar-toggle-button': ['Pin or unpin an item from the command bar. The same command represents both states.', 'Set `command-id`, `label`, and optionally `checked`. On the parent bar, read `detail.checked` and `detail.id` from `metro-command`.'],
    'app-bar-separator': ['Separate groups of commands in a command bar. Place the divider between Save and Pin.', 'Put the separator between command children of `metro-command-bar`. Set `placement="secondary"` to group commands in the overflow menu instead. The separator has no command id.'],
    'command-bar-flyout': ['Open a compact set of tools near the current selection instead of showing a permanent command bar.', 'Assign `{ id, label }` items to `commands`. Use `trigger-label` for the opener or call `show(anchor)`. Listen for `metro-command` to run the selected tool.'],
    popup: ['Show record details beside a button. Close the surface and return focus to the button.', 'Call `show(anchor)` and then `focusContent()` after `updateComplete` if the popup needs focus. Close with `close()` or a slotted `data-metro-close` button.'],
    'teaching-tip': ['Explain an unfamiliar control when the reader requests help. Keep the tip anchored to that control.', 'Call `show(anchor)` on the tip. Set `heading` and `dismiss-label`, and put the explanation in the default slot.'],
  },
  'progress-and-status': {
    'info-badge': ['Show the number of unread messages beside the inbox label.', 'Set `value` to the count and `max` to the display limit. Provide an accessible `label`. Omit `value` for a dot.'],
    'info-bar': ['Show a persistent warning above the content it affects. Let the reader dismiss it when appropriate.', 'Set `severity`, `heading`, and `message`. Add `dismissible` for a close button. Set the `open` property to true to show the bar again.'],
    'progress-bar': ['Show how much of a download has finished. Use a known total to give a meaningful percentage.', 'Set `min`, `max`, and `value` in the same units. If the total is unknown, use `indeterminate` instead. Set `label` to name the operation.'],
    'progress-ring': ['Mark an area that is loading when the amount of work remaining is unknown.', 'Set `active` while the operation runs. Set `size` to small or large and provide a `label` that describes the operation.'],
    'transfer-control': ['Display the state of a transfer. Try Cancel and Retry to see the state and available actions change.', 'Set `transfer-id`, `phase`, `transferred`, and `total`. Handle `metro-transfer-action` in your application. Its `detail.action` is cancel or retry; the application updates `phase`.'],
  },
  'expansion-and-scrolling': {
    expander: ['Keep additional content behind a short heading. Select the heading to reveal it.', 'Set `label` or use the label slot for the heading. Put the content in the default slot. Read `detail.open` from `metro-toggle`.'],
    'scroll-viewer': ['Constrain a long list to a scrollable area. Give rows stable keys if the list can refresh.', 'Limit the height in CSS. Set `label` and `orientation`. Use `data-metro-key` on rows with `getAnchor()` and `restoreAnchor(anchor)` to retain the reading position.'],
  },
  collections: {
    'list-box': ['Choose a district from a list of named rows. Use the keyboard to move between choices.', 'Give each direct `metro-list-item` a unique `value`. Set the box’s `value` to preselect a row. Read `detail.selectedValues` on `metro-selection-change`.'],
    'list-view': ['Show a list of contacts with a selectable row for each person.', 'Use `selection-mode="single"` for one selected key. Add `activatable` to distinguish opening a row (`metro-item-activate`) from selecting it (`metro-selection-change`).'],
    'list-item': ['Define one record inside a list or grid. Use a stable key even if the display text changes.', 'Set `value` for identity. Supply text in the default slot, or set `label`. Set `disabled` on unavailable rows. The parent manages selection.'],
    'grid-view': ['Lay out a collection of stations in a grid. Keep each station’s identity independent of its position.', 'Supply `metro-list-item` children or an `items` array. Set `columns` to a fixed number or 0 for automatic layout. Use `selection-mode` to enable selection.'],
    'long-list-selector': ['Browse a grouped directory. Select a group heading to jump directly to another group.', 'Use `metro-list-group` children with unique keys, or assign the `groups` array. Use `jumpToGroup(value)` to scroll to a group and `focusItem(value)` to focus a row.'],
    'list-group': ['Organize a long list by initial letter. Open a group heading to use the jump menu.', 'Place the group inside `metro-long-list-selector`. Give it a `value` and `label`, and put keyed `metro-list-item` children inside. Row keys must be unique across groups.'],
    'tree-view': ['Show folders and their contents as a tree. Use Left and Right to collapse and expand branches.', 'Nest keyed `metro-tree-item` children. Read `value` for the selected node and `expandedValues` for the open branches. Listen for `metro-selection-change` when a node is selected.'],
    'tree-item': ['Define a folder and nest another item inside it. Expand the folder to reveal its children.', 'Use `label` for the node name and `value` for a stable key. Add `expanded` to open a branch initially. Put the tree inside `metro-tree-view`.'],
    'items-view': ['Render selectable folders from data. Use a template to control the contents of each row.', 'Assign an `items` array with unique `value` keys. Bind fields with `data-metro-field` inside a direct template. Set `selection-mode` and `layout` on the view.'],
    'items-repeater': ['Render records with a shared row template without adding selection behavior.', 'Assign `keyFor` before assigning `items`. Bind fields with `data-metro-field` in a direct template. Call `getElement(key)` to get the rendered container.'],
    'semantic-zoom': ['Switch from a long list to its group overview. Select a group to return to its position in the list.', 'Place the scrollable content in `slot="detail"`. Assign `groups` with values that match `data-metro-key` anchors. Call `zoomToGroup(value)` to move to a group.'],
    'annotated-scroll-bar': ['Jump between named stops in a scrollable list. Select a mark to scroll to its row.', 'Use `for` to point at a scroll viewer id. Assign `annotations` with `value` keys matching `data-metro-key` on its rows. User jumps emit `metro-annotation-change`.'],
    'flip-view': ['Browse photos one at a time. Use the arrow buttons, keyboard, or a horizontal swipe.', 'Give direct children unique `data-value` keys. Set `value` to the current key. Listen for `metro-change` to update the gallery pager.'],
    'pips-pager': ['Show the current page in a gallery. Select a dot to move the gallery to that page.', 'Set `count` and the one-based `page`. Read `detail.page` on `metro-page-change`. Set `position-label` with {current} and {total} to name the buttons.'],
    'swipe-control': ['Reveal actions for one row by swiping it or opening the actions menu.', 'Set `value` to the row key. Assign `actions` with id, label, and side. Listen for `metro-swipe-action` when the user confirms an action.'],
    'refresh-container': ['Refresh the time shown in a list. Pull from its top edge or use the refresh button.', 'Listen for `metro-refresh`. Set `refreshing` while work is in progress, update the slotted content, then clear `refreshing`. Use `status` to announce the result.'],
    'reorder-list': ['Move a recording earlier or later in a queue. Use a drag handle or the keyboard.', 'Assign `items` with unique values. Listen for `metro-reorder` and apply `detail.values` to the application’s data. Escape cancels a keyboard move.'],
  },
  'transfer-and-shared-selection': {
    'collection-transfer': ['Move recordings between two queues. Use the transfer form or drag a row to the other list.', 'Give each `metro-reorder-list` an id and `transfer="move"`. Accept a valid move in `metro-before-transfer`. On `metro-transfer`, apply `detail.sourceValues` and `detail.targetValues` to the two lists.'],
    'cross-slide': ['Select a row with a short sideways gesture. The selection button offers the same action with the keyboard.', 'Set `value` to a stable row key and `select-label` to an accessible name. Listen for `metro-cross-slide-change` and apply `detail.selected` to your model and the `selected` property.'],
  },
  'tables-and-charts': {
    'table-view': ['Compare departure counts by route. Choose a sortable column heading to change the order.', 'Assign `columns` with key and label fields. Assign `rows` with id and cells keyed by column. Listen for `metro-sort-change` to store the current sort key and direction.'],
    chart: ['Compare trip counts across routes. Open the data table for exact values.', 'Set `type` to bar or line. Assign `categories` and `series` as properties. Key each series’ `values` object by category id; omit missing values instead of entering zero.'],
  },
  'pages-and-history': {
    frame: ['Navigate from a list to a note, then return to the same list with Back.', 'Give direct `metro-page` children unique values. Call `navigate(value)` to add a visit and `back()` to return. Read `visit` for the current entry.'],
    page: ['Define a destination inside a frame. Open the note to switch between the two pages.', 'Set `value` to a unique page key and `label` for its title. Use the default slot for the body, `title` for a custom heading, and `commands` for page actions.'],
  },
  'sections-and-breadcrumbs': {
    'selector-bar': ['Switch between related views such as All and Saved. Use the arrow keys to change the active view.', 'Use direct `metro-radio` children. Set `value` to the active option key and read the new `value` on `change`.'],
    'breadcrumb-bar': ['Show the path from a collection to the current record. Keep the last item as the current page.', 'Assign `items` in root-to-leaf order with `{ id, label, href? }` records. Set `label` to name the navigation. Handle `metro-breadcrumb` to route inside an application.'],
    'navigation-view': ['Move between sections with the same links in a wide sidebar or a compact menu.', 'Assign an `items` array with id, label, and href fields. Set `value` to the current section id. Cancel `metro-navigation` to handle navigation locally.'],
  },
  'panorama-and-hub': {
    panorama: ['Let readers browse a wide overview section by section. Swipe or use the keyboard to change sections.', 'Use direct `metro-hub-section` children with stable values. Set `heading` for the overview and `value` for the current section. Read `detail.value` on `metro-change`.'],
    hub: ['Group related content into labeled sections. Use the phone profile to browse them horizontally.', 'Add direct `metro-hub-section` children. Set `profile` to phone or desktop. Read `firstVisible` to find the leading visible section.'],
    'hub-section': ['Define one section of a hub or panorama. Put its preview content under a visible heading.', 'Set `value` and `label` on each direct child of the hub. Add `href` for a linked heading or `hero` for a featured section. Place the section body in the default slot.'],
    'lockable-pivot': ['Keep a user on the current panel while a task needs uninterrupted attention. Unlock it to return to normal navigation.', 'Use direct `metro-pivot-item` children. Set `locked` to hold the current `value`. Clear `locked` to enable adjacent tabs and swiping.'],
  },
  'document-tabs': {
    'tab-view': ['Keep separate documents open in tabs. Select another tab or close a finished document.', 'Set `value` to the active tab’s key. Use `metro-tab-view-item` children and the `empty` slot. Listen for `metro-before-tab-close` to protect unsaved work.'],
    'tab-view-item': ['Give a document its own selectable tab. Add a close control to documents the user can discard.', 'Use a direct `metro-tab-view` parent. Set `value` and `label`; add `closable` for a close button. Place the document in the default slot.'],
  },
  'adaptive-panes': {
    'list-details': ['Select a person in the list to open their details. Resize the view to use the compact Back action.', 'Use the `list`, `details`, and `empty` slots. Call `showDetails(value, source)` from the selecting control. Call `back()` to close details and return focus.'],
    'two-pane-view': ['Place related content side by side where space permits. Choose the most useful pane for narrow screens.', 'Use the `first` and `second` slots. Set `pane-priority` to select the pane shown in single mode. Read `mode` or listen for `metro-layout-change` to track layout.'],
    'split-view': ['Keep folders in a pane that can open over the message list. Press Escape to dismiss it.', 'Put the folder list in `slot="pane"` and messages in the default slot. Use `display-mode="overlay"` and call `showPane(source)` or `closePane()`.'],
  },
  icons: {
    icon: ['Pair a named icon with link text. For a standalone icon, give it an accessible name.', 'Set `name` to a registered icon name. Set `label` only when the icon conveys information on its own. Control size with `--metro-icon-size`.'],
    'animated-icon': ['Show a change of state by switching between two named icons. Activate the example button to see the transition.', 'Update `name` to change the glyph. Set `duration` in milliseconds. Update `label` when the meaning changes; reduced motion skips the animation.'],
  },
  'typography-and-layout': {
    'text-block': ['Set a visual hierarchy for short text. Choose the semantic heading level separately from its size.', 'Set `variant` for the type style and `level` for a heading. Add text in the default slot. Use `trim="ellipsis"` for a single truncated line.'],
    'rich-text-block': ['Display a paragraph with inline emphasis while retaining native document semantics.', 'Put paragraphs, headings, and links in the default slot. Set `--metro-prose-width` to limit the line length. Style the container with the `content` part.'],
    label: ['Style the native label of an input. Click the label to move focus to the matching field.', 'Wrap a native label in the default slot. Match its `for` to the input id. Set `--metro-label-size` or `--metro-label-color` to change its appearance.'],
    'stack-panel': ['Arrange a heading and control in a single column with consistent spacing.', 'Put content in the default slot. Set `orientation="horizontal"` for a row. Set `--metro-layout-gap` to adjust the distance between children.'],
    'wrap-panel': ['Lay out short labels in a row that wraps when available width runs out.', 'Use `orientation="horizontal"` to wrap to another line. For vertical wrapping, constrain the height. Set spacing with `--metro-layout-gap`.'],
    grid: ['Arrange a route card and map in responsive tracks without setting a width on each child.', 'Set `columns` and `rows` to track counts or CSS track lists. Use `--metro-grid-column` and `--metro-grid-row` on a child to place it explicitly.'],
    canvas: ['Position a station marker at a known location inside a diagram.', 'Set `--metro-canvas-height` on the canvas. Set `--metro-canvas-x`, `--metro-canvas-y`, and optionally `--metro-canvas-layer` on each positioned child.'],
    border: ['Frame related content as a route card. Set padding on the frame rather than on its children.', 'Place the contents in the default slot. Set `--metro-border-width`, `--metro-border-color`, and `--metro-border-padding` on the host.'],
    'content-presenter': ['Display the current route name as part of a larger card. Replace just that value when the selection changes.', 'Use the default slot for markup or assign text, a number, or a DOM node to the `content` property.'],
    'content-control': ['Give a route summary a header, a body, and an optional footer.', 'Use the `header` and `footer` slots for framing content. Put the body in the default slot or assign the `content` property. Set `--metro-content-padding` for spacing.'],
    shape: ['Mark a station in a diagram with a labeled shape. Leave purely decorative shapes unnamed.', 'Set `kind` to rectangle, ellipse, line, or polygon. Assign `points` for a polygon. Use `label` for a meaningful shape and `--metro-shape-fill` for its fill.'],
  },
  'media-maps-and-documents': {
    'media-player': ['Play an audio clip and seek to another position. Use the player controls to pause or mute it.', 'Set `kind="audio"` and `src`, or assign an array to `sources`. Call `play()` from a user action. Listen for `metro-media-state` to track playback.'],
    image: ['Display a photo with a description for readers who cannot see it.', 'Set `src` and `alt`. Supply `width` and `height` to reserve space. Use the `fallback` slot to show replacement content after a load error.'],
    'image-brush': ['Use a photo as a decorative backdrop for a caption. Put meaningful information in the caption.', 'Set `src` to the background image. Put foreground content in the default slot. Give the content a height when you need a larger background area.'],
    'person-picture': ['Show initials for a person when a portrait is unavailable.', 'Set `name` to derive initials, `initials` to override them, or `src` for a photo. Use the `badge` slot for an additional status marker.'],
    'multi-scale-image': ['Inspect a photo at different magnifications. Zoom in, then drag or use the arrow keys to pan.', 'Set `src`, `alt`, and `max-zoom`. Read `view` to save the zoom and offsets. Listen for `metro-image-view-change` after a user adjustment.'],
    'map-view': ['Mark a station on a coordinate grid. Select the marker or its list entry to read its name.', 'Set `latitude`, `longitude`, and `zoom`. Assign `markers` with id, label, latitude, and longitude. Listen for `metro-map-select`. Set `tileSource` only when you have a tile provider.'],
    'web-view': ['Embed a document inside an expandable section. Expand the example to load and inspect the illustration.', 'Set `src` and a descriptive `label` for the embedded frame. Use `history-enabled` if you need `navigate(url)` and `back()` within the view.'],
  },
  'files-speech-and-ink': {
    'file-picker': ['Select a local image and read its file name. The picker does not upload it.', 'Set `accept` for the file types and `multiple` for more than one file. Read `detail.files` from `metro-file-select`. Call `clear()` to reset the selection.'],
    'camera-capture': ['Take a photo or choose an existing image. Review the preview before confirming it.', 'Use `file-fallback` for devices without a camera. Set `facing-mode` to user or environment. Read `detail.file` on `metro-camera-capture`. Camera access requires permission and a secure context.'],
    'ink-canvas': ['Draw a note with a pen, mouse, or touch. Use Undo to remove the last stroke.', 'Set `draw-touch` to enable finger drawing. Read `strokes` on `metro-ink-change`. Use `serialize()` and `restore(json)` to save and restore the drawing.'],
    'speech-text-box': ['Dictate a note where speech recognition is available. The text field remains editable without a microphone.', 'Use `label` and read the `value` property as for a text box. Check `speechAvailable` before starting recognition from your own control. Use `cancelRecognition()` to discard a pending request.'],
    'share-button': ['Share a route through the system share sheet, or copy its text where sharing is unavailable.', 'Set `text`, `url`, or the `data` property. Add `copy-fallback` to offer a copy command. Listen for `metro-share-result` to learn the outcome.'],
    reminder: ['Present a reminder with Open, Snooze, and Dismiss actions. Choose one to see the requested action.', 'Set `reminder-id`, `heading`, and `message`. Handle `metro-reminder-action` using `detail.id` and `detail.action`. The application owns scheduling and persistence.'],
  },
  'tiles-and-notifications': {
    'live-tile': ['Show an unread count on the link to an inbox. Publish new content when the count changes.', 'Set `href` and `label`. Call `publish()` with an increasing version and fields such as front, count, and status. Omit fields to retain them; pass null to clear them.'],
    'hub-tile': ['Show a journal summary on a tile that alternates between front and back content.', 'Set `href` and `label`. Call `publish()` with a newer version and front and back records. Set `paused` to stop rotation.'],
    'status-bar': ['Display a compact status summary using values provided by your application.', 'Set `time`, `signal`, and `battery`. Set `network-label` and `battery-label` to describe the indicators. Omit values you do not have.'],
    'title-bar': ['Identify the current workspace above its content. Add contextual controls beside its title.', 'Set `heading`. Put custom content in the `start` and `actions` slots. Assign `windowAdapter` only for window operations your host supports.'],
    toast: ['Announce an update without interrupting the current task. Activate or dismiss the message.', 'Call `show(notification, source)` with at least id and title. Set `duration` in milliseconds; 0 keeps it open. Handle `metro-notification-activate` for the message action.'],
    'notification-center': ['Keep recent messages available after their toasts disappear. Open or dismiss a message, or clear the list.', 'Assign a new `notifications` array when records change. Handle `metro-notification-dismiss` and `metro-notifications-clear` to remove records from your data.'],
  },
  'motion-effects': {
    'navigation-transition': ['Animate the change from a list to a note and back. The frame still owns the navigation history.', 'Wrap `metro-frame` in the transition. Set `transition` to slide, fade, turnstile, turnstile-feather, connected, or none. Call the frame’s `navigate()` and `back()` methods.'],
    'slide-in-effect': ['Bring a changed label into view. Activate the button to replay the entrance.', 'Set `from` to start, end, top, or bottom. Use `distance` for the offset in CSS pixels. Call `play()` to run the effect or `cancel()` to stop it.'],
    'turnstile-feather-effect': ['Reveal a group of items in sequence. Activate the example button to replay the effect.', 'Use direct children or mark descendants with `data-metro-feather`. Set `stagger` for the delay between items. Call `play()` to start the animation.'],
    'tilt-effect': ['Give a button press visual feedback without replacing the button’s own click action.', 'Wrap a button or link in the default slot. Use `data-metro-tilt` for another interactive target or `data-metro-no-tilt` to exclude a region.'],
  },
  // These three foundational components have their original contracts in the README.
  'public-api': {
    pivot: ['Switch between peer sections by selecting a tab or swiping. Keep each section mounted when it is inactive.', 'Use direct `metro-pivot-item` children with unique values. Set `value` to select a panel. Listen for `metro-change` and read `detail.value` after user navigation.'],
    'pivot-item': ['Define a named panel in a pivot. Select a neighboring tab to switch the visible content.', 'Give each child a unique `value` and a `label` for the tab. Put the panel contents in the default slot. Set the active key on the parent pivot.'],
    tile: ['Make a prominent link to an application. Use a short label that describes its destination.', 'Set `href` for a native link and `label` for its accessible name. Place visible content in the default slot. Set `size` for the tile format.'],
  },
};

const guides = new Map<string, readonly [string, string, string]>(Object.entries(sections).flatMap(([section, entries]) =>
  Object.entries(entries).map(([name, guide]) => [`metro-${name}`, [...guide, section] as const] as const),
));
export function componentGuide(tag: string) {
  const guide = guides.get(tag);
  if (!guide) throw new Error(`No component guide for ${tag}`);
  return guide;
}

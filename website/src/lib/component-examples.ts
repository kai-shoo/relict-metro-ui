// Focused examples for elements that the release catalog demonstrates in full apps.
// Relative asset and link URLs use the same base as examples/catalog/samples.js.
export interface ComponentExample { title: string; html: string; script?: string }

const settings: ComponentExample = {
  title: 'Save preferences',
  html: `<form>
  <metro-text-box name="name" label="Display name" value="Alex" required></metro-text-box>
  <metro-checkbox name="digest" checked>Weekly digest</metro-checkbox>
  <metro-button type="submit">Save preferences</metro-button>
</form>
<output aria-live="polite"></output>`,
  script: `document.querySelector('form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  document.querySelector('output').value =
    data.get('name') + ': weekly digest ' + (data.has('digest') ? 'on' : 'off');
});`,
};
const frame: ComponentExample = {
  title: 'Open a note and return',
  html: `<metro-navigation-transition transition="slide">
  <metro-frame value="list">
    <metro-page value="list" label="Notes">
      <metro-button id="open-note">Open field note</metro-button>
    </metro-page>
    <metro-page value="note" label="Field note">
      <p>The footbridge is open.</p>
      <metro-button id="back">Back to notes</metro-button>
    </metro-page>
  </metro-frame>
</metro-navigation-transition>`,
  script: `const frame = document.querySelector('metro-frame');
document.querySelector('#open-note').onclick = () => frame.navigate('note');
document.querySelector('#back').onclick = () => frame.back();`,
};
function overview(name: 'hub' | 'panorama'): ComponentExample {
  return {
    title: 'Browse a music collection',
    html: `<metro-${name} ${name === 'hub' ? 'profile="phone" ' : ''}heading="Music" value="recent">
  <metro-hub-section value="recent" label="Recent" hero>
    <p>Recently added: Night Train</p>
  </metro-hub-section>
  <metro-hub-section value="artists" label="Artists">
    <p>River Quartet</p>
  </metro-hub-section>
</metro-${name}>`,
  };
}
const tabs: ComponentExample = {
  title: 'Switch documents',
  html: `<metro-tab-view label="Open documents" value="notes">
  <metro-tab-view-item value="notes" label="Field notes" closable>
    <p>The footbridge is open.</p>
  </metro-tab-view-item>
  <metro-tab-view-item value="map" label="Map key" closable>
    <p>Blue lines mark rivers.</p>
  </metro-tab-view-item>
  <p slot="empty">All documents are closed.</p>
</metro-tab-view>`,
};
const collection: ComponentExample = {
  title: 'Move a recording between queues',
  html: `<metro-collection-transfer label="Move recordings">
  <metro-reorder-list id="library" label="Library" transfer="move">
    <p slot="empty">No recordings in the library.</p>
  </metro-reorder-list>
  <metro-reorder-list id="queue" label="Play queue" transfer="move">
    <p slot="empty">The play queue is empty.</p>
  </metro-reorder-list>
</metro-collection-transfer>`,
  script: `const titles = { dawn: 'First light', lake: 'At the lake', dusk: 'Evening walk' };
function update(list, keys) {
  list.items = keys.map(value => ({ value, label: titles[value] }));
}
update(document.querySelector('#library'), ['dawn', 'lake']);
update(document.querySelector('#queue'), ['dusk']);
const transfer = document.querySelector('metro-collection-transfer');
transfer.addEventListener('metro-reorder', event => update(event.target, event.detail.values));
transfer.addEventListener('metro-before-transfer', ({ detail }) => detail.accept(true));
transfer.addEventListener('metro-transfer', ({ detail }) => {
  update(detail.source, detail.sourceValues);
  update(detail.target, detail.targetValues);
});`,
};
const notifications: ComponentExample = {
  title: 'Add a message to the activity log',
  html: `<metro-button id="announce">Add message</metro-button>
<metro-notification-center heading="Activity"></metro-notification-center>
<metro-toast duration="0"></metro-toast>
<output aria-live="polite"></output>`,
  script: `const center = document.querySelector('metro-notification-center');
const toast = document.querySelector('metro-toast');
const source = document.querySelector('#announce');
let serial = 0;
const message = () => ({ id: String(++serial), title: 'Field note ' + serial,
  destination: 'footbridge', message: 'The footbridge is open.' });
center.notifications = [message()];
source.onclick = () => {
  const record = message();
  center.notifications = [record, ...center.notifications];
  toast.show(record, source);
};
document.addEventListener('metro-notification-activate', ({ detail }) => {
  document.querySelector('output').value = detail.notification.title + ': ' + detail.notification.message;
  center.notifications = center.notifications.map(n => n.id === detail.id ? { ...n, read: true } : n);
});
center.addEventListener('metro-notification-dismiss', ({ detail }) => {
  center.notifications = center.notifications.filter(n => n.id !== detail.id);
});
center.addEventListener('metro-notifications-clear', () => { center.notifications = []; });`,
};
const textLayout: ComponentExample = {
  title: 'Arrange a settings panel',
  html: `<metro-stack-panel style="--metro-layout-gap: 1rem">
  <metro-text-block variant="title2" level="2">Reading preferences</metro-text-block>
  <metro-toggle-switch label="Show captions" checked></metro-toggle-switch>
</metro-stack-panel>`,
};

export const examples: Record<string, ComponentExample> = {
  button: settings, checkbox: settings, 'text-box': settings,
  frame, page: frame, 'navigation-transition': frame,
  hub: overview('hub'), 'hub-section': overview('hub'), panorama: overview('panorama'),
  'tab-view': tabs, 'tab-view-item': tabs,
  'collection-transfer': collection, 'reorder-list': collection,
  'notification-center': notifications, toast: notifications,
  'text-block': textLayout, 'stack-panel': textLayout, 'toggle-switch': textLayout,
  'breadcrumb-bar': {
    title: 'Trace a photo back to its collection',
    html: `<metro-breadcrumb-bar label="Photo location"></metro-breadcrumb-bar>`,
    script: `document.querySelector('metro-breadcrumb-bar').items = [
  { id: 'home', label: 'Start', href: '../start/' },
  { id: 'photos', label: 'Photos', href: '../photos/' },
  { id: 'coast', label: 'Coast' }
];`,
  },
  flyout: {
    title: 'Read delivery details',
    html: `<metro-flyout label="Delivery details" trigger-label="Delivery details">
  <p>Collect your parcel at the station after 09:00.</p>
  <button type="button" data-metro-close>Got it</button>
</metro-flyout>`,
  },
  'info-bar': {
    title: 'Show and dismiss a warning',
    html: `<metro-button>Show warning</metro-button>
<metro-info-bar severity="warning" heading="Offline" message="Changes are stored on this device." dismissible></metro-info-bar>`,
    script: `document.querySelector('metro-button').onclick = () => {
  document.querySelector('metro-info-bar').open = true;
};`,
  },
  'calendar-date-picker': {
    title: 'Set a deadline',
    html: `<metro-calendar-date-picker label="Due date" locale="en-GB" value="2026-11-19"
  min="2026-01-01" max="2027-12-31" apply-label="Apply" cancel-label="Cancel">
</metro-calendar-date-picker>`,
  },
  'file-picker': {
    title: 'Choose an attachment',
    html: `<metro-file-picker label="Attach an image" accept="image/*"></metro-file-picker>
<output aria-live="polite">No attachment selected.</output>`,
    script: `document.querySelector('metro-file-picker').addEventListener('metro-file-select', ({ detail }) => {
  document.querySelector('output').value = detail.files.map(file => file.name).join(', ');
});`,
  },
  'camera-capture': {
    title: 'Attach a photo to a note',
    html: `<metro-camera-capture label="Note photo" facing-mode="environment" file-fallback></metro-camera-capture>
<output aria-live="polite">No photo confirmed.</output>`,
    script: `document.querySelector('metro-camera-capture').addEventListener('metro-camera-capture', ({ detail }) => {
  document.querySelector('output').value = 'Selected photo: ' + detail.file.name;
});`,
  },
  'combo-box': {
    title: 'Choose a destination',
    html: `<metro-combo-box name="destination" label="Save to" value="local">
  <metro-option value="local">This device</metro-option>
  <metro-option value="cloud">Cloud folder</metro-option>
</metro-combo-box>`,
  },
  'transfer-control': {
    title: 'Cancel or retry a queued transfer',
    html: `<metro-transfer-control transfer-id="field-note" label="Field note" phase="queued"></metro-transfer-control>`,
    script: `const transfer = document.querySelector('metro-transfer-control');
transfer.addEventListener('metro-transfer-action', ({ detail }) => {
  transfer.phase = detail.action === 'cancel' ? 'cancelled' : 'queued';
});`,
  },
  'cross-slide': {
    title: 'Select a recording',
    html: `<metro-cross-slide value="dawn" select-label="Select First light">First light</metro-cross-slide>
<output aria-live="polite">Not selected</output>`,
    script: `document.querySelector('metro-cross-slide').addEventListener('metro-cross-slide-change', ({ detail }) => {
  document.querySelector('output').value = detail.selected ? 'Selected' : 'Not selected';
});`,
  },
  'date-picker': {
    title: 'Schedule a meeting',
    html: `<metro-date-picker presentation="phone" name="day" locale="en-GB" label="Meeting date"
  value="2026-11-19" min="2026-01-01" max="2027-12-31"
  dialog-label="Select a date" apply-label="Done" cancel-label="Cancel"></metro-date-picker>`,
  },
  dialog: {
    title: 'Confirm a choice',
    html: `<metro-dialog label="Archive note?" trigger-label="Review note">
  <p>Move the field note to the archive?</p>
  <button slot="actions" type="button" data-metro-value="keep">Keep note</button>
  <button slot="actions" type="button" data-metro-value="archive">Archive</button>
</metro-dialog>
<output aria-live="polite">Field note in inbox</output>`,
    script: `document.querySelector('metro-dialog').addEventListener('metro-close', ({ detail }) => {
  if (detail.value === 'archive') document.querySelector('output').value = 'Field note in archive';
});`,
  },
  'progress-bar': {
    title: 'Display a known transfer size',
    html: `<metro-progress-bar min="0" max="100" value="42" label="Attachments downloaded"></metro-progress-bar>
<p>42 of 100 attachments downloaded</p>`,
  },
  'multi-scale-image': {
    title: 'Inspect a coastal photograph',
    html: `<metro-multi-scale-image src="../photos/assets/coast.svg" alt="Lighthouse on the coast" max-zoom="5"></metro-multi-scale-image>`,
  },
  'navigation-view': {
    title: 'Switch workspace sections',
    html: `<metro-navigation-view label="Workspace" menu-label="Choose section" value="inbox">
  <p id="section" aria-live="polite">Inbox: two new messages</p>
</metro-navigation-view>`,
    script: `const nav = document.querySelector('metro-navigation-view');
nav.items = [{ id: 'inbox', label: 'Inbox', href: '#inbox' },
  { id: 'archive', label: 'Archive', href: '#archive' }];
nav.addEventListener('metro-navigation', event => {
  event.preventDefault();
  nav.value = event.detail.id;
  document.querySelector('#section').textContent =
    nav.value === 'inbox' ? 'Inbox: two new messages' : 'Archive: no messages';
  nav.closeMenu();
});`,
  },
  'info-badge': {
    title: 'Show an unread count',
    html: `<p>Inbox <metro-info-badge value="12" label="12 unread messages"></metro-info-badge></p>`,
  },
  'ink-canvas': {
    title: 'Annotate a field note',
    html: `<metro-ink-canvas label="Field sketch" draw-touch>
  <p slot="description">Sketch the path from the station to the footbridge.</p>
</metro-ink-canvas>`,
  },
  'list-details': {
    title: 'Inspect a contact',
    html: `<metro-list-details>
  <metro-button slot="list">Alex Morgan</metro-button>
  <p slot="empty">Choose a contact.</p>
  <p slot="details">Alex Morgan · Field office</p>
</metro-list-details>`,
    script: `const view = document.querySelector('metro-list-details');
const contact = view.querySelector('metro-button');
contact.onclick = () => view.showDetails('alex', contact);`,
  },
  'list-view': {
    title: 'Select a contact',
    html: `<metro-list-view label="Contacts" selection-mode="single" value="zoe">
  <metro-list-item value="zoe">Zoe</metro-list-item>
  <metro-list-item value="mira">Mira</metro-list-item>
</metro-list-view>`,
  },
  'media-player': {
    title: 'Play a short recording',
    html: `<metro-media-player label="First light" kind="audio"></metro-media-player>`,
    script: `import { sampleRecording } from '../media/sound.js';
const url = URL.createObjectURL(sampleRecording(8));
document.querySelector('metro-media-player').src = url;
window.addEventListener('pagehide', event => {
  if (!event.persisted) URL.revokeObjectURL(url);
});`,
  },
  'title-bar': {
    title: 'Identify the active workspace',
    html: `<metro-title-bar heading="Field notebook">
  <metro-icon slot="start" name="folder"></metro-icon>
  <span slot="actions">Read only</span>
</metro-title-bar>`,
  },
  'map-view': {
    title: 'Find a station',
    html: `<metro-map-view label="Transit stops" latitude="51.53" longitude="-0.12" zoom="13"></metro-map-view>
<output aria-live="polite">Choose a station.</output>`,
    script: `const map = document.querySelector('metro-map-view');
map.markers = [{ id: 'kings-cross', label: 'King’s Cross', latitude: 51.5308, longitude: -0.1238 }];
map.addEventListener('metro-map-select', ({ detail }) => {
  document.querySelector('output').value = detail.marker.label;
});`,
  },
  'menu-flyout': {
    title: 'Choose a sort order',
    html: `<metro-menu-flyout label="Sort order" trigger-label="Sort by"></metro-menu-flyout>
<output aria-live="polite">Sorted by name</output>`,
    script: `const menu = document.querySelector('metro-menu-flyout');
menu.commands = [{ id: 'name', label: 'Name' }, { id: 'date', label: 'Date' }];
menu.addEventListener('metro-command', ({ detail }) => {
  document.querySelector('output').value = 'Sorted by ' + detail.id;
});`,
  },
  'context-menu': {
    title: 'Review a report',
    html: `<button id="report" type="button" aria-haspopup="menu">Report</button>
<metro-context-menu for="report" label="Report actions"></metro-context-menu>
<output aria-live="polite">Ready for review</output>`,
    script: `const report = document.querySelector('#report');
const menu = document.querySelector('metro-context-menu');
menu.commands = [{ id: 'review', label: 'Mark reviewed' }, { id: 'reopen', label: 'Reopen' }];
report.onclick = () => menu.show(report);
menu.addEventListener('metro-command', ({ detail }) => {
  document.querySelector('output').value = detail.id === 'review' ? 'Reviewed' : 'Ready for review';
});`,
  },
  'refresh-container': {
    title: 'Refresh the local clock',
    html: `<metro-refresh-container label="Local clock">
  <p>Last reading: <time>not yet refreshed</time></p>
</metro-refresh-container>`,
    script: `const clock = document.querySelector('metro-refresh-container');
clock.addEventListener('metro-refresh', () => {
  const now = new Date();
  const reading = clock.querySelector('time');
  reading.dateTime = now.toISOString();
  reading.textContent = now.toLocaleTimeString();
  clock.status = 'Clock updated';
});`,
  },
  'number-box': {
    title: 'Set a passenger count',
    html: `<metro-number-box name="passengers" label="Passengers" min="1" max="8" step="1"
  value="2" spin-buttons increment-label="Add passenger" decrement-label="Remove passenger"></metro-number-box>`,
  },
  'radio-group': {
    title: 'Choose a notification frequency',
    html: `<metro-radio-group name="frequency" label="Notify me" value="daily">
  <metro-radio value="daily">Daily</metro-radio>
  <metro-radio value="weekly">Weekly</metro-radio>
</metro-radio-group>`,
  },
  slider: {
    title: 'Adjust playback volume',
    html: `<metro-slider name="volume" label="Volume" min="0" max="100" value="40" show-bounds></metro-slider>
<output>40%</output>`,
    script: `const volume = document.querySelector('metro-slider');
volume.addEventListener('input', () => { document.querySelector('output').value = volume.value + '%'; });`,
  },
  pivot: {
    title: 'Switch mail folders',
    html: `<metro-pivot label="Folders" value="inbox">
  <metro-pivot-item value="inbox" label="Inbox">Two new messages</metro-pivot-item>
  <metro-pivot-item value="archive" label="Archive">No archived messages</metro-pivot-item>
</metro-pivot>`,
  },
  'lockable-pivot': {
    title: 'Lock the current section',
    html: `<metro-checkbox>Lock this section</metro-checkbox>
<metro-lockable-pivot label="Archive" value="letters">
  <metro-pivot-item value="letters" label="Letters">Inbox letters</metro-pivot-item>
  <metro-pivot-item value="notes" label="Notes">Field notes</metro-pivot-item>
</metro-lockable-pivot>`,
    script: `const lock = document.querySelector('metro-checkbox');
lock.addEventListener('change', () => {
  document.querySelector('metro-lockable-pivot').locked = lock.checked;
});`,
  },
  'rich-edit-box': {
    title: 'Format a field note',
    html: `<metro-rich-edit-box label="Field note" value="The footbridge is open."></metro-rich-edit-box>`,
  },
  'speech-text-box': {
    title: 'Dictate or type a note',
    html: `<metro-speech-text-box label="Observation" placeholder="Describe the route"></metro-speech-text-box>`,
  },
  tile: {
    title: 'Launch the photo collection',
    html: `<metro-tile href="../photos/" label="Photos" size="medium">
  <metro-icon name="folder"></metro-icon>
</metro-tile>`,
  },
};

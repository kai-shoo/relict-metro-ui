import { MetroSelectionSet } from '../../dist/metro-ui.js';

const transfer = document.querySelector('#transfer');
const library = document.querySelector('#library');
const archive = document.querySelector('#archive');
const queue = document.querySelector('#queue');

const records = new Map([
  ['field-notes', { value: 'field-notes', label: 'Field notes' }],
  ['radio-archive', { value: 'radio-archive', label: 'Radio archive' }],
  ['evening-report', { value: 'evening-report', label: 'Evening report' }],
  ['night-signal', { value: 'night-signal', label: 'Night signal' }],
  ['remote-interview', { value: 'remote-interview', label: 'Remote interview' }],
  ['morning-bulletin', { value: 'morning-bulletin', label: 'Morning bulletin' }],
]);
const selection = new MetroSelectionSet([...records.values()]);
const rows = new Map();
let nextCopy = 0;
transfer.selection = selection;

function rowFor({ value, label }) {
  if (rows.has(value)) return rows.get(value);

  const row = document.createElement('metro-list-item');
  row.value = value;
  row.label = label;
  const slide = document.createElement('metro-cross-slide');
  slide.className = 'record-slide';
  slide.value = value;
  slide.selected = selection.has(value);
  slide.transferGesture = true;
  slide.addEventListener('metro-cross-slide-change', event => selection.toggle(value, event.detail.selected));
  const choice = document.createElement('label');
  choice.className = 'record-choice';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = selection.has(value);
  checkbox.setAttribute('aria-label', `Select ${label}`);
  checkbox.addEventListener('change', () => selection.toggle(value, checkbox.checked));
  choice.append(checkbox, label);
  slide.append(choice);
  row.append(slide);
  rows.set(value, row);
  return row;
}

function apply(updates, copies = []) {
  for (const { value, original } of copies) {
    records.set(value, { value, label: `${records.get(original).label} (copy)` });
  }
  const views = updates.filter(({ list, values }) => {
    const current = list.values;
    return current.length !== values.length || values.some((value, index) => current[index] !== value);
  }).map(({ list, values }) => ({ list, content: values.map(value => rowFor(records.get(value))) }));
  for (const { list, content } of views) list.replaceChildren(list.querySelector('[slot="empty"]'), ...content);
  if (copies.length) selection.setCatalog([...records.values()]);
}

selection.addEventListener('change', () => {
  for (const [value, row] of rows) {
    const selected = selection.has(value);
    row.querySelector('input').checked = selected;
    row.querySelector('metro-cross-slide').selected = selected;
  }
});

apply([
  { list: library, values: ['field-notes', 'radio-archive', 'evening-report'] },
  { list: archive, values: ['night-signal', 'remote-interview'] },
  { list: queue, values: ['morning-bulletin'] },
]);

const copyKey = () => `copy-${++nextCopy}`;

transfer.addEventListener('metro-before-transfer', event => {
  const { value, operation, target, accept } = event.detail;
  if (!records.has(value) || (operation === 'move' && target.values.includes(value))) {
    event.preventDefault();
    return;
  }
  accept(operation === 'copy' ? copyKey() : true);
});

transfer.addEventListener('metro-transfer', event => {
  const { source, target, value, targetValue, operation, sourceValues, targetValues } = event.detail;
  apply([{ list: source, values: sourceValues }, { list: target, values: targetValues }],
    operation === 'copy' ? [{ value: targetValue, original: value }] : []);
});

transfer.addEventListener('metro-before-transfer-batch', event => {
  const { items, operation, accept } = event.detail;
  if (items.some(item => !records.has(item.value))) {
    event.preventDefault();
    return;
  }
  accept(operation === 'copy' ? items.map(copyKey) : true);
});

transfer.addEventListener('metro-transfer-batch', event => {
  const { operation, items, targetKeys, updates } = event.detail;
  const copies = operation === 'copy' ? items.map((item, index) => ({ value: targetKeys[index], original: item.value })) : [];
  apply(updates, copies);
});

transfer.addEventListener('metro-reorder', event => {
  apply([{ list: event.target, values: event.detail.values }]);
});

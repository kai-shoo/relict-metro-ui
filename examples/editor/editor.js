import { MetroBackScope, MetroKeyboardScope } from '../../dist/metro-ui.js';

const frame = document.querySelector('metro-frame');
const editor = document.querySelector('metro-page[value="editor"]');
const bar = document.querySelector('#actions');
const picker = document.querySelector('#categories');
const confirm = document.querySelector('#confirm');
const documentPicker = document.querySelector('#note');
const text = document.querySelector('#text');
const selection = document.querySelector('#select');
const status = document.querySelector('#status');
const tips = document.querySelector('#tips');
const notes = new Map([
  ['north', { label: 'Северный маршрут', saved: 'Проверить карту.' }],
  ['garden', { label: 'Городской сад', saved: 'Проверить дату встречи.' }],
]);

const current = () => notes.get(documentPicker.value);
const draft = note => note.draft ?? note.saved;
const dirty = () => draft(current()) !== current().saved;
const save = () => {
  if (!dirty()) return;
  const note = current();
  note.saved = draft(note);
  status.textContent = `Сохранено · ${note.label}`;
  updateCommands();
};

const commands = [{
  id: 'save', label: 'Сохранить',
  keys: [{ key: 's', ctrl: true }, { key: 's', meta: true }],
  accessKey: 'S', allowInEditable: true, available: dirty, run: save,
}];
const availableCommands = () => commands.map(command => ({ ...command, disabled: !command.available() }));
const updateCommands = () => {
  bar.commands = availableCommands().map(({ id, label, disabled }) => ({
    id, label, disabled, placement: 'secondary',
  }));
};

const keyboard = new MetroKeyboardScope(editor, {
  commands: availableCommands,
  renderTips(labels) {
    tips.hidden = labels.length === 0;
    tips.replaceChildren(...labels.map(({ key, id }) => {
      const label = document.createElement('span');
      const hint = document.createElement('kbd');
      hint.textContent = key;
      label.append(hint, ' ', commands.find(command => command.id === id).label);
      return label;
    }));
  },
});
new MetroKeyboardScope(confirm, { exclusive: true, active: () => confirm.open, commands: () => [] });

const back = new MetroBackScope({
  mode() {
    if (selection.getAttribute('aria-pressed') !== 'true') return 'pass';
    selection.setAttribute('aria-pressed', 'false');
    selection.focus();
    return 'handled';
  },
  navigation() {
    if (!frame.canGoBack) return 'pass';
    if (dirty()) {
      showLayer(confirm);
      return 'blocked';
    }
    return frame.back() ? 'handled' : 'blocked';
  },
  host() {
    document.querySelector('#host-status').textContent = 'Список заметок открыт.';
    return 'handled';
  },
});

function showLayer(layer, anchor) {
  if (layer.open) return;
  keyboard.hideTips();
  layer.show(anchor);
  const leave = back.enterLayer(() => layer.close(), () => layer.open);
  const onClose = event => {
    if (event.target !== layer) return;
    layer.removeEventListener('metro-close', onClose);
    leave();
  };
  layer.addEventListener('metro-close', onClose);
}

document.querySelector('#open').addEventListener('click', () => frame.navigate('editor'));
document.querySelectorAll('[data-back]').forEach(button => {
  button.addEventListener('click', () => { void back.requestBack(); });
});
document.querySelector('#category').addEventListener('click', event => showLayer(picker, event.currentTarget));
selection.addEventListener('click', () => {
  selection.setAttribute('aria-pressed', String(selection.getAttribute('aria-pressed') !== 'true'));
});
bar.addEventListener('metro-command', event => {
  availableCommands().find(command => !command.disabled && command.id === event.detail.id)?.run();
});
confirm.addEventListener('metro-close', event => {
  if (event.target !== confirm || event.detail.value !== 'discard') return;
  delete current().draft;
  text.value = draft(current());
  updateCommands();
  frame.back();
});
documentPicker.addEventListener('change', () => {
  text.value = draft(current());
  status.textContent = '';
  updateCommands();
});
text.addEventListener('input', () => {
  current().draft = text.value;
  updateCommands();
});
text.value = draft(current());
updateCommands();

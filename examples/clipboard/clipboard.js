import '../../dist/metro-ui.js';

const notes = new Map([
  ['north', [{ text: 'Check the loading gate.', bold: true }, { text: '\nConfirm the marked delivery lanes.' }]],
  ['west', [{ text: 'Review the equipment register.', bold: true }, { text: '\nCheck the next stock count.' }]],
]);
const editor = document.querySelector('#editor');
const documentPicker = document.querySelector('#document');
const readOnly = document.querySelector('#read-only');

function openNote() {
  editor.documentKey = documentPicker.value;
  editor.runs = notes.get(documentPicker.value);
}

documentPicker.addEventListener('change', openNote);
readOnly.addEventListener('change', () => { editor.readOnly = readOnly.checked; });
editor.addEventListener('input', () => notes.set(editor.documentKey, editor.runs));
openNote();

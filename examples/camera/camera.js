import '../../dist/metro-ui.js';
import { getPhoto, photoURL, savePhoto } from './storage.js';

const frame = document.querySelector('#frame');
const destination = document.querySelector('#destination');
const camera = document.querySelector('#camera');
const attachment = document.querySelector('#attachment');
const photo = document.querySelector('#photo');
const download = document.querySelector('#download');
const edit = document.querySelector('#edit-photo');
const status = document.querySelector('#status');
const preview = document.querySelector('#edit-preview');
const rotate = document.querySelector('#rotate');
const save = document.querySelector('#save-copy');
const saved = document.querySelector('#saved-copy');
const message = document.querySelector('#edit-status');
const back = document.querySelector('#return');

let attachmentURL, previewURL, record, edited;
let captureRevision = 0, editorRevision = 0, busy = false;

function urlFor(id, context = destination.value) {
  const url = new URL(location.href);
  url.searchParams.set('context', context);
  if (id) url.searchParams.set('photo', id);
  else url.searchParams.delete('photo');
  return url;
}

function destinationName(key) {
  const option = Array.from(destination.querySelectorAll('metro-option')).find(option => option.value === key);
  return option?.label || option?.textContent?.trim() || key;
}

async function showAttachment() {
  const revision = ++captureRevision;
  const key = destination.value;
  attachment.hidden = true;
  status.textContent = '';
  photo.removeAttribute('src');
  download.removeAttribute('href');
  if (attachmentURL) URL.revokeObjectURL(attachmentURL);
  try {
    const entry = await getPhoto(key, true);
    if (!entry || revision !== captureRevision) return;
    attachmentURL = photoURL(entry);
    photo.src = attachmentURL;
    photo.alt = `Photo attached to ${destinationName(key)}`;
    download.href = attachmentURL;
    download.download = entry.name;
    edit.href = urlFor(entry.id, key);
    attachment.hidden = false;
    status.textContent = `${entry.name} attached to ${destinationName(key)}.`;
  } catch {
    if (revision === captureRevision) status.textContent = 'Could not read the photo library.';
  }
}

document.querySelector('#direct').addEventListener('change', event => { camera.direct = event.target.checked; });

destination.addEventListener('change', () => {
  camera.contextKey = destination.value;
  history.replaceState(history.state, '', urlFor(null));
  void showAttachment();
});

camera.addEventListener('metro-camera-capture', async event => {
  const { contextKey, file } = event.detail;
  if (contextKey !== destination.value) return;
  camera.inert = true;
  status.textContent = 'Saving photo…';
  try {
    await savePhoto(file, contextKey);
    if (contextKey === destination.value) await showAttachment();
  } catch {
    if (contextKey === destination.value) status.textContent = 'Could not save the photo. Check available storage and capture again.';
  } finally { camera.inert = false; }
});

function updateEditor() {
  rotate.disabled = !record || busy;
  save.disabled = !edited || busy;
}

function showPreview(url) {
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = url;
  if (url) preview.src = url;
  else preview.removeAttribute('src');
  preview.hidden = !url;
}

async function showLocation(restoreFocus = false) {
  const revision = ++editorRevision;
  const params = new URL(location.href).searchParams;
  const id = params.get('photo');
  const context = params.get('context');
  if (['inventory', 'inspection'].includes(context)) destination.value = context;
  camera.contextKey = destination.value;
  record = edited = undefined;
  busy = false;
  showPreview();
  updateEditor();
  saved.hidden = true;
  if (!id) {
    if (frame.value === 'editor' && !frame.back()) frame.navigate('capture', { replace: true });
    await showAttachment();
    if (restoreFocus && revision === editorRevision && !attachment.hidden) edit.focus({ preventScroll: true });
    return;
  }

  camera.cancel();
  if (frame.value !== 'editor') frame.navigate('editor', { replace: !history.state?.cameraEditor });
  back.href = urlFor(null);
  message.textContent = 'Loading photo…';
  try {
    const result = await getPhoto(id);
    if (revision !== editorRevision) return;
    if (!result) { message.textContent = 'This photo is no longer available.'; return; }
    showPreview(photoURL(result));
    await preview.decode();
    if (revision !== editorRevision) return;
    record = result;
    back.href = urlFor(null, record.context);
    message.textContent = record.name;
    updateEditor();
  } catch {
    if (revision !== editorRevision) return;
    showPreview();
    message.textContent = 'Could not open this photo.';
  }
}

rotate.addEventListener('click', async () => {
  if (!record || busy) return;
  const revision = editorRevision;
  busy = true;
  updateEditor();
  try {
    await preview.decode();
    if (revision !== editorRevision) return;
    const canvas = document.createElement('canvas');
    canvas.width = preview.naturalHeight;
    canvas.height = preview.naturalWidth;
    const graphics = canvas.getContext('2d');
    graphics.translate(canvas.width, 0);
    graphics.rotate(Math.PI / 2);
    graphics.drawImage(preview, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Encoding failed');
    if (revision !== editorRevision) return;
    edited = new File([blob], record.name.replace(/\.[^.]+$/, '') + '-copy.png', { type: 'image/png' });
    saved.hidden = true;
    showPreview(URL.createObjectURL(edited));
    message.textContent = 'Rotated. Ready to save a copy.';
  } catch {
    if (revision === editorRevision) message.textContent = 'Could not rotate this photo.';
  } finally {
    if (revision === editorRevision) { busy = false; updateEditor(); }
  }
});

save.addEventListener('click', async () => {
  if (!edited || busy) return;
  const revision = editorRevision;
  busy = true;
  updateEditor();
  try {
    const copy = await savePhoto(edited, record.context, record.id);
    if (revision !== editorRevision) return;
    saved.href = urlFor(copy.id, copy.context);
    saved.hidden = false;
    edited = undefined;
    message.textContent = `Saved ${copy.name}.`;
  } catch {
    if (revision === editorRevision) message.textContent = 'Could not save the copy. Check storage and try again.';
  } finally {
    if (revision === editorRevision) { busy = false; updateEditor(); }
  }
});

function ordinaryClick(event) {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

edit.addEventListener('click', event => {
  if (!ordinaryClick(event)) return;
  event.preventDefault();
  history.pushState({ cameraEditor: true }, '', edit.href);
  void showLocation();
});

back.addEventListener('click', event => {
  if (!ordinaryClick(event)) return;
  event.preventDefault();
  const handled = !window.dispatchEvent(new CustomEvent('metro-return-photo', {
    cancelable: true, detail: { id: new URL(location.href).searchParams.get('photo') },
  }));
  if (handled) return;
  if (history.state?.cameraEditor) history.back();
  else { history.replaceState(null, '', back.href); void showLocation(true); }
});

window.addEventListener('popstate', () => void showLocation(true));
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  if (attachmentURL) URL.revokeObjectURL(attachmentURL);
  if (previewURL) URL.revokeObjectURL(previewURL);
});
await frame.updateComplete;
void showLocation();

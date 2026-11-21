import { MetroActivationScope, MetroBackScope } from '../../dist/metro-ui.js';

const frame = document.querySelector('#frame');
const speech = document.querySelector('#phrase');
const form = document.querySelector('#search');
const status = document.querySelector('#command-status');
const retry = document.querySelector('#retry');
const matches = document.querySelector('#matches');
const results = document.querySelector('#results');
const matchesHeading = document.querySelector('#matches-heading');
const title = document.querySelector('#record-title');
const details = document.querySelector('#record-details');
const placeButtons = [...document.querySelectorAll('#places [data-place]')];
const places = new Map(placeButtons.map(button => [button.dataset.place, button.textContent.trim()]));
const baseURL = new URL(location.href);
let lookup = null;
let retryId = null;

speech.speechMessages = { results: 'Choose a phrase to run.', inserted: '' };
const speechActive = () => ['listening', 'processing', 'results'].includes(speech.speechStatus);

function recordURL(id) {
  const url = new URL(baseURL);
  if (id) url.searchParams.set('record', id);
  else url.searchParams.delete('record');
  return url;
}

const activation = new MetroActivationScope({
  async resolve(entry, signal) {
    if (entry.kind !== 'link' && entry.kind !== 'protocol') return null;
    const url = new URL(entry.destination.href, baseURL);
    const id = url.searchParams.get('record');
    if (url.origin !== baseURL.origin || url.pathname !== baseURL.pathname || !places.has(id)) return null;
    const response = await fetch('./records.json', { signal });
    if (!response.ok) throw new Error('Locations could not be loaded.');
    const records = await response.json();
    const record = records[id];
    return record && typeof record.title === 'string' && typeof record.description === 'string'
      ? { identity: id, route: 'record', params: id, state: record } : null;
  },
  current() { return frame.value === 'record' ? frame.visit?.params : null; },
  navigate(visit) { return frame.navigate(visit.route, { params: visit.params, state: visit.state }); },
});

function clearChoices() {
  matches.hidden = true;
  results.replaceChildren();
}

function cancelLookup() {
  if (!lookup) return false;
  lookup = null;
  activation.cancel();
  return true;
}

async function openPlace(id, kind = 'link') {
  if (speechActive()) speech.cancelRecognition();
  clearChoices();
  retry.hidden = true;
  retryId = null;
  const request = { id };
  lookup = request;
  status.textContent = 'Opening location…';
  try {
    const result = await activation.activate({ kind, destination: { href: recordURL(id).href } });
    if (lookup !== request) return;
    status.textContent = result === 'unavailable' ? 'This location is unavailable.' : '';
  } catch {
    if (lookup !== request) return;
    status.textContent = 'The location could not be opened.';
    retryId = id;
    retry.hidden = false;
  } finally {
    if (lookup === request) lookup = null;
  }
}

function runPhrase(text) {
  if (frame.value !== 'locations') return;
  cancelLookup();
  clearChoices();
  retry.hidden = true;
  retryId = null;
  const query = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/^open\b\s*/, '');
  const choices = query ? [...places].filter(([, name]) => name.toLowerCase().includes(query)) : [];
  if (choices.length === 1) {
    void openPlace(choices[0][0]);
    return;
  }
  if (!choices.length) {
    status.textContent = query ? 'No matching location. Try a different name or choose a destination.' : 'Enter a place name.';
    return;
  }
  status.textContent = '';
  matches.hidden = false;
  results.replaceChildren(...choices.map(([id, name]) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    button.addEventListener('click', () => {
      speech.focus({ preventScroll: true });
      void openPlace(id);
    });
    li.append(button);
    return li;
  }));
  matchesHeading.focus();
}

const back = new MetroBackScope({
  mode() {
    if (speechActive()) {
      speech.cancelRecognition();
      return 'handled';
    }
    if (!matches.hidden || cancelLookup()) {
      clearChoices();
      status.textContent = '';
      speech.focus({ preventScroll: true });
      return 'handled';
    }
    return 'pass';
  },
  navigation() { return frame.back() ? 'handled' : 'pass'; },
});

document.querySelector('#back').addEventListener('click', () => { void back.requestBack(); });
document.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  if (!event.repeat) void back.requestBack();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (speechActive()) speech.cancelRecognition();
  runPhrase(speech.value);
});
speech.addEventListener('metro-speech-recognized', event => {
  queueMicrotask(() => { if (!event.defaultPrevented) runPhrase(event.detail.text); });
});
for (const button of placeButtons) button.addEventListener('click', () => {
  button.focus({ preventScroll: true });
  void openPlace(button.dataset.place);
});
retry.addEventListener('click', () => { if (retryId) void openPlace(retryId); });

frame.addEventListener('metro-navigate', event => {
  if (speechActive()) speech.cancelRecognition();
  const visit = event.detail.to;
  if (visit.value === 'record') {
    title.textContent = visit.state.title;
    details.textContent = visit.state.description;
  }
  history.replaceState(null, '', recordURL(visit.value === 'record' ? visit.params : ''));
});

const activationId = baseURL.searchParams.get('record');
if (activationId) void openPlace(activationId, 'protocol');

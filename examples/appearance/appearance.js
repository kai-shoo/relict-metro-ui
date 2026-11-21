import '../../dist/metro-ui.js';

const scheme = document.querySelector('#scheme');
const captions = document.querySelector('#captions');
const form = document.querySelector('#brightness');
const slider = document.querySelector('#slider');
const exact = document.querySelector('#exact');
const preview = document.querySelector('#preview');
const discard = document.querySelector('#discard');
const status = document.querySelector('#status');
const retry = document.querySelector('#retry');
const key = 'metro-photo-appearance-v1';
let settings = { scheme: 'system', captions: true, brightness: 100 };
try {
  const stored = JSON.parse(localStorage.getItem(key));
  if (['system', 'light', 'dark'].includes(stored?.scheme)) settings.scheme = stored.scheme;
  if (typeof stored?.captions === 'boolean') settings.captions = stored.captions;
  if (Number.isInteger(stored?.brightness) && stored.brightness >= 25 && stored.brightness <= 175) settings.brightness = stored.brightness;
} catch { status.textContent = 'Не удалось прочитать настройки. Показаны исходные значения.'; }
let draft = settings.brightness;

function applyAppearance() {
  document.documentElement.style.setProperty('--metro-color-scheme', settings.scheme === 'system' ? 'light dark' : settings.scheme);
  document.querySelector('figcaption').hidden = !settings.captions;
  scheme.value = settings.scheme;
  captions.checked = settings.captions;
}

function writeSettings(next) {
  try {
    localStorage.setItem(key, JSON.stringify(next));
    settings = next;
    retry.hidden = true;
    return true;
  } catch {
    retry.hidden = false;
    status.textContent = 'Не удалось записать настройки. Можно повторить.';
    return false;
  }
}

function applyImmediate() {
  // Keep attempted values available after a storage error so Retry can persist them.
  settings = { ...settings, scheme: scheme.value, captions: captions.checked };
  applyAppearance();
  if (writeSettings(settings)) status.textContent = 'Оформление сохранено.';
}

function showBrightness(value) {
  draft = value;
  if (slider.value !== value) slider.value = value;
  if (exact.value !== value) exact.value = value;
  preview.style.filter = `brightness(${value}%)`;
}

function saveBrightness() {
  if (!form.reportValidity()) return;
  if (writeSettings({ ...settings, brightness: draft })) status.textContent = `Яркость сохранена: ${draft}%.`;
}

let retryOperation;
scheme.addEventListener('change', () => { retryOperation = applyImmediate; applyImmediate(); });
captions.addEventListener('change', () => { retryOperation = applyImmediate; applyImmediate(); });
slider.addEventListener('input', () => showBrightness(slider.value));
exact.addEventListener('change', () => showBrightness(exact.value));
form.addEventListener('submit', event => { event.preventDefault(); retryOperation = saveBrightness; saveBrightness(); });
retry.addEventListener('click', () => retryOperation?.());
discard.addEventListener('click', () => {
  exact.value = settings.brightness; // Replace even an invalid, uncommitted text draft.
  showBrightness(settings.brightness);
  if (retryOperation === saveBrightness) retry.hidden = true;
  status.textContent = 'Сохранённая яркость восстановлена.';
});
applyAppearance();
showBrightness(draft);

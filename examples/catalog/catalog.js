import { samples } from './samples.js';
import { applications } from './applications.js';

const tags = new Map();
for (const sample of samples) {
  for (const match of sample.html.matchAll(/<(metro-[\w-]+)\b/g)) tags.set(match[1], { sample });
}
for (const [file, names] of Object.entries(applications)) {
  for (const tag of names) tags.set(tag, { file });
}

const trigger = document.querySelector('#tag');
const tagName = document.querySelector('#tag-name');
const dialog = document.querySelector('#tag-dialog');
const list = document.querySelector('#tag-list');
const title = document.querySelector('#title');
const stage = document.querySelector('#stage');
const source = document.querySelector('#source');
const sourceLabel = source.querySelector('summary');
const code = document.querySelector('#code');
const application = document.querySelector('#application');
const names = [...tags.keys()].sort();
const groups = new Map();
for (const value of names) {
  const label = value.slice('metro-'.length);
  const letter = label[0].toUpperCase();
  if (!groups.has(letter)) groups.set(letter, { value: letter, label: letter, items: [] });
  groups.get(letter).items.push({ value, label });
}
await customElements.whenDefined('metro-long-list-selector');
list.groups = [...groups.values()];

function sizeTagRows() {
  if (!dialog.open) return;
  const fontSize = Number.parseFloat(getComputedStyle(list).fontSize);
  const lines = dialog.clientWidth < 14 * fontSize ? 3 : 1;
  const height = Math.max(44, Math.ceil(fontSize * 1.2 * lines));
  if (height === list.itemHeight) return;
  list.itemHeight = height;
  list.style.setProperty('--tag-row-height', `${height}px`);
}

new ResizeObserver(sizeTagRows).observe(dialog);
trigger.addEventListener('click', async () => {
  dialog.showModal();
  trigger.setAttribute('aria-expanded', 'true');
  sizeTagRows();
  await list.updateComplete;
  if (dialog.open) list.focusItem(trigger.value);
});
dialog.addEventListener('close', () => {
  trigger.setAttribute('aria-expanded', 'false');
});

function showSample(sample) {
  const demo = document.createElement('div');
  demo.id = 'demo';
  // All markup comes from the examples bundled alongside this module.
  demo.innerHTML = sample.html;
  stage.replaceChildren(demo);
  sample.setup?.(demo);
  const setup = sample.setup ? '\n' + sample.setup.toString().replace(/^setup\(/, 'function setup(') +
    "\nsetup(document.querySelector('#demo'));" : '';
  code.textContent = `<div id="demo">\n${sample.html}\n</div>\n<script type="module">\nimport './metro-ui.js';${setup}\n</script>`;
}

function showTitle(text) {
  title.textContent = text;
  if (text.includes('\u00ad')) title.setAttribute('aria-label', text.replaceAll('\u00ad', ''));
  else title.removeAttribute('aria-label');
}

let generation = 0;
async function render(requested = new URL(location.href).searchParams.get('tag')) {
  const current = ++generation;
  const name = tags.has(requested) ? requested : 'metro-pivot';
  const { sample, file } = tags.get(name);
  trigger.value = name;
  list.currentItem = name;
  tagName.textContent = name.slice('metro-'.length);
  document.querySelector('#module').textContent = `import 'relict-metro-ui/${name.slice(6)}';`;
  application.hidden = true;
  application.removeAttribute('href');
  source.open = false;
  sourceLabel.textContent = sample ? 'Код примера' : 'Разметка компонента';
  code.textContent = '';
  stage.replaceChildren();
  if (sample) {
    showTitle(sample.title);
    showSample(sample);
    return;
  }

  application.href = file;
  application.hidden = false;
  showTitle(tagName.textContent);
  try {
    const response = await fetch(file);
    if (!response.ok) throw new Error(String(response.status));
    const markup = await response.text();
    if (current !== generation) return;
    // Template content is inert, including custom elements, images and scripts.
    const template = document.createElement('template');
    template.innerHTML = markup;
    const element = template.content.querySelector(name);
    if (!element) sourceLabel.textContent = 'HTML примера';
    const exampleTitle = template.content.querySelector('title')?.textContent;
    if (exampleTitle) showTitle(exampleTitle);
    code.textContent = element?.outerHTML || markup;
    source.open = true;
  } catch {
    if (current === generation) stage.textContent = 'Не удалось загрузить разметку. Пример можно открыть по ссылке.';
  }
}

list.addEventListener('metro-item-activate', event => {
  const chosen = event.detail.value;
  if (!tags.has(chosen)) return;
  if (dialog.open) dialog.close();
  if (chosen === trigger.value) return;
  const url = new URL(location.href);
  url.searchParams.set('tag', chosen);
  if (url.href !== location.href) {
    try {
      history.pushState(null, '', url);
    } catch (error) {
      // Browsers may limit how often a document can update its history.
      if (error.name !== 'SecurityError') throw error;
    }
  }
  void render(chosen);
});
window.addEventListener('popstate', () => {
  if (dialog.open) dialog.close();
  void render();
});
void render();
trigger.disabled = false;

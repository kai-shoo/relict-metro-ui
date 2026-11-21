import { cp, mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { basePath } from '../site.config.mjs';

const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve('relict-metro-ui/package.json'));
const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const translations = JSON.parse(await readFile(new URL('../content/example-translations.json', import.meta.url), 'utf8'));
const phrasePattern = /[А-Яа-яЁё]+(?:[ \t\u00a0\u00ad]+[А-Яа-яЁё]+)*/g;

function translate(text) {
  if (/[А-Яа-яЁё]/.test(text)) text = text.replace(/&shy;|\u00ad|\\u00ad/g, '');
  return text.replace(phrasePattern, (phrase) => {
    if (!(phrase in translations)) throw new Error(`Missing English example text: ${phrase}`);
    return translations[phrase];
  });
}

function localize(text) {
  return translate(text)
    .replace(/(["'])ru(?:-RU)?\1/g, '$1en-US$1')
    .replace(/lang="en-US"/g, 'lang="en"')
    .replace(/(["'`])\/(examples|dist)\//g, `$1${basePath}/$2/`);
}

function javascript(source) {
  const changes = [];
  const tree = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  function visit(node) {
    if (node.type === 'Literal' && typeof node.value === 'string') {
      let value = node.value === 'ru' || node.value === 'ru-RU' ? 'en-US' : localize(node.value);
      if (/^\/(examples|dist)\//.test(value)) value = `${basePath}${value}`;
      if (value !== node.value) changes.push({ start: node.start, end: node.end, text: JSON.stringify(value) });
    } else if (node.type === 'TemplateElement') {
      const value = localize(node.value.raw);
      if (value !== node.value.raw) changes.push({ start: node.start, end: node.end, text: value });
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach((child) => { if (child?.type) visit(child); });
      else if (value?.type) visit(value);
    }
  }
  visit(tree);
  for (const change of changes.sort((a, b) => b.start - a.start)) {
    source = source.slice(0, change.start) + change.text + source.slice(change.end);
  }
  // Catch accidental syntax changes in translated template content at build time.
  parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  return source;
}

async function localizeDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await localizeDirectory(path);
    else if (/\.(html|js|json|webmanifest|md|svg)$/.test(path)) {
      const source = await readFile(path, 'utf8');
      const localized = path.endsWith('.md')
        ? await readFile(new URL(`../../examples/${relative(resolve(publicRoot, 'examples'), path)}`, import.meta.url), 'utf8')
        : path.endsWith('.js') ? javascript(source) : localize(source);
      if (/\.(json|webmanifest)$/.test(path)) JSON.parse(localized);
      await writeFile(path, localized);
    }
  }
}

// Examples and their browser bundle always come from the installed npm release.
await mkdir(publicRoot, { recursive: true });
for (const directory of ['examples', 'dist']) {
  await rm(resolve(publicRoot, directory), { recursive: true, force: true });
  await cp(resolve(packageRoot, directory), resolve(publicRoot, directory), { recursive: true });
}
await localizeDirectory(resolve(publicRoot, 'examples'));

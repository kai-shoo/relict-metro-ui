import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicDir } from 'astro:config/server';
import { examples, type ComponentExample } from './component-examples';
import { withBase } from './paths';

// sync-examples.mjs creates these English modules from the installed package
// before dev/build. Load them in Node so sample.setup retains its source text.
const require = createRequire(import.meta.url);
const catalog = fileURLToPath(new URL('examples/catalog/', publicDir));
type Sample = { title: string; html: string; setup?: (root: HTMLElement) => void };
const { samples }: { samples: Sample[] } = require(resolve(catalog, 'samples.js'));
const { applications }: { applications: Record<string, string[]> } = require(resolve(catalog, 'applications.js'));
const tagNames = (html: string) => [...new Set(Array.from(html.matchAll(/<(metro-[\w-]+)\b/g), match => match[1]))];

const byTag = new Map<string, ComponentExample>();
for (const sample of samples) {
  // The iframe uses catalog.css. Leave presentation-only button CSS out of the snippet.
  const html = sample.html.replace(/^<style>[\s\S]*?<\/style>\s*/, '').replaceAll(' class="demo-action"', '');
  const script = sample.setup && `function ${sample.setup.toString()}\nsetup(document.querySelector('#demo'));`;
  for (const tag of tagNames(html)) if (!byTag.has(tag)) byTag.set(tag, { title: sample.title, html, script });
}
for (const [name, sample] of Object.entries(examples)) byTag.set(`metro-${name}`, sample);

export function componentExample(tag: string, site: URL) {
  const sample = byTag.get(tag);
  if (!sample || !tagNames(sample.html).includes(tag)) throw new Error(`Missing rendered example for ${tag}`);
  const { html, script } = sample;
  const previewBase = withBase('/examples/catalog/');
  const publicBase = new URL(previewBase, site);
  // Make catalog links and assets work both in the preview and in a copied snippet.
  function assetUrls(text: string, published: boolean) {
    return text.replace(/(["'])(\.\.\/[\w./-]+)\1/g, (_, quote, path) => {
      const url = new URL(path, publicBase);
      return quote + (published ? url.href : url.pathname) + quote;
    });
  }
  const imports = tagNames(html).map(name => `import 'relict-metro-ui/${name.slice(6)}';`).join('\n');
  function snippet(published: boolean) {
    const js = published ? imports : `import '${withBase('/dist/metro-ui.js')}';`;
    return `<div id="demo">\n${assetUrls(html, published)}\n</div>\n\n<script type="module">\n${js}${script ? '\n\n' + assetUrls(script, published) : ''}\n</script>`;
  }
  const app = Object.entries(applications).find(([, names]) => names.includes(tag))?.[0];
  const srcdoc = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="${previewBase}catalog.css">
<style>body{margin:0;padding:.75rem}form{display:grid;gap:.75rem}button,input{font:inherit}</style>
</head><body>${snippet(false)}</body></html>`;
  return { title: sample.title, code: snippet(true), srcdoc, app: app && new URL(app, publicBase).pathname };
}

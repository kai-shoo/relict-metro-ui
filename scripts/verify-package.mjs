import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const packageName = 'relict-metro-ui';
const examples = [
  'mail', 'start', 'controls', 'workspace', 'media', 'editor', 'camera', 'collections', 'drafts', 'photos',
  'map', 'launch', 'keyboard', 'notifications', 'navigation', 'music', 'clipboard', 'annotations', 'imports',
  'appearance', 'catalog', 'phone-hub', 'refresh', 'form', 'speech', 'offline',
];
const examplePages = [
  ...examples.map(example => `examples/${example}/index.html`),
  'examples/workspace/detached.html',
  'examples/phone-hub/desktop.html',
  'examples/collections/selection.html',
];
const nonElementExports = new Set(['./browser', './package.json', './shell-host', './input-scope', './form-viewport']);
const npmLocation = process.env.npm_execpath;
const npm = (args, cwd, stdio) => execFileSync(
  npmLocation ? process.execPath : 'npm',
  npmLocation ? [npmLocation, ...args] : args,
  { cwd, encoding: 'utf8', stdio },
);
const workspace = await mkdtemp(join(tmpdir(), 'metro-package-'));

let browser;
let server;
try {
  const report = JSON.parse(npm(['pack', '--ignore-scripts', '--json', '--pack-destination', workspace], root));
  const pack = Array.isArray(report) ? report[0] : report[packageName];
  assert(pack, `npm pack did not report ${packageName}`);
  assert.equal(pack.name, packageName);
  const files = new Set(pack.files.map(({ path }) => path));
  assert(files.has('dist/metro-ui.js'), 'Run npm run build before verifying the archive');
  assert(files.has('package.json'));
  assert(files.has('README.md'));
  assert(files.has('LICENSE'), 'Missing MIT license');
  assert(files.has('docs/api.md'), 'Missing component API reference');
  assert(files.has('docs/implementation.md'), 'Missing implementation overview');
  for (const spec of ['foundations', 'components', 'flows', 'silverlight-controls', 'metro-icons']) {
    assert(files.has(`docs/${spec}.md`), `Missing linked design reference ${spec}`);
  }
  for (const pathname of examplePages) {
    assert(files.has(pathname), `Missing copyable example ${pathname}`);
  }
  console.log(`Inspecting ${pack.filename} (${files.size} files)`);

  await cp(join(root, 'tests/consumers'), workspace, { recursive: true });
  await cp(join(workspace, 'fixture-package.json'), join(workspace, 'package.json'));
  npm(['install', '--no-audit', '--no-fund', '--no-package-lock', '--ignore-scripts', `./${pack.filename}`], workspace, 'inherit');

  const installed = join(workspace, 'node_modules', packageName);
  const manifest = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  assert.equal(manifest.version, pack.version);
  assert.equal(manifest.license, 'MIT');
  async function loadsBrowserModule(path, visited) {
    assert(files.has(path), `Missing example module ${path}`);
    if (path === 'dist/metro-ui.js') return true;
    if (visited.has(path)) return false;
    visited.add(path);
    const script = await readFile(join(installed, path), 'utf8');
    const imports = script.matchAll(/\b(?:import|export)\s*(?:[^'";()]*?\s+from\s*)?['"]((?:\.\.?\/)[^'"]+\.m?js)['"]/g);
    let usesBundle = false;
    for (const [, dependency] of imports) {
      const target = posix.join(posix.dirname(path), dependency);
      if (await loadsBrowserModule(target, visited)) usesBundle = true;
    }
    return usesBundle;
  }

  for (const pathname of examplePages) {
    const directory = posix.dirname(pathname);
    const html = await readFile(join(installed, pathname), 'utf8');
    const visited = new Set();
    let usesBrowserModule = false;
    for (const [, asset] of html.matchAll(/\b(?:src|href)=["'](\.[^"']+\.(?:js|css|json|svg|webmanifest))["']/g)) {
      const path = posix.join(directory, asset);
      assert(files.has(path), `Missing example asset ${path}`);
      if (asset.endsWith('.js') && await loadsBrowserModule(path, visited)) usesBrowserModule = true;
    }
    assert(usesBrowserModule, `${pathname} must load the package's browser module`);
  }
  for (const [subpath, entry] of Object.entries(manifest.exports)) {
    const targets = typeof entry === 'string' ? [entry] : Object.values(entry);
    for (const target of targets) {
      if (typeof target === 'string') {
        assert(files.has(target.replace(/^\.\//, '')), `Missing archived file ${target} for ${subpath}`);
      }
    }
  }

  execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--project', 'tsconfig.json'], {
    cwd: workspace,
    stdio: 'inherit',
  });

  const requireFromConsumer = createRequire(join(workspace, 'package.json'));
  const { build } = requireFromConsumer('esbuild');
  await build({
    absWorkingDir: workspace,
    entryPoints: ['react.tsx', 'vue.ts'],
    outdir: 'bundled',
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  });
  const elementImports = await bundleElementImports(build, manifest);

  const routes = new Map([
    ['/html/', ['text/html', join(workspace, 'html.html')]],
    ['/html/metro-ui.js', ['text/javascript', join(installed, 'dist/metro-ui.js')]],
    ['/react/', ['text/html', join(workspace, 'react.html')]],
    ['/vue/', ['text/html', join(workspace, 'vue.html')]],
    ['/bundled/react.js', ['text/javascript', join(workspace, 'bundled/react.js')]],
    ['/bundled/vue.js', ['text/javascript', join(workspace, 'bundled/vue.js')]],
    ['/dist/metro-ui.js', ['text/javascript', join(installed, 'dist/metro-ui.js')]],
    ['/dist/shell-host.js', ['text/javascript', join(installed, 'dist/shell-host.js')]],
    ['/elements/', ['text/html', join(workspace, 'element-imports.html')]],
  ]);
  for (const { filename } of elementImports) {
    routes.set(`/${filename}`, ['text/javascript', join(workspace, filename)]);
  }
  const exampleMediaTypes = new Map([
    ['.html', 'text/html'], ['.css', 'text/css'], ['.js', 'text/javascript'],
    ['.svg', 'image/svg+xml'], ['.json', 'application/json'], ['.webmanifest', 'application/manifest+json'], ['.txt', 'text/plain'],
  ]);
  for (const pathname of files) {
    const mime = exampleMediaTypes.get(posix.extname(pathname));
    if (!pathname.startsWith('examples/') || !mime) continue;
    const route = [mime, join(installed, pathname)];
    routes.set(`/${pathname}`, route);
    if (pathname.endsWith('/index.html')) routes.set(`/${posix.dirname(pathname)}/`, route);
  }
  const endpoint = pathToFileURL(join(installed, 'examples/drafts/server-endpoint.mjs'));
  const { handleDraftsRequest } = await import(endpoint.href);
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (await handleDraftsRequest(request, response, url)) return;
      const route = routes.get(url.pathname);
      if (!route) {
        response.writeHead(url.pathname === '/favicon.ico' ? 204 : 404).end();
        return;
      }
      const [type, filename] = route;
      const content = await readFile(filename);
      response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }).end(content);
    } catch {
      response.writeHead(500).end();
    }
  });
  await new Promise((listen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', listen);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const receiptKey = '00000000000000000000000000000000.probe:1';
  const receiptURL = `${baseUrl}/examples/drafts/api/submissions/${encodeURIComponent(receiptKey)}`;
  const submit = await fetch(receiptURL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': receiptKey },
    body: JSON.stringify({ id: 'probe', version: 1, summary: 'Check packed assets', notes: '', due: '', file: null }),
  });
  assert.equal(submit.status, 201, 'The draft example endpoint did not accept the archived sample');
  assert.deepEqual(await (await fetch(receiptURL)).json(), await submit.json(), 'The archived endpoint lost a receipt');
  console.log('drafts example: the archived endpoint accepted a revision and returned the same receipt');

  browser = await chromium.launch({ executablePath: process.env.METRO_CHROMIUM_PATH || undefined });
  console.log(`Chromium ${browser.version()}`);
  const allTags = elementImports.map(({ tag }) => tag);
  for (const name of ['html', 'react', 'vue']) {
    const tags = name === 'html' ? allTags : ['metro-pivot', 'metro-pivot-item', 'metro-command-bar', 'metro-tile'];
    await checkConsumer(name, baseUrl, browser, tags);
  }
  await checkElementImports(baseUrl, browser, elementImports, allTags);
  const probes = [
    ['catalog', () => document.querySelector('#tag-list')?.groups?.flatMap(group => group.items).length === 119 &&
      document.querySelector('#code')?.textContent.includes('<metro-pivot'), 'loaded the catalog and markup for Pivot'],
    ['appearance', () => !!document.querySelector('#preview')?.naturalWidth, 'loaded the image used by the brightness control'],
    ['phone-hub', () => !!document.querySelector('metro-hub')?.firstVisible, 'resolved the visible section for the command bar'],
    ['refresh', () => document.querySelector('#groups [data-metro-key="101"]')?.textContent.includes('Entrance lighting'),
      'loaded and rendered the archived Entrance lighting request'],
    ['media', () => document.querySelector('metro-media-player')?.state.duration === 8, 'decoded the packaged sample'],
    ['photos', () => Array.from(document.querySelectorAll('.feed img')).some(img => img.naturalWidth > 0),
      'loaded a packaged image'],
    ['notifications', async () => !!(await navigator.serviceWorker.getRegistration())?.active,
      'activated the packaged service worker with its shell-host import'],
    ['drafts', async () => !!(await navigator.serviceWorker.getRegistration())?.active,
      'registered the worker that caches the packaged draft editor'],
    ['imports', async () => !!(await navigator.serviceWorker.getRegistration())?.active,
      'activated the packaged share target worker'],
    ['navigation', () => !!document.querySelector('metro-navigation-view')?.shadowRoot.querySelector('[aria-current="page"]'),
      'selected the current route in the installed module'],
    ['music', () => document.querySelector('metro-frame')?.page?.value === 'home',
      'composed the packaged player and navigation shell'],
  ];
  await Promise.all(probes.map(async ([name, ready, description]) => {
    const demo = await browser.newPage({ viewport: { width: 420, height: 740 } });
    try {
      const response = await demo.goto(`${baseUrl}/examples/${name}/`);
      assert(response?.ok(), `The packaged ${name} example did not load`);
      await demo.waitForFunction(ready, undefined, { timeout: 6500 });
      console.log(`${name} example: ${description}`);
    } finally {
      await demo.close();
    }
  }));
} finally {
  await browser?.close();
  if (server?.listening) await new Promise((close) => server.close(close));
  await rm(workspace, { recursive: true, force: true });
}

async function bundleElementImports(build, manifest) {
  const entries = Object.entries(manifest.exports)
    .filter(([subpath]) => subpath.startsWith('./') && !nonElementExports.has(subpath))
    .map(([subpath, target]) => ({
      name: subpath.slice(2),
      tag: `metro-${subpath.slice(2)}`,
      module: posix.join('node_modules', packageName, target.import),
      source: `element-imports/${subpath.slice(2)}.js`,
      filename: `element-bundles/${subpath.slice(2)}.js`,
    }));
  const moduleTags = new Map(entries.map(({ module, tag }) => [module, tag]));
  const forbidden = new Set(['.', './browser'].map(subpath =>
    posix.join('node_modules', packageName, manifest.exports[subpath].import)));
  const dependencyChecks = {
    pivot: ['metro-pivot-item'],
    'command-bar': ['metro-app-bar-button', 'metro-app-bar-toggle-button', 'metro-app-bar-separator', 'metro-icon'],
    'tree-view': ['metro-tree-item'],
  };
  await mkdir(join(workspace, 'element-imports'));
  await Promise.all([
    writeFile(join(workspace, 'element-imports.html'), '<!doctype html><meta charset="utf-8"><title>Element imports</title>'),
    ...entries.map(({ name, source }) =>
      writeFile(join(workspace, source), `import '${packageName}/${name}';\n`)),
  ]);
  const { metafile } = await build({
    absWorkingDir: workspace,
    entryPoints: entries.map(({ source }) => source),
    outdir: 'element-bundles',
    bundle: true,
    format: 'esm',
    metafile: true,
  });
  for (const entry of entries) {
    const { name, tag, module, source, filename } = entry;
    const output = metafile.outputs[filename];
    assert.equal(output?.entryPoint, source, `Missing independent bundle for ${name}`);
    const pending = new Set([source]);
    const visited = new Set();
    while (pending.size) {
      const input = pending.values().next().value;
      pending.delete(input);
      if (visited.has(input)) continue;
      visited.add(input);
      assert(!forbidden.has(input), `${name} reaches the full package at ${input}`);
      for (const dependency of metafile.inputs[input]?.imports ?? []) {
        if (!dependency.external) pending.add(dependency.path);
      }
    }
    assert(visited.has(module), `${name} did not resolve to its installed export`);
    const expected = [...visited].map(path => moduleTags.get(path)).filter(Boolean).sort();
    assert(expected.includes(tag) && expected.length < entries.length, `${name} is not an isolated element import`);
    for (const dependency of dependencyChecks[name] ?? []) {
      assert(expected.includes(dependency), `${name} dropped required dependency ${dependency}`);
    }
    entry.expected = expected;
  }
  return entries;
}

async function checkElementImports(baseUrl, browser, entries, allTags) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    const response = await page.goto(`${baseUrl}/elements/`);
    assert(response?.ok(), 'Could not open the isolated element test harness');
    for (let start = 0; start < entries.length; start += 8) {
      const probes = entries.slice(start, start + 8).map(({ filename }) => filename);
      const results = await page.evaluate(async ({ filenames, knownTags }) => Promise.all(filenames.map(async filename => {
        const frame = document.createElement('iframe');
        frame.hidden = true;
        document.body.append(frame);
        try {
          const registry = frame.contentWindow.customElements;
          const existing = knownTags.filter(tag => registry.get(tag));
          const definitions = [];
          const define = registry.define.bind(registry);
          registry.define = (tag, element, options) => {
            define(tag, element, options);
            definitions.push(tag);
          };
          const script = frame.contentDocument.createElement('script');
          script.type = 'module';
          script.src = new URL(`/${filename}`, location.href).href;
          await new Promise((loaded, reject) => {
            const timeout = setTimeout(() => reject(new Error(`Timed out loading ${filename}`)), 6000);
            script.addEventListener('load', () => { clearTimeout(timeout); loaded(); }, { once: true });
            script.addEventListener('error', () => {
              clearTimeout(timeout);
              reject(new Error(`Could not load ${filename}`));
            }, { once: true });
            frame.contentDocument.head.append(script);
          });
          return { existing, definitions: definitions.sort() };
        } finally {
          frame.remove();
        }
      })), { filenames: probes, knownTags: allTags });
      for (const [index, { existing, definitions }] of results.entries()) {
        const { name, expected } = entries[start + index];
        assert.deepEqual(existing, [], `${name} did not start with a fresh Custom Elements registry`);
        assert.deepEqual(definitions, expected, `${name} registered a different set of elements than its import graph`);
      }
    }
    assert.deepEqual(errors, [], 'Isolated element import browser errors');
    console.log(`elements: verified ${entries.length} npm imports and their dependent tags in fresh registries`);
  } finally {
    await page.close();
  }
}

async function checkConsumer(name, baseUrl, browser, tags) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    const response = await page.goto(`${baseUrl}/${name}/`);
    assert(response.ok(), `${name} returned ${response.status()}`);

    const pivot = page.locator('metro-pivot');
    const tabs = page.getByRole('tablist', { name: 'Folders' });
    const one = tabs.getByRole('tab', { name: 'One', exact: true });
    const two = tabs.getByRole('tab', { name: 'Two', exact: true });
    const selected = page.locator('[aria-selected="true"]');
    const events = (hasText) => page.locator('#events').filter({ hasText });
    const value = () => pivot.evaluate((element) => element.value);
    await one.and(selected).waitFor();
    const missing = await page.evaluate((expected) => expected.filter((tag) => !customElements.get(tag)), tags);
    assert.deepEqual(missing, [], `${name} missing registrations`);
    assert.equal(await value(), 'one');
    await events(/^0:$/).waitFor();

    await page.getByRole('button', { name: 'Select two programmatically' }).click();
    await two.and(selected).waitFor();
    assert.equal(await value(), 'two');
    await events(/^0:$/).waitFor();

    await one.click();
    await one.and(selected).waitFor();
    assert.equal(await value(), 'one');
    await events(/^1:one$/).waitFor();
    assert.deepEqual(errors, [], `${name} browser errors`);
    console.log(`${name}: registered ${tags.length} tags, assigned value silently and handled metro-change once`);
  } catch (error) {
    if (errors.length) console.error(`${name} browser errors: ${errors.join('\n')}`);
    throw error;
  } finally {
    await page.close();
  }
}

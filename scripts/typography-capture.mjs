import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const [output, wpDir, uiDir] = process.argv.slice(2);
assert(output && wpDir && uiDir, 'Usage: node scripts/typography-capture.mjs OUTPUT SEGOE_WP_DIR SEGOE_UI_DIR');

const samples = {
  latin: { language: 'en', tab: 'Rail maps', title: 'Rail', section: 'Network maps', next: 'Alerts',
    body: 'Check local routes and weekend service before you leave.', initials: ['M', 'W'] },
  cyrillic: { language: 'ru', tab: 'Карты', title: 'Путь', section: 'Схемы линий', next: 'Сводки',
    body: 'Сверьте местные маршруты и график работы на выходных.', initials: ['Ж', 'Ш'] },
};
const weights = [300, 400];
const wpFiles = ['SegoeWP-Semilight.ttf', 'SegoeWP.ttf'];
const variants = [
  { id: 'segoe-wp', family: 'Segoe WP', postScript: 'SegoeWP', paths: () => wpFiles.map(file => join(wpDir, file)) },
  { id: 'segoe-ui', family: 'Segoe UI', postScript: 'SegoeUI',
    paths: script => weights.map(weight => join(uiDir, `${script}-${weight}.woff2`)) },
  { id: 'system-ui', family: 'system-ui' },
];
const bundle = await readFile(new URL('../dist/metro-ui.js', import.meta.url), 'utf8');
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ channel: 'chromium' });
try {
  const results = { browser: browser.version(), viewport: { width: 432, height: 1000 }, captures: [] };
  for (const [script, sample] of Object.entries(samples)) {
    const captures = [];
    for (const variant of variants) {
      captures.push(await capture(results.viewport, script, sample, variant));
    }
    for (const { stack, metrics, layout } of captures.slice(1)) {
      assert.deepEqual(layout, captures[0].layout, `${script}/${stack}: layout inputs changed`);
      for (const [name, metric] of Object.entries(metrics)) {
        for (const key of ['fontSize', 'fontWeight', 'letterSpacing']) {
          assert.equal(metric[key], captures[0].metrics[name][key], `${script}/${stack}/${name}: ${key} changed`);
        }
      }
    }
    results.captures.push(...captures);
  }
  await writeFile(join(output, 'measurements.json'), `${JSON.stringify(results, null, 2)}\n`);
} finally {
  await browser.close();
}

async function capture(viewport, script, sample, { id, family, postScript, paths }) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, colorScheme: 'dark', reducedMotion: 'reduce' });
  try {
    await page.setContent(`<!doctype html><html lang="${sample.language}"><head><meta charset="utf-8">
      <style>
        html { background: #191919; color: white; font: 16px system-ui; }
        body { margin: 16px; }
        main { width: 400px; background: #000; }
        h1 { font-size: 1.125rem; margin: 0; }
        #faces { font: 0.8125rem/1.4 monospace; block-size: 1.4em; margin: 4px 0 16px; }
        h2 { font-size: 0.8125rem; margin: 0; padding: 8px 12px; background: #282828; }
        .body { box-sizing: border-box; width: 209px; font-size: 20px; line-height: 1.25; margin: 0; }
        metro-panorama { --metro-hub-section-width: 345px; }
        metro-long-list-selector { --metro-long-list-height: 222px; }
      </style></head><body>
      <h1>${script === 'latin' ? 'Latin' : 'Cyrillic'} · ${family}</h1>
      <p id="faces"></p>
      <main>
        <h2>Pivot</h2>
        <metro-pivot value="first">
          <metro-pivot-item value="first" label="${sample.tab}"><p class="body">${sample.body}</p></metro-pivot-item>
          <metro-pivot-item value="second" label="${sample.next}"></metro-pivot-item>
        </metro-pivot>
        <h2>Panorama</h2>
        <metro-panorama heading="${sample.title}" value="first" loop="never">
          <metro-hub-section value="first" label="${sample.section}"><p class="body">${sample.body}</p></metro-hub-section>
          <metro-hub-section value="second" label="${sample.next}"></metro-hub-section>
        </metro-panorama>
        <h2>Letter tiles</h2>
        <metro-long-list-selector jump-label="${script === 'latin' ? 'Groups' : 'Группы'}"></metro-long-list-selector>
      </main></body></html>`);
    const faces = paths ? await Promise.all(paths(script).map(async (path, index) => ({
      bytes: (await readFile(path)).toString('base64'), weight: weights[index],
    }))) : [];
    await page.evaluate(async ({ family, faces }) => {
      const stack = faces.length ? '"Study Face"' : family;
      for (const { bytes, weight } of faces) {
        const face = new FontFace('Study Face', Uint8Array.fromBase64(bytes), { weight: String(weight) });
        document.fonts.add(await face.load());
      }
      document.querySelector('main').style.setProperty('--metro-font', stack);
    }, { family, faces });
    await page.addScriptTag({ type: 'module', content: bundle });
    await page.evaluate(async initials => {
      const list = document.querySelector('metro-long-list-selector');
      list.groups = initials.map((label, index) => ({
        value: `group-${index}`, label, items: [{ value: `item-${index}`, label }],
      }));
      await Promise.all([...document.querySelectorAll('main *')].map(element => element.updateComplete));
    }, sample.initials);
    await page.locator('metro-long-list-selector [part="group-button"]').last().waitFor();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });

    const { metrics, layout } = await page.evaluate(() => {
      const pivot = document.querySelector('metro-pivot');
      const panorama = document.querySelector('metro-panorama');
      const section = panorama.querySelector('metro-hub-section');
      const list = document.querySelector('metro-long-list-selector');
      const targets = {
        'Pivot tab': pivot.shadowRoot.querySelector('[role="tab"][aria-selected="true"]'),
        'Pivot next tab': pivot.shadowRoot.querySelector('[role="tab"][aria-selected="false"]'),
        'Pivot body': pivot.querySelector('.body'),
        'Panorama title': panorama.shadowRoot.querySelector('[part="heading"]'),
        'Panorama section': section.shadowRoot.querySelector('[part="heading"]'),
        'Panorama body': section.querySelector('.body'),
        'Letter tile 1': list.shadowRoot.querySelectorAll('[part="group-button"]')[0],
        'Letter tile 2': list.shadowRoot.querySelectorAll('[part="group-button"]')[1],
      };
      const round = value => Math.round(value * 100) / 100;
      const metrics = Object.fromEntries(Object.entries(targets).map(([name, element]) => {
        element.dataset.studyText = name;
        const style = getComputedStyle(element);
        const { fontSize, fontWeight, letterSpacing } = style;
        const range = document.createRange();
        const lines = new Map();
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        for (let node; (node = walker.nextNode());) {
          for (let offset = 0; offset < node.length; offset++) {
            range.setStart(node, offset);
            range.setEnd(node, offset + 1);
            const rect = range.getBoundingClientRect();
            if (rect.width) lines.set(rect.top, (lines.get(rect.top) ?? '') + node.data[offset]);
          }
        }

        // Use the same typographic properties, but remove the width limit for the advance.
        const probe = document.createElement('span');
        Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap',
          fontFamily: style.fontFamily, fontSize, fontWeight, letterSpacing });
        probe.textContent = element.textContent.trim();
        document.body.append(probe);
        const width = round(probe.getBoundingClientRect().width);
        probe.remove();
        const component = element.closest('metro-pivot, metro-panorama, metro-long-list-selector')
          ?? element.getRootNode().host.closest('metro-pivot, metro-panorama, metro-long-list-selector');
        range.selectNodeContents(element);
        const clip = component.getBoundingClientRect();
        const text = range.getBoundingClientRect();
        const visibleWidth = round(Math.max(0, Math.min(text.right, clip.right) - Math.max(text.left, clip.left)));
        return [name, { fontSize, fontWeight, letterSpacing, width, lines: [...lines.values()].map(line => line.trim()), visibleWidth }];
      }));
      return { metrics, layout: {
        pivotWidth: pivot.offsetWidth,
        panoramaWidth: panorama.offsetWidth,
        sectionWidth: section.offsetWidth,
        pivotBodyWidth: targets['Pivot body'].offsetWidth,
        panoramaBodyWidth: targets['Panorama body'].offsetWidth,
        tileWidth: targets['Letter tile 1'].offsetWidth,
        tileHeight: targets['Letter tile 1'].offsetHeight,
      } };
    });

    // Read the faces that Chromium actually used, not the requested CSS font stack.
    const session = await page.context().newCDPSession(page);
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
    for (const node of nodes(root)) {
      const index = node.attributes?.indexOf('data-study-text') ?? -1;
      if (index === -1) continue;
      const name = node.attributes[index + 1];
      const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId: node.nodeId });
      assert(fonts.length === 1 && fonts[0].glyphCount > 0, `${id}/${script}/${name}: expected a single rendered face`);
      const [{ familyName, postScriptName, isCustomFont }] = fonts;
      assert.equal(isCustomFont, Boolean(paths), `${id}/${script}/${name}: unexpected font source`);
      if (paths) {
        // CSS font matching uses the 300 face for the requested tile weight of 350.
        const expected = metrics[name].fontWeight === '400' ? postScript : `${postScript}-Semilight`;
        assert.equal(postScriptName.toLowerCase(), expected.toLowerCase(), `${id}/${script}/${name}: unexpected face`);
      }
      metrics[name].font = { familyName, postScriptName };
    }
    const names = new Set();
    for (const [name, metric] of Object.entries(metrics)) {
      assert(metric.font && metric.width > 0 && metric.lines.length, `${id}/${script}/${name}: missing measurement`);
      names.add(metric.font.postScriptName || metric.font.familyName);
    }
    await page.locator('#faces').evaluate((element, label) => { element.textContent = label; },
      [...names].join(' · '));
    const bounds = await page.locator('main').boundingBox();
    assert(bounds && bounds.y + bounds.height <= viewport.height, `${id}/${script}: capture does not fit in the viewport`);
    const image = `${script}-${id}.png`;
    await page.screenshot({ path: join(output, image) });
    return { script, stack: family, image, layout, metrics };
  } finally {
    await page.close();
  }
}

function* nodes(node) {
  yield node;
  for (const child of [...node.children ?? [], ...node.shadowRoots ?? []]) yield* nodes(child);
}

# Documentation website

A static Astro site with `ClientRouter`: navigation, browser history, and transitions without a full reload. Components use **`relict-metro-ui@0.2.0` from npm**.

Published at **https://kai-shoo.github.io/relict-metro-ui/**.

## Development

Use a Node.js version supported by Astro (>=22.23.4). From the repository root:

```sh
npm --prefix website ci
npm run docs:dev
```

Open `http://localhost:4321/relict-metro-ui/`. Check and build:

```sh
npm run docs:check
npm run docs:build
npm run docs:preview
```

The output is `website/dist/`. GitHub Pages deploys it automatically when changes to the website reach `main`. A manual run is also available in the **Deploy documentation** workflow.

The default base path is `/relict-metro-ui`. To host at the root of a domain, build with `DOCS_BASE=/ npm run docs:build` and update `site` in `site.config.mjs`. Use directory index serving and `404.html`; do not rewrite every URL to the home page.

## Structure

- `src/layouts/Docs.astro` — shared shell and client router.
- `src/pages/` — overview, getting started, catalog, apps, and reference pages.
- `../docs/*.md` and `../README.md` — English reference documents.
- `content/example-translations.json` — English text for the published example apps.
- `src/lib/paths.ts` — base-aware URLs shared by server and client code.
- `src/scripts/client.ts` — theme, search, filtering, and copy buttons. Page listeners are cleaned up during navigation.
- `src/styles/docs.css` — site styling; controls come from the UI kit.
- `scripts/remark-links.mjs` — converts Markdown links to website routes.
- `scripts/sync-examples.mjs` — copies release examples and the browser bundle, applies English example text, and adjusts deployment paths. Generated `public/examples/` and `public/dist/` directories are not committed.

Pagefind builds a full-text English index during production builds. Development uses a smaller title, heading, and component-tag index at `/search.json`. Open search with the button or Ctrl/Cmd+K.

## Verification

```sh
npm ci
npx playwright install chromium
npm run test:docs
```

The production smoke test checks the actual project subpath, direct URLs, client-side history, Shadow DOM links, theme persistence, full-text search, clipboard, mobile layout, and English content. `METRO_CHROMIUM_PATH` can select an existing Chromium installation.

## Updating the UI kit

Publishing is not required for local development. The website pins a released package in its own lockfile:

```sh
cd website
npm install --save-exact relict-metro-ui@<version>
```

To test unreleased changes, run `npm pack` in the repository root and temporarily install the resulting `.tgz` in `website`. Restart development or rebuild to refresh copied examples. Restore the intended npm dependency before committing.

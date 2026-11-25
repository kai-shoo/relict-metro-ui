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

## Find and use an example

- Open the [component index](https://kai-shoo.github.io/relict-metro-ui/components/) and filter by tag. Select a guide to run the example, copy its code, and read its API. Each guide has a direct URL, such as [`/components/dialog/`](https://kai-shoo.github.io/relict-metro-ui/components/dialog/).
- To switch guides, expand **Components by name** in the sidebar. On a phone, open **Browse documentation** first. Use Tab to reach a link. Use Escape to close the submenu.
- Open the [icon catalog](https://kai-shoo.github.io/relict-metro-ui/icons/) and type part of a name, such as `volume`. Select an SVG to preview it. Select **Copy markup** and import `relict-metro-ui/icon` in your app.
- Open [Example apps](https://kai-shoo.github.io/relict-metro-ui/examples/) to try complete workflows. Select **Component catalog** to try a control in a standalone page. Share a specific control with a URL such as [`/examples/catalog/?tag=metro-repeat-button`](https://kai-shoo.github.io/relict-metro-ui/examples/catalog/?tag=metro-repeat-button).

## Structure

- `src/layouts/Docs.astro` — shared shell and client router.
- `src/pages/components/[slug].astro` — one guide per registered element. Edit usage and API text in `src/lib/component-guides.ts`. The live preview and copyable code use the same example. `src/lib/component-catalog.ts` reads examples from the release catalog and `src/lib/component-examples.ts`.
- `src/components/IconCatalog.astro` — SVG previews, search, and markup for the names in `metroIconNames`.
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

Run these commands from the repository root after you install the website dependencies. Set `METRO_CHROMIUM_PATH` to use an existing Chromium executable.

`npm run test:docs` builds the site and starts its own servers. It opens every standalone example from the index in development and static preview. On the static site it checks:

- Each registered component's guide, live demo, API link, copyable import, and search entry.
- Component submenu navigation on desktop and mobile, including keyboard focus and the current guide.
- Each registered SVG, icon search, preview, clipboard markup, and recovery from an empty result.
- Direct URLs under the project base path, internal links, browser history, theme persistence, full-text search, and English content.

## Updating the UI kit

Publishing is not required for local development. The website pins a released package in its own lockfile:

```sh
cd website
npm install --save-exact relict-metro-ui@<version>
```

To test unreleased changes, run `npm pack` in the repository root and temporarily install the resulting `.tgz` in `website`. Restart development or rebuild to refresh copied examples. Restore the intended npm dependency before committing.

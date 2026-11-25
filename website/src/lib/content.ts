import type { MarkdownInstance } from 'astro';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import pkg from 'relict-metro-ui/package.json';
import { withBase } from './paths';

export const version = pkg.version;

const markdown = import.meta.glob<MarkdownInstance<Record<string, unknown>>>(
  ['../../../docs/*.md', '../../../README.md'],
  { eager: true },
);

export const documents = Object.entries(markdown).map(([path, document]) => {
  const slug = path.split('/').at(-1)!.replace('.md', '').toLowerCase();
  const headings = document.getHeadings();
  return {
    slug,
    title: headings.find((heading) => heading.depth === 1)?.text ?? slug,
    headings: headings.filter((heading) => heading.depth === 2 || heading.depth === 3),
    document,
    href: withBase(`/reference/${slug}/`),
  };
});

// Public element entry points declare their tags in HTMLElementTagNameMap.
// Other public modules (for example shell-host) do not register elements.
const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve('relict-metro-ui/package.json'));
export const tags = Object.entries(pkg.exports).flatMap(([subpath, entry]) => {
  if (typeof entry === 'string' || !subpath.startsWith('./') || !('types' in entry)) return [];
  const declaration = readFileSync(resolve(packageRoot, entry.types), 'utf8');
  const tag = declaration.match(/interface HTMLElementTagNameMap\s*\{\s*'(metro-[\w-]+)'/)?.[1];
  if (tag && subpath !== `./${tag.slice(6)}`) throw new Error(`Unexpected element entry point: ${subpath} (${tag})`);
  return tag ? [tag] : [];
}).sort();

export function componentPath(tag: string) {
  return `/components/${tag.slice(6)}/`;
}

export const navigation = [
  {
    title: 'Documentation',
    links: [
      { label: 'Overview', href: '/' },
      { label: 'Getting started', href: '/getting-started/' },
      { label: 'Components', href: '/components/', count: tags.length },
      { label: 'Icons', href: '/icons/' },
      { label: 'Example apps', href: '/examples/' },
    ],
  },
  {
    title: 'Guides',
    links: [
      { label: 'API reference', href: '/reference/api/' },
      { label: 'Themes & typography', href: '/reference/foundations/' },
      { label: 'Component patterns', href: '/reference/components/' },
      { label: 'Interaction patterns', href: '/reference/flows/' },
    ],
  },
  {
    title: 'Under the hood',
    links: [
      { label: 'Implementation', href: '/reference/implementation/' },
      { label: 'Component checks', href: '/reference/component-audit/' },
      { label: 'Sources & archives', href: '/reference/' },
    ],
  },
];

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

// Use the installed release's catalogue rather than a second handwritten tag list.
const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve('relict-metro-ui/package.json'));
const samples = readFileSync(resolve(packageRoot, 'examples/catalog/samples.js'), 'utf8');
const applications = readFileSync(resolve(packageRoot, 'examples/catalog/applications.js'), 'utf8');
export const tags = [...new Set([
  ...[...samples.matchAll(/<(metro-[\w-]+)\b/g)].map((match) => match[1]),
  ...[...applications.matchAll(/"(metro-[\w-]+)"/g)].map((match) => match[1]),
])].sort();

export const navigation = [
  {
    title: 'Documentation',
    links: [
      { label: 'Overview', href: '/' },
      { label: 'Getting started', href: '/getting-started/' },
      { label: 'Components', href: '/components/', count: tags.length },
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
      { label: 'Icons', href: '/reference/metro-icons/' },
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

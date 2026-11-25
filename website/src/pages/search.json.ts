import { componentPath, documents, tags } from '../lib/content';
import { componentGuide } from '../lib/component-guides';
import { withBase } from '../lib/paths';
export function GET() {
  return Response.json([
    { url: withBase('/getting-started/'), title: 'Getting started', text: 'Installation npm Astro events properties themes' },
    { url: withBase('/icons/'), title: 'Icons', text: 'Search the SVG icon catalog by name.' },
    ...tags.map((tag) => {
      const [usage, api] = componentGuide(tag);
      return { url: withBase(componentPath(tag)), title: tag, text: `${usage} ${api}` };
    }),
    ...documents.map((entry) => ({
      url: entry.href,
      title: entry.title,
      text: entry.headings.map((heading) => heading.text).join(' '),
    })),
  ]);
}

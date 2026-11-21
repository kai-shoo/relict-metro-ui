import { documents, tags } from '../lib/content';
import { withBase } from '../lib/paths';
export function GET() {
  return Response.json([
    { url: withBase('/getting-started/'), title: 'Getting started', text: 'Installation npm Astro events properties themes' },
    ...documents.map((entry) => ({
      url: entry.href,
      title: entry.title,
      text: entry.headings.map((heading) => heading.text).join(' '),
    })),
    ...tags.map((tag) => ({ url: withBase(`/examples/catalog/?tag=${tag}`), title: tag, text: 'Component example import' })),
  ]);
}

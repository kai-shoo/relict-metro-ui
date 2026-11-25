import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkLinks from './scripts/remark-links.mjs';
import { basePath, site } from './site.config.mjs';

export default defineConfig({
  site,
  base: basePath || '/',
  output: 'static',
  trailingSlash: 'always',
  markdown: {
    processor: unified({ remarkPlugins: [[remarkLinks, { base: basePath }]] }),
    shikiConfig: { theme: 'github-dark' },
  },
  server: { port: 4321 },
  vite: {
    plugins: [{
      name: 'example-directory-index',
      configureServer(server) {
        // Astro strips the site base before Vite serves public files. In dev,
        // Vite needs the filename that static hosts infer for directory URLs.
        server.middlewares.use((request, _response, next) => {
          request.url = request.url?.replace(/^(\/examples\/[\w-]+\/)(?=\?|$)/, '$1index.html');
          next();
        });
      },
    }],
  },
});

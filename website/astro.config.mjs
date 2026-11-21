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
});

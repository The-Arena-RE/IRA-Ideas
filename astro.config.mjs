// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://iraideas.com',
  trailingSlash: 'always',
  // Keep whitespace between inline tags (e.g. "<strong>401(k)</strong> attorney").
  compressHTML: false,
  build: { format: 'directory' },
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});

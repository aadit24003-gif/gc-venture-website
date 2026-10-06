import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { PRODUCTS, isThin } from './src/data/products.ts';

// Pages that carry noindex stay out of the sitemap.
const excluded = new Set([
  ...PRODUCTS.filter(isThin).map((p) => `/equipment/${p.slug}/`),
  '/thank-you/', '/404/', '/privacy-policy/', '/terms/',
]);

export default defineConfig({
  site: 'https://itrentals.in',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  integrations: [
    sitemap({
      filter: (page) => !excluded.has(new URL(page).pathname),
    }),
  ],
});

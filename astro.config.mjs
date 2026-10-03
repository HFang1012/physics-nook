// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const site = process.env.PUBLIC_SITE_URL ?? process.env.SITE_URL ?? 'https://physicsnook.com';
const leaderboardApiOrigin =
  process.env.PUBLIC_LEADERBOARD_API_ORIGIN ?? 'https://physicsnook.com';
const ignoredDevWatchFiles = [
  '**/apps/client/dist/**',
  '**/dist/**',
  '**/apps/client/tsconfig*.json',
  '**/apps/server/tsconfig*.json',
  '**/packages/shared/tsconfig*.json',
];

// https://astro.build/config
export default defineConfig({
  site,
  integrations: [
    react(),
    mdx({
      // Astro 6.4+ leaves markdown.gfm/smartypants undefined, and @astrojs/mdx 5
      // inherits that as "off", which drops GFM tables. Set them explicitly.
      gfm: true,
      smartypants: true,
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        [
          rehypeKatex,
          {
            // Allows `\htmlClass` so parts of an equation can be tagged for
            // hover explanations (see src/components/textbook/MathHint.astro).
            trust: (/** @type {{ command: string }} */ context) => context.command === '\\htmlClass',
            strict: (/** @type {string} */ errorCode) => (errorCode === 'htmlExtension' ? 'ignore' : 'warn'),
          },
        ],
      ],
    }),
  ],

  vite: {
    cacheDir: 'node_modules/.vite-astro',
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: ignoredDevWatchFiles,
      },
      // Astro's local server does not run Pages Functions. Forward leaderboard
      // calls to the deployed D1 API so local score submits hit the database.
      proxy: {
        '/api': {
          target: leaderboardApiOrigin,
          changeOrigin: true,
        },
      },
    },
  },
});

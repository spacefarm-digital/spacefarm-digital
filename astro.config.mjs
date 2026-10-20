// @ts-check
/// <reference types="node" />
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// BASE_PATH is "/spacefarm-digital" while the site is previewed at
// spacefarm-digital.github.io/spacefarm-digital and unset once it serves www.spacefarm.digital.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site: 'https://www.spacefarm.digital',
  base,
  build: {
    // One small stylesheet, inlined like the 2017 build's smooshed CSS.
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});

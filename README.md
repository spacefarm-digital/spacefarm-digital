# spacefarm.digital

The Spacefarm website: an [Astro](https://astro.build) site styled with Tailwind, deployed to GitHub Pages by the workflow in `.github/workflows/deploy.yml`.

It is the 2017 site, ported faithfully (`legacy/baseline/source-2017` holds the reference screenshots) and then restyled: rounder corners, softer shadows, and three [Paper Shaders](https://github.com/paper-design/shaders) (a paper texture behind the page, a slow mesh-gradient glow behind the wordmark, a frosted gradient behind the NDA card). The 2017 originals live under `legacy/` for reference.

## Working on it

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run check      # astro check + prettier
npm run format
```

Node 22.22 or newer (`.nvmrc`).

## Where things are

| Path                     | What                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/index.astro`  | The one page, assembled from the components below                                                                                                         |
| `src/layouts/Base.astro` | `<head>`: meta, favicons, font preloads, Google Analytics                                                                                                 |
| `src/components/`        | Hero, Projects, Services, Team, Contact, Illustration, and PaperShader (the three Paper Shaders presets)                                                  |
| `src/content/*.yml`      | All copy for the card sections, in display order; schemas in `src/content.config.ts`                                                                      |
| `src/styles/global.css`  | Tailwind theme tokens (colours, type scale, breakpoints, shadows), the base styles, and the few component classes (`btn`, `lift`, `fade`, `illustration`) |
| `src/assets/`            | Fonts, logo, the farm illustration, OG image                                                                                                              |
| `public/`                | Favicons, manifest, robots                                                                                                                                |

## Deploying

Every push to `main` builds and deploys to GitHub Pages. Two repository variables feed the build (Settings → Secrets and variables → Actions → Variables):

| Variable       | Value                                                                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BASE_PATH`    | Unset while the site is served at spacefarm-digital.github.io/spacefarm-digital (the workflow defaults to `/spacefarm-digital`); set it to `/` once the custom domain is attached |
| `PUBLIC_GA_ID` | The GA4 measurement ID (`G-…`). Analytics is only emitted in production builds and only when this is set                                                                          |

The custom domain (`www.spacefarm.digital`) is set in Settings → Pages once the site should go live; GitHub binds a domain to one Pages site, so it has to be removed from `darindimitroff/spacefarm.digital` first.

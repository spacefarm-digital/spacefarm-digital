# Legacy: the 2017 Spacefarm site

Reference material for the Astro port. Nothing in here is served; it goes away once the new site matches it.

| Folder | What it is | Taken from |
| --- | --- | --- |
| `source-2017/` | The site's source: Jade templates, Sass partials, YAML content, images, fonts, Gulp config. October 2017 content, animation toggle removed July 2021. This is the version being ported. | `darindimitroff/spacefarm.digital`, branch `landing-page` at `d4661ee` |
| `deployed-2017/` | The build that was actually live from January 2017 until December 2025 (fewer cards, no services or team section). | `darindimitroff/spacefarm.digital`, `master` at `9784b98` |
| `rendered-2017/` | `source-2017/` rendered to static HTML/CSS with `tools/render.js` (pug + dart-sass standing in for jade + node-sass, stylesheet inlined like gulp-smoosher did). | generated |
| `baseline/source-2017/` | Full-page screenshots of `rendered-2017/` at 375, 768 and 1280 px, plus the illustration in view at 1280 px. The port is diffed against these. | generated with `tools/shots.js` |
| `baseline/deployed-2017/` | The same screenshots of `deployed-2017/`, for comparison. | generated with `tools/shots.js` |

## Regenerating

```sh
cd legacy/tools && npm install          # pug, js-yaml, sass, playwright (Chromium)
node render.js ../source-2017 ../rendered-2017
node shots.js ../rendered-2017 ../baseline/source-2017
node shots.js ../deployed-2017 ../baseline/deployed-2017
```

Screenshots are taken headless in Chromium at device scale factor 1, after `document.fonts.ready` plus 800 ms so FontFaceObserver has added the `real-text` / `real-head` classes.

## Things worth knowing

- The illustration's fans and red lights have CSS keyframe animations (`fan`, `lights-red`) that only run with an `.animate` class on `.illustration`. The scroll handler that added that class was deleted in July 2021 in both versions, so the illustration is static as of the last commit.
- `projects.yml` gives "A design system" the same description as "A platform for hackathons"; the template hides it behind an "NDA" card, so it never shows.
- Google Analytics in `scripts/analytics.js` uses a Universal Analytics property (`UA-85444979-1`), which Google shut down in July 2024.
- `fontLoader.js` is FontFaceObserver plus a polyfilled Promise; `zepto.js` exists only for the (now deleted) scroll handler.

// Render the Oct 2017 Jade/Sass/YAML source with modern pug + dart-sass.
// Usage: node render.js <source-2017 dir> <out dir>
const fs = require('fs');
const path = require('path');
const pug = require('pug');
const yaml = require('js-yaml');
const sass = require('sass');

const [,, srcRoot, outDir] = process.argv;
const src = path.join(srcRoot, 'src');
const work = path.join(outDir, '.pug-work');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });

// 1. Copy templates into a work dir as .pug, fixing the two Jade-isms pug 3 dropped:
//    attribute interpolation (class="#{x}") and the .jade extension in include/extends.
function copyTemplates(dir, rel = '') {
  for (const ent of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = path.join(rel, ent.name);
    if (ent.isDirectory()) { fs.mkdirSync(path.join(work, r), { recursive: true }); copyTemplates(dir, r); continue; }
    let out = path.join(work, r);
    if (ent.name.endsWith('.jade')) {
      let s = fs.readFileSync(path.join(dir, r), 'utf8');
      s = s.replace(/=\s*"#\{([^}]+)\}"/g, '=$1');           // class="#{stuff.color}" -> class=stuff.color
      s = s.replace(/(include|extends)\s+(\S+)\.jade/g, '$1 $2.pug');
      s = s.replace(/(include|extends)\s+(_layouts\/base)\b/g, '$1 $2.pug');
      out = out.replace(/\.jade$/, '.pug');
      fs.writeFileSync(out, s);
    } else {
      fs.copyFileSync(path.join(dir, r), out);
    }
  }
}
copyTemplates(src);

// 2. Data: every YAML under _data, keyed by file name (what gulp-data + foldero did).
const data = {};
for (const f of fs.readdirSync(path.join(src, '_data'))) {
  data[f.replace(/\.ya?ml$/, '')] = yaml.load(fs.readFileSync(path.join(src, '_data', f), 'utf8'));
}

// 3. CSS
const css = sass.compile(path.join(src, '_styles', 'main.scss'), {
  loadPaths: [path.join(src, '_styles'), path.join(src, '_modules')],
  style: 'compressed',
  silenceDeprecations: ['import', 'slash-div', 'global-builtin', 'color-functions'],
});
fs.mkdirSync(path.join(outDir, 'styles'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'styles', 'main.css'), css.css);

// 4. HTML, with the stylesheet inlined the way gulp-smoosher did (so fonts/ resolves from the page, not /styles/)
let html = pug.renderFile(path.join(work, 'index.pug'), {
  pretty: false,
  basedir: work,
  site: { data },
  config: { baseUrl: '' },
});
html = html.replace(/<link rel="stylesheet" href="\/styles\/main\.css">/, () => `<style>${css.css}</style>`);
if (!html.includes('<style>')) throw new Error('stylesheet link not found for inlining');
fs.writeFileSync(path.join(outDir, 'index.html'), html);

// 5. Static files: everything in src/ not starting with "_" and not a template, plus _images -> images
function copyStatic(rel = '') {
  for (const ent of fs.readdirSync(path.join(src, rel), { withFileTypes: true })) {
    if (ent.name.startsWith('_') || ent.name.endsWith('.jade') || ent.name === 'README.md') continue;
    const r = path.join(rel, ent.name);
    if (ent.isDirectory()) { fs.mkdirSync(path.join(outDir, r), { recursive: true }); copyStatic(r); }
    else fs.copyFileSync(path.join(src, r), path.join(outDir, r));
  }
}
copyStatic();
fs.cpSync(path.join(src, '_images'), path.join(outDir, 'images'), { recursive: true });
fs.rmSync(work, { recursive: true, force: true });
console.log('rendered', path.join(outDir, 'index.html'), html.length, 'bytes html,', css.css.length, 'bytes css');

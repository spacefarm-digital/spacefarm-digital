// Compare two static site dirs: visible text (must be identical) and screenshots (pixelmatch).
// Usage: node compare.js <baseline site dir> <baseline shots dir> <candidate site dir> <candidate shots dir> <diff out dir>
const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch').default || require('pixelmatch');

const [,, baseSite, baseShots, candSite, candShots, diffDir] = process.argv;
fs.mkdirSync(diffDir, { recursive: true });

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.json': 'application/json' };
function serve(dir) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(dir, p);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end(); }
    res.setHeader('content-type', types[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r({ server, base: `http://127.0.0.1:${server.address().port}/` })));
}

(async () => {
  const browser = await chromium.launch();
  const texts = {};
  for (const [name, dir] of [['baseline', baseSite], ['candidate', candSite]]) {
    const { server, base } = await serve(path.resolve(dir));
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(base, { waitUntil: 'networkidle' });
    texts[name] = await page.evaluate(() => document.querySelector('main').innerText.replace(/[ \t]+\n/g, '\n').trim());
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => `${a.getAttribute('href')} [${a.getAttribute('target') || ''}] ${a.innerText.trim()}`));
    fs.writeFileSync(path.join(diffDir, `${name}-text.txt`), texts[name] + '\n\n--- links ---\n' + links.join('\n') + '\n');
    await page.close();
    server.close();
  }
  await browser.close();
  console.log(texts.baseline === texts.candidate ? 'TEXT: identical' : 'TEXT: DIFFERS (see *-text.txt)');

  for (const f of fs.readdirSync(baseShots).filter(f => f.endsWith('.png'))) {
    const a = PNG.sync.read(fs.readFileSync(path.join(baseShots, f)));
    const bPath = path.join(candShots, f);
    if (!fs.existsSync(bPath)) { console.log(`${f}: missing in candidate`); continue; }
    const b = PNG.sync.read(fs.readFileSync(bPath));
    const w = Math.max(a.width, b.width), h = Math.max(a.height, b.height);
    const pad = (img) => { if (img.width === w && img.height === h) return img; const out = new PNG({ width: w, height: h, fill: true }); out.data.fill(255); PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0); return out; };
    const pa = pad(a), pb = pad(b), diff = new PNG({ width: w, height: h });
    const n = pixelmatch(pa.data, pb.data, diff.data, w, h, { threshold: 0.1 });
    fs.writeFileSync(path.join(diffDir, f.replace('.png', '-diff.png')), PNG.sync.write(diff));
    console.log(`${f}: baseline ${a.width}x${a.height}, candidate ${b.width}x${b.height}, ${n} differing px = ${(100 * n / (w * h)).toFixed(2)}%`);
  }
})();

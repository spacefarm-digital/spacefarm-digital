// Footer-farm screenshots of a static site dir at several widths.
// Usage: node farm-shots.cjs <site dir> <out dir> [widths...]
const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright');

const [,, siteDir, outDir, ...w] = process.argv;
const widths = w.length ? w.map(Number) : [375, 1440, 2560, 3440];
fs.mkdirSync(outDir, { recursive: true });
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.webm': 'video/webm', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(siteDir, p);
  if (!file.startsWith(siteDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader'] });
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => console.log(`${width}px: page error: ${e.message}`));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    const info = await page.evaluate(() => {
      const d = document.documentElement;
      const ill = document.querySelector('.illustration');
      const r = ill.getBoundingClientRect();
      return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth, bodyScrollWidth: document.body.scrollWidth,
        farm: { left: r.left, right: r.right, width: r.width, height: r.height }, uses: ill.querySelectorAll('use').length };
    });
    console.log(`${width}px`, JSON.stringify(info));
    await page.screenshot({ path: path.join(outDir, `farm-${width}.png`) });
    await page.close();
  }
  await browser.close();
  server.close();
})();

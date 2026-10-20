// Baseline screenshots of a static site dir.
// Usage: node shots.js <site dir> <out dir>
const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright');

const [,, siteDir, outDir] = process.argv;
fs.mkdirSync(outDir, { recursive: true });

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };

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
  const browser = await chromium.launch();
  for (const width of [375, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
    const failed = [];
    page.on('requestfailed', r => { if (!r.url().includes('google-analytics')) failed.push(r.url()); });
    page.on('pageerror', e => console.log(`${width}px: page error: ${e.message}`));
    page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800); // FontFaceObserver adds .real-text/.real-head to <html>
    // Clip to the viewport width: the 2560px-wide illustration overflows the document even with body { overflow-x: hidden }.
    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({ path: path.join(outDir, `${width}.png`), fullPage: true, clip: { x: 0, y: 0, width, height: docHeight } });
    if (width === 1280) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1200); // scroll handler debounce (150 ms) + a bit of fan rotation
      await page.screenshot({ path: path.join(outDir, `${width}-illustration-animating.png`) });
      const cls = await page.evaluate(() => [document.documentElement.className, document.querySelector('.illustration')?.className,
        window.scrollY, document.querySelector('.illustration')?.getBoundingClientRect().top, innerHeight, typeof window.$]);
      console.log('html class / illustration class / scrollY / illustration top / innerHeight / $:', cls);
    }
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(`${width}px: page height ${h}px${failed.length ? ', failed: ' + failed.join(', ') : ''}`);
    await page.close();
  }
  await browser.close();
  server.close();
})();

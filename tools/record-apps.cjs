// Records a short scrolling tour of each app's site for the "Our apps" cards.
// Usage (needs legacy/tools' playwright and an ffmpeg with libvpx): node tools/record-apps.cjs [wtheic agents chopchop]
//   FFMPEG=/path/to/ffmpeg CHROME=/path/to/chrome override the binaries.
// Writes src/assets/apps/<id>.webm, <id>.mp4 (when ffmpeg has an H.264 encoder) and <id>.jpg.
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { chromium } = require('../legacy/tools/node_modules/playwright');

const sites = {
  wtheic: 'https://wtheic.com',
  agents: 'https://agentsapp.net',
  chopchop: 'https://chop-chop.app',
};
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(sites);
const out = path.join(__dirname, '..', 'src', 'assets', 'apps');
const width = 1280;
const height = 720; // 16:9, the card's aspect ratio
const seconds = 8;
const fps = 12;
const ffmpeg = process.env.FFMPEG || 'ffmpeg';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch(
    process.env.CHROME ? { executablePath: process.env.CHROME } : {},
  );
  for (const id of ids) {
    const url = sites[id];
    if (!url) {
      console.error(`unknown app ${id}`);
      continue;
    }
    const frames = fs.mkdtempSync(path.join(out, '.frames-'));
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(out, `${id}.jpg`), type: 'jpeg', quality: 82 });
    // Frame by frame: a slow scroll down the page and back up, so the loop joins up
    const total = await page.evaluate(() =>
      Math.min(document.documentElement.scrollHeight - innerHeight, innerHeight * 3),
    );
    const count = seconds * fps;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      await page.evaluate((y) => scrollTo(0, y), total * (0.5 - 0.5 * Math.cos(t * Math.PI * 2)));
      await page.waitForTimeout(1000 / fps);
      await page.screenshot({
        path: path.join(frames, `${String(i).padStart(4, '0')}.jpg`),
        type: 'jpeg',
        quality: 85,
      });
    }
    await page.close();
    // The frames go in on stdin as one MJPEG stream, so a minimal ffmpeg (Playwright's bundled one) works too
    const input = Buffer.concat(
      fs
        .readdirSync(frames)
        .sort()
        .map((f) => fs.readFileSync(path.join(frames, f))),
    );
    const args = [
      '-y',
      '-f',
      'image2pipe',
      '-framerate',
      String(fps),
      '-c:v',
      'mjpeg',
      '-i',
      'pipe:0',
      '-an',
      '-pix_fmt',
      'yuv420p',
    ];
    const encode = (extra, file) =>
      execFileSync(ffmpeg, [...args, ...extra, path.join(out, file)], {
        input,
        stdio: ['pipe', 'ignore', 'ignore'],
      });
    encode(['-c:v', 'libvpx', '-b:v', '1.2M', '-crf', '12'], `${id}.webm`);
    try {
      encode(['-c:v', 'libx264', '-crf', '26', '-movflags', '+faststart'], `${id}.mp4`);
    } catch {
      console.warn(`${id}: ${ffmpeg} has no H.264/MP4 support, webm only`);
    }
    fs.rmSync(frames, { recursive: true, force: true });
    console.log(`${id}: recorded ${url}`);
  }
  await browser.close();
})();

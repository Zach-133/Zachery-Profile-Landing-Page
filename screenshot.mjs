import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const mobileFlag = args.includes('--mobile');
const filteredArgs = args.filter(a => a !== '--mobile');
const url = filteredArgs[0];
const label = filteredArgs[1];

if (!url) {
  console.error('Usage: node screenshot.mjs <url> [label] [--mobile]');
  process.exit(1);
}

let puppeteer;
try {
  puppeteer = (await import('puppeteer')).default;
} catch {
  console.error('Puppeteer not found. Install it with: npm install puppeteer');
  process.exit(1);
}

const screenshotDir = path.join(__dirname, 'temporary screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });

// Auto-increment screenshot number
const existing = fs.readdirSync(screenshotDir).filter(f => f.startsWith('screenshot-'));
const nums = existing.map(f => {
  const m = f.match(/^screenshot-(\d+)/);
  return m ? parseInt(m[1]) : 0;
});
const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
const filename = label
  ? `screenshot-${next}-${label}.png`
  : `screenshot-${next}.png`;
const outPath = path.join(screenshotDir, filename);

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();

if (mobileFlag) {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
} else {
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
}

await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

// Force all reveal elements visible (IntersectionObserver doesn't fire reliably in headless)
await page.evaluate(() => {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
});
// Wait for images and transitions
await new Promise(r => setTimeout(r, 800));

await page.screenshot({ path: outPath, fullPage: true });

await browser.close();
console.log(`Screenshot saved: ${outPath}`);

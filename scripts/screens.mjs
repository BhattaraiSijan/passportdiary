// Takes the screenshots in docs/screens/ from a running dev server
// (npx vite --port 5183 --strictPort).
// Usage: npm run screens -- [size...] [--states=a,b] [--out=dir] [--base=url]
//   size    wide, laptop, tablet, phone (default: all four)
//   states  empty, nepal, detail, compare, compare-differ (default: all)
/* global process, console, window, document */
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const option = (name, fallback) =>
  args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const plain = args.filter((a) => !a.startsWith('--'));
const states = option('states', 'empty,nepal,detail,compare,compare-differ').split(',');
const out = option('out', 'docs/screens');
const base = option('base', 'http://localhost:5183');

const SIZES = { wide: [1917, 928], laptop: [1360, 820], tablet: [1000, 760], phone: [390, 844] };
const sizes = plain.length ? plain : Object.keys(SIZES);

const browser = await chromium.launch({
  // Software WebGL, so the globe renders on machines without a GPU.
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

for (const size of sizes) {
  const [width, height] = SIZES[size];
  const phone = size === 'phone';
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: phone ? 2 : 1,
    hasTouch: phone,
    isMobile: phone,
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('page error:', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('console error:', m.text()));

  const shot = async (state) => {
    if (!states.includes(state)) return;
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${size}-${state}.png` });
    if (process.env.FULL) {
      const full = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.screenshot({
        path: `${out}/${size}-${state}-full.png`,
        fullPage: true,
        clip: { x: 0, y: 0, width, height: Math.min(full, 2600) },
        scale: 'css',
      });
    }
    console.log(`${size}-${state}`);
  };
  const choose = async (label, text) => {
    const box = page.getByRole('combobox', { name: label });
    await box.click();
    await box.fill(text);
    await page.keyboard.press('Enter');
  };
  await page.goto(`${base}/`);
  if (process.env.HIDE) await page.addStyleTag({ content: process.env.HIDE });
  await page.waitForTimeout(3500);
  await shot('empty');

  await choose('Your passport', 'nepal');
  await page.waitForTimeout(3000);
  await shot('nepal');

  if (states.includes('compare') || states.includes('compare-differ')) {
    await page.getByRole('button', { name: 'Compare with another passport' }).click();
    await choose('Second passport', 'india');
    await page.waitForTimeout(3000);
    await shot('compare');
    await page.getByText('Where they differ').click();
    await page.waitForTimeout(1500);
    await shot('compare-differ');
    await page.getByRole('button', { name: 'Stop comparing' }).click();
    await page.waitForTimeout(1500);
  }

  if (states.includes('detail')) {
    await page.getByPlaceholder('Search destinations').fill('south korea');
    await page.getByRole('button', { name: /South Korea/ }).click();
    await page.waitForTimeout(2500);
    await shot('detail');
  }

  await context.close();
}
await browser.close();

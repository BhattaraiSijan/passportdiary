import { expect, test } from '@playwright/test';
import { choose, legendCount, openApp } from './helpers.ts';

openApp();

test('shows the data date and attribution on every view', async ({ page }) => {
  const footer = page.locator('.footer');
  await expect(footer).toContainText('Data as of 20 July 2026');
  await expect(footer).toContainText('CC BY-SA 4.0');
  await page.getByRole('button', { name: 'Credits and licences' }).click();
  await expect(page.getByRole('dialog')).toContainText('Natural Earth');
});

test('shows entry rules for a Nepali passport', async ({ page }) => {
  await choose(page, 'Your passport', 'nepal');

  await expect(legendCount(page, 'Visa-free')).toHaveText('11');
  await expect(legendCount(page, 'Visa required')).toHaveText('115');
  await expect(page.locator('.summary')).toContainText('29 of 198 destinations');
  // Each term in the key says what it means.
  await expect(page.locator('.legend-item', { hasText: 'eVisa' })).toContainText(
    'Apply online before you travel',
  );

  // Key and list are two views of the same numbers.
  const group = page.locator('.group', { hasText: 'Visa-free' });
  await expect(group.locator('.row')).toHaveCount(11);
  await expect(group.getByRole('button', { name: /India/ })).toContainText('Free movement');
  await expect(page.locator('.list .row')).toHaveCount(199);
});

test('explains a destination where the sources disagree', async ({ page }) => {
  await choose(page, 'Your passport', 'nepal');
  await page.getByPlaceholder('Search destinations').fill('south korea');
  await page.getByRole('button', { name: /South Korea/ }).click();

  const panel = page.locator('.panel');
  await expect(panel.getByRole('heading', { name: 'South Korea' })).toBeFocused();
  // The journey is named in full: which passport, to which country.
  await expect(panel.locator('.route-stop').first()).toHaveText(/Passport\s*Nepal/);
  await expect(panel.locator('.route-end')).toHaveText(/Destination\s*South Korea/);
  await expect(page.locator('.summary h2')).toHaveText(/Passport\s*Nepal/);
  await expect(panel.locator('.verdict')).toHaveText('Visa required');
  await expect(panel.locator('.claims')).toContainText('Passport Index: eVisa');
  await expect(panel.locator('.claims')).toContainText('Wikipedia: Visa required');
  // The key stays within reach while a country is open.
  await expect(page.locator('.legend')).toBeVisible();

  await page.getByRole('button', { name: 'Back to all destinations' }).click();
  await expect(page.getByPlaceholder('Search destinations')).toBeVisible();
});

test('filters the list from the key', async ({ page }) => {
  await choose(page, 'Your passport', 'nepal');
  await page.locator('.legend-item', { hasText: 'Visa on arrival' }).click();
  await expect(page.locator('.list .group')).toHaveCount(1);
  await expect(page.locator('.list .row')).toHaveCount(18);
  await page.getByRole('button', { name: 'Show all', exact: true }).click();
  await expect(page.locator('.list .row')).toHaveCount(199);
});

test('compares two passports', async ({ page }) => {
  await choose(page, 'Your passport', 'nepal');
  await page.getByRole('button', { name: 'Compare with another passport' }).click();
  await choose(page, 'Second passport', 'india');

  await expect(legendCount(page, 'Home country')).toHaveText('2');
  await page.getByText('Where they differ').click();
  await expect(legendCount(page, 'Easier with Nepal')).toHaveText('7');
  await expect(legendCount(page, 'Easier with India')).toHaveText('42');
  await expect(page.locator('.summary')).toContainText('42 destinations are easier with India');
  await expect(page.getByRole('button', { name: /Bangladesh/ })).toContainText('India: Visa required');

  await page.getByRole('button', { name: 'Stop comparing' }).click();
  await expect(legendCount(page, 'Visa required')).toHaveText('115');
});

test('remembers the passport on the next visit', async ({ page }) => {
  await choose(page, 'Your passport', 'japan');
  await expect(page.locator('.legend')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Your passport' })).toHaveValue('Japan');
  await expect(page.locator('.legend')).toBeVisible();
});

test('draws the globe and opens a country from it', async ({ page, isMobile }) => {
  if (!isMobile) await page.setViewportSize({ width: 1920, height: 1000 });
  await choose(page, 'Your passport', 'nepal');
  const canvas = page.locator('.globe canvas');
  await expect(canvas).toBeVisible();
  // The globe centres on the home country, between the two pages. Ask the page
  // where the globe is, and click its middle: that is Nepal.
  const globe = page.locator('.globe');
  const place = () =>
    globe.evaluate((el: HTMLElement) =>
      ['--globe-x', '--globe-y', '--globe-r'].map((name) =>
        parseFloat(el.style.getPropertyValue(name)),
      ),
    );
  // Wait until the globe has left the start screen, where only its top shows,
  // and has come to rest between the pages.
  await expect(page.locator('.legend')).toBeVisible();
  const box = (await globe.boundingBox())!;
  let [x, y, r] = await place();
  await expect(async () => {
    const before = [x, y, r];
    await page.waitForTimeout(600);
    [x, y, r] = await place();
    expect(y! + r!).toBeLessThan(box.height);
    expect([x, y, r]).toEqual(before);
  }).toPass({ timeout: 20_000 });
  await page.waitForTimeout(600);
  if (!isMobile) expect(Math.abs(box.x + x! - 960)).toBeLessThan(2);
  await page.mouse.click(box.x + x!, box.y + y!);
  await expect(page.locator('.panel h2')).toHaveText('Nepal');
});

test('works from the list when the globe cannot start', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type === 'webgl2') return null;
      return (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  await page.reload();
  await expect(page.getByText('This browser cannot draw the globe')).toBeVisible();
  await choose(page, 'Your passport', 'nepal');
  await expect(page.locator('.list .row')).toHaveCount(199);
});

test('sets key and list on two facing pages of equal size', async ({ page, isMobile }) => {
  if (!isMobile) await page.setViewportSize({ width: 1360, height: 820 });
  await choose(page, 'Your passport', 'nepal');
  const brief = page.locator('.brief');
  const side = page.locator('.side');
  await expect(brief.locator('.legend')).toBeVisible();
  await expect(side.locator('.list .row')).toHaveCount(199);
  if (isMobile) return;
  const left = (await brief.boundingBox())!;
  const right = (await side.boundingBox())!;
  expect(Math.abs(left.width - right.width)).toBeLessThan(1);
  expect(Math.abs(left.y - right.y)).toBeLessThan(1);
  expect(Math.abs(left.height - right.height)).toBeLessThan(1);
  // Equal margins, so the globe between them is on the centre line of the page.
  expect(Math.abs(left.x - (1360 - right.x - right.width))).toBeLessThan(1);
});

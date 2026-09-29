import { expect, test, type Page } from '@playwright/test';

async function choose(page: Page, label: string, text: string) {
  const box = page.getByRole('combobox', { name: label });
  await box.click();
  await box.fill(text);
  await page.keyboard.press('Enter');
}

const legendCount = (page: Page, label: string) =>
  page.locator('.legend-item', { hasText: label }).locator('.count');

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Where can your passport take you?' })).toBeVisible();
  pageErrors.set(page, errors);
});

test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('shows the data date and attribution on every view', async ({ page }) => {
  const footer = page.locator('.footer');
  await expect(footer).toContainText('Data as of 20 July 2026');
  await expect(footer).toContainText('CC BY-SA 4.0');
  await page.getByRole('button', { name: 'Credits and licences' }).click();
  await expect(page.getByRole('dialog')).toContainText('Natural Earth');
});

test('keeps the side panel away until a passport is chosen', async ({ page }) => {
  await expect(page.locator('.side')).toHaveCount(0);
  await choose(page, 'Your passport', 'nepal');
  await expect(page.locator('.side')).toBeVisible();
});

test('shows entry rules for a Nepali passport', async ({ page }) => {
  await choose(page, 'Your passport', 'nepal');

  await expect(legendCount(page, 'Visa-free')).toHaveText('11');
  await expect(legendCount(page, 'Visa required')).toHaveText('115');

  // Legend and list are two views of the same numbers.
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
  await expect(panel.locator('.verdict')).toHaveText('Visa required');
  await expect(panel.locator('.claims')).toContainText('Passport Index: eVisa');
  await expect(panel.locator('.claims')).toContainText('Wikipedia: Visa required');

  await page.getByRole('button', { name: 'Back to all destinations' }).click();
  await expect(page.getByPlaceholder('Search destinations')).toBeVisible();
});

test('filters the list from the legend', async ({ page }) => {
  await choose(page, 'Your passport', 'nepal');
  await page.locator('.legend-item', { hasText: 'Visa on arrival' }).click();
  await expect(page.locator('.list .group')).toHaveCount(1);
  await expect(page.locator('.list .row')).toHaveCount(18);
  await page.getByRole('button', { name: 'Show all' }).click();
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
  // On a wide screen the globe is centred on the page, between legend and side panel.
  if (!isMobile) await page.setViewportSize({ width: 1920, height: 1000 });
  await choose(page, 'Your passport', 'nepal');
  const canvas = page.locator('.globe canvas');
  await expect(canvas).toBeVisible();
  // The globe centres on the home country, so the middle of the canvas is Nepal.
  await page.waitForTimeout(1500);
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
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

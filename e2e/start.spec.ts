import { expect, test } from '@playwright/test';
import { choose, legendCount, openApp, startHeading } from './helpers.ts';

// The first visit: what a newcomer sees, and the tips that follow.

openApp();

test('start screen leads to the passport field and nothing is in the way', async ({ page }) => {
  await expect(page.getByRole('combobox', { name: 'Your passport' })).toBeVisible();
  await expect(page.getByPlaceholder('Choose your passport')).toBeVisible();
  await expect(page.locator('.key-preview')).toContainText('Visa on arrival');
  // No tour, no popup: nothing has to be closed first, and no page is empty.
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator('.side, .brief, .hint')).toHaveCount(0);
  // The field is the only way in: no shortcut passports.
  await expect(page.locator('.examples, .example')).toHaveCount(0);
  // The field is on the centre line of the page.
  const box = (await page.getByRole('combobox', { name: 'Your passport' }).boundingBox())!;
  const width = page.viewportSize()!.width;
  expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(1);
});

test('keeps the pages away until a passport is chosen', async ({ page }) => {
  await expect(page.locator('.side')).toHaveCount(0);
  await expect(page.locator('.brief')).toHaveCount(0);
  await choose(page, 'Your passport', 'nepal');
  await expect(page.locator('.side')).toBeVisible();
  await expect(page.locator('.brief')).toBeVisible();
  await expect(startHeading(page)).toHaveCount(0);
});

test('a click on the globe before choosing leads to the passport field', async ({ page }) => {
  const canvas = page.locator('.globe canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(1500);
  const box = (await canvas.boundingBox())!;
  // Land is under this point on the start screen, where the globe rises from below.
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);

  await expect(startHeading(page)).toBeVisible();
  await expect(page.locator('.side, .brief')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Your passport' })).toBeFocused();

  await page.keyboard.type('nepal');
  await page.keyboard.press('Enter');
  await expect(legendCount(page, 'Visa-free')).toHaveText('11');
});

test('a returning visitor goes straight to the globe', async ({ page }) => {
  await choose(page, 'Your passport', 'nepal');
  await expect(page.locator('.legend')).toBeVisible();
  await page.reload();
  await expect(page.locator('.legend')).toBeVisible();
  await expect(startHeading(page)).toHaveCount(0);
  await expect(page.locator('.key-preview')).toHaveCount(0);
});

test('tips follow what the person has done', async ({ page }) => {
  await choose(page, 'Your passport', 'nepal');
  const hint = page.locator('.hint');
  await expect(hint).toContainText('Tap a country on the globe');

  await page.getByPlaceholder('Search destinations').fill('bhutan');
  await page.getByRole('button', { name: /Bhutan/ }).click();
  await expect(page.locator('.panel .verdict')).toHaveText('eVisa');
  await expect(hint).toContainText('Tap a colour in the key');

  await page.locator('.legend-item', { hasText: 'Visa-free' }).click();
  await expect(hint).toContainText('Do you hold two passports?');

  await page.getByRole('button', { name: 'Compare with another passport' }).click();
  await expect(hint).toHaveCount(0);
});

test('tips stay hidden once hidden', async ({ page }) => {
  await choose(page, 'Your passport', 'nepal');
  await expect(page.locator('.hint')).toBeVisible();
  await page.getByRole('button', { name: 'Hide tips' }).click();
  await expect(page.locator('.hint')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.legend')).toBeVisible();
  await expect(page.locator('.hint')).toHaveCount(0);
});

test('forgets the design choice of the earlier version', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('passportdiary.design', '2'));
  await page.goto('/?design=2');
  await expect(startHeading(page)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('passportdiary.design'))).toBeNull();
  await expect(page.locator('.switcher')).toHaveCount(0);
});

test('the name leads back to the start screen', async ({ page }) => {
  await choose(page, 'Your passport', 'nepal');
  await page.getByRole('button', { name: 'Compare with another passport' }).click();
  await choose(page, 'Second passport', 'india');
  await page.locator('.legend-item', { hasText: 'Visa-free' }).click();
  await page.getByRole('button', { name: 'Hide tips' }).click();

  const name = page.getByRole('button', { name: 'PassportDiary, start over' });
  await name.focus();
  await expect(name).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(startHeading(page)).toBeVisible();
  await expect(page.locator('.side, .brief')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Your passport' })).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'Second passport' })).toHaveCount(0);

  await page.reload();
  await expect(startHeading(page)).toBeVisible();
  await expect(page.locator('.side, .brief')).toHaveCount(0);

  // Starting over does not bring back the tips, nor the comparison or the filter.
  await choose(page, 'Your passport', 'nepal');
  await expect(page.locator('.list .row')).toHaveCount(199);
  await expect(page.locator('.hint')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Second passport' })).toHaveCount(0);
});

test('the fields can be emptied', async ({ page }) => {
  await choose(page, 'Your passport', 'nepal');
  await page.getByRole('button', { name: 'Compare with another passport' }).click();
  await expect(page.getByRole('button', { name: 'Clear second passport' })).toHaveCount(0);
  await choose(page, 'Second passport', 'india');
  await expect(legendCount(page, 'Home country')).toHaveText('2');

  await page.getByRole('button', { name: 'Clear second passport' }).click();
  await expect(page.getByRole('combobox', { name: 'Second passport' })).toHaveValue('');
  await expect(legendCount(page, 'Home country')).toHaveText('1');

  await page.getByRole('button', { name: 'Clear passport', exact: true }).click();
  await expect(startHeading(page)).toBeVisible();
  await page.reload();
  await expect(startHeading(page)).toBeVisible();
});

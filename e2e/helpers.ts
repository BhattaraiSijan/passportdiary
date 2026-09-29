import { expect, test, type Page } from '@playwright/test';

export async function choose(page: Page, label: string, text: string) {
  const box = page.getByRole('combobox', { name: label });
  await box.click();
  await box.fill(text);
  await page.keyboard.press('Enter');
}

export const legendCount = (page: Page, label: string) =>
  page.locator('.legend-item', { hasText: label }).locator('.count');

export const startHeading = (page: Page) =>
  page.getByRole('heading', { name: 'Where can your passport take you?' });

// Every test opens the start screen and fails on any error in the page.
export function openApp() {
  const pageErrors = new WeakMap<Page, string[]>();

  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto('/');
    await expect(startHeading(page)).toBeVisible();
    pageErrors.set(page, errors);
  });

  test.afterEach(({ page }) => {
    expect(pageErrors.get(page)).toEqual([]);
  });
}

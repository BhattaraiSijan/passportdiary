import { expect, test, type Page } from '@playwright/test';

// The design directions under ?design=1..3. Direction 1 is the default.
// The first design (?design=0) is covered by app.spec.ts.

async function choose(page: Page, label: string, text: string) {
  const box = page.getByRole('combobox', { name: label });
  await box.click();
  await box.fill(text);
  await page.keyboard.press('Enter');
}

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  pageErrors.set(page, errors);
});

test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

for (const design of [1, 2, 3]) {
  test.describe(`design ${design}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/?design=${design}`);
      await expect(page.getByRole('heading', { name: 'Where can your passport take you?' })).toBeVisible();
    });

    test('start screen leads to the passport field and nothing is in the way', async ({ page }) => {
      await expect(page.locator('html')).toHaveAttribute('data-design', String(design));
      await expect(page.getByRole('combobox', { name: 'Your passport' })).toBeVisible();
      await expect(page.getByPlaceholder('Choose your passport')).toBeVisible();
      await expect(page.locator('.key-preview')).toContainText('Visa on arrival');
      // No tour, no popup: nothing has to be closed first, and no panel is empty.
      await expect(page.locator('dialog[open]')).toHaveCount(0);
      await expect(page.locator('.side, .brief, .board, .dock, .hint')).toHaveCount(0);
    });

    test('an example passport starts the visit', async ({ page }) => {
      await page.getByRole('button', { name: 'Try Nepal' }).click();
      await expect(page.getByRole('combobox', { name: 'Your passport' })).toHaveValue('Nepal');
      await expect(page.locator('.legend-item', { hasText: 'Visa-free' }).locator('.count')).toHaveText('11');
      await expect(page.locator('.summary')).toContainText('29 of 198 destinations');
      await expect(page.getByRole('heading', { name: 'Where can your passport take you?' })).toHaveCount(0);
    });

    test('tips follow what the person has done, and stay hidden once hidden', async ({ page, isMobile }) => {
      await choose(page, 'Your passport', 'nepal');
      const hint = page.locator('.hint');
      await expect(hint).toContainText('Tap a country on the globe');

      if (design === 3 && !isMobile) {
        await page.getByRole('button', { name: 'Show all destinations' }).click();
      }
      await page.getByPlaceholder('Search destinations').fill('bhutan');
      await page.getByRole('button', { name: /Bhutan/ }).click();
      await expect(page.locator('.panel .verdict')).toHaveText('eVisa');
      await expect(hint).toContainText('Tap a colour in the key');
      // The key stays within reach while a country is open.
      await expect(page.locator('.legend')).toBeVisible();

      await page.getByRole('button', { name: 'Hide tips' }).click();
      await expect(hint).toHaveCount(0);
      await page.reload();
      await expect(page.locator('.legend')).toBeVisible();
      await expect(page.locator('.hint')).toHaveCount(0);
    });

    test('the key filters the list and handles compare', async ({ page, isMobile }) => {
      await choose(page, 'Your passport', 'nepal');
      if (design === 3 && !isMobile) {
        await expect(page.locator('.list')).toHaveCount(0);
        await page.getByRole('button', { name: 'Show all destinations' }).click();
      }
      await expect(page.locator('.list .row')).toHaveCount(199);
      await page.locator('.legend-item', { hasText: 'Visa on arrival' }).click();
      await expect(page.locator('.list .row')).toHaveCount(18);
      await page.getByRole('button', { name: 'Show all' , exact: true }).click();

      await page.getByRole('button', { name: 'Compare with another passport' }).click();
      await choose(page, 'Second passport', 'india');
      await page.getByText('Where they differ').click();
      await expect(page.locator('.legend-item', { hasText: 'Easier with India' }).locator('.count')).toHaveText('42');
      await expect(page.locator('.summary')).toContainText('42 destinations are easier with India');
    });
  });
}

test('key and list share one surface in designs 2 and 3', async ({ page, isMobile }) => {
  await page.goto('/?design=2');
  await choose(page, 'Your passport', 'nepal');
  await expect(page.locator('.board .legend')).toBeVisible();
  await expect(page.locator('.board .list .row')).toHaveCount(199);

  await page.goto('/?design=3');
  await expect(page.locator('.dock .legend')).toBeVisible();
  if (!isMobile) await page.getByRole('button', { name: 'Show all destinations' }).click();
  await expect(page.locator('.dock .list .row')).toHaveCount(199);
});

test('the plain address shows direction 1, and ?design=0 the first design', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-design', '1');
  await expect(page.getByRole('button', { name: 'Try Nepal' })).toBeVisible();
  await expect(page.locator('.side, .brief')).toHaveCount(0);

  await page.goto('/?design=0');
  await expect(page.locator('html')).not.toHaveAttribute('data-design');
  await expect(page.getByRole('button', { name: 'Try Nepal' })).toHaveCount(0);
});

test('direction 1 keeps key and list on two facing pages', async ({ page, isMobile }) => {
  if (!isMobile) await page.setViewportSize({ width: 1360, height: 820 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try Nepal' }).click();
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

test('the switcher changes design and the choice is remembered', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-design', '1');
  await page.getByRole('button', { name: 'Design: Departures' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-design', '2');
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-design', '2');
  await page.getByRole('button', { name: 'Design: Current' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-design');
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveAttribute('data-design');
});

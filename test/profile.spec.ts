import { test, expect, type Page } from '@playwright/test';

const PWA_DISMISS_KEY = 'pwa_install_dismissed_at';

async function gotoAndSettle(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key: string) => {
    window.localStorage.setItem(key, String(Date.now()));
  }, PWA_DISMISS_KEY);
});

test.describe('Protected routes (mobile)', () => {
  test('/profile without session redirects to /login', async ({ page }) => {
    await gotoAndSettle(page, '/profile');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('/admin without session redirects to /login', async ({ page }) => {
    await gotoAndSettle(page, '/admin');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('/home without session redirects to /login', async ({ page }) => {
    await gotoAndSettle(page, '/home');
    await expect(page).toHaveURL(/\/login$/);
  });
});

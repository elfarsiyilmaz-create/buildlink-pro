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

test.describe('Public navigation (mobile)', () => {
  test('login page is reachable and main content fits mobile layout', async ({ page }) => {
    await gotoAndSettle(page, '/login');
    await expect(page).toHaveURL(/\/login$/);
    const main = page.locator('#main-content');
    await expect(main).toBeVisible();
    const box = await main.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(page.viewportSize()?.width ?? 430);
    }
  });

  test('register page is reachable', async ({ page }) => {
    await gotoAndSettle(page, '/register');
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByText('ALHAN GROEP', { exact: true })).toBeVisible();
  });

  test('forgot-password page is reachable', async ({ page }) => {
    await gotoAndSettle(page, '/forgot-password');
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole('heading', { name: 'Wachtwoord herstellen' })).toBeVisible();
  });

  test('unknown route shows 404 page', async ({ page }) => {
    await gotoAndSettle(page, '/route-does-not-exist-xyz');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByText('Oops! Page not found')).toBeVisible();
  });

  test('unauthenticated /profile redirects to /login', async ({ page }) => {
    await gotoAndSettle(page, '/profile');
    await expect(page).toHaveURL(/\/login$/);
  });
});

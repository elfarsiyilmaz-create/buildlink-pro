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

test.describe('Auth flows (mobile)', () => {
  test('login page loads with logo, email field, and sign-in button', async ({ page }) => {
    await gotoAndSettle(page, '/login');
    await expect(page.getByText('ALHAN GROEP', { exact: true })).toBeVisible();
    await expect(page.getByLabel('E-mailadres')).toBeVisible();
    await expect(page.locator('#main-content form').getByRole('button', { name: 'Inloggen' })).toBeVisible();
  });

  test('login validation blocks empty submit (HTML5 or invalid fields)', async ({ page }) => {
    await gotoAndSettle(page, '/login');
    const email = page.getByLabel('E-mailadres');
    const password = page.getByLabel('Wachtwoord', { exact: true });
    await page.locator('#main-content form').getByRole('button', { name: 'Inloggen' }).click();
    const emailInvalid = await email.evaluate((el: HTMLInputElement) => !el.checkValidity());
    const passwordInvalid = await password.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(emailInvalid || passwordInvalid).toBe(true);
  });

  test('register page loads with name, email, and password fields', async ({ page }) => {
    await gotoAndSettle(page, '/register');
    await expect(page.getByLabel('Volledige naam')).toBeVisible();
    await expect(page.getByLabel('E-mailadres')).toBeVisible();
    await expect(page.getByLabel('Wachtwoord', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Wachtwoord bevestigen')).toBeVisible();
  });

  test('register validation blocks empty submit', async ({ page }) => {
    await gotoAndSettle(page, '/register');
    await page.locator('#main-content form').getByRole('button', { name: 'Registreren' }).click();
    const fullName = page.getByLabel('Volledige naam');
    await expect(fullName).toHaveJSProperty('validity.valueMissing', true);
  });

  test('forgot-password page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });
    await gotoAndSettle(page, '/forgot-password');
    await expect(page.getByRole('heading', { name: 'Wachtwoord herstellen' })).toBeVisible();
    expect(errors, 'No uncaught page errors').toEqual([]);
  });
});

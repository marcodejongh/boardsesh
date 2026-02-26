/**
 * Activity Feed E2E Tests
 *
 * Validates that the activity feed loads correctly for both authenticated
 * and unauthenticated users, and that authenticated users never see a
 * flash of the empty state ("Follow climbers...") due to race conditions.
 *
 * Prerequisites:
 *   - Dev server running: npm run dev
 *   - For authenticated tests: TEST_USER_EMAIL and TEST_USER_PASSWORD env vars
 *     (defaults: test@boardsesh.com / test from the dev-db Docker image)
 */
import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAsTestUser(page: Page) {
  const email = process.env.TEST_USER_EMAIL || 'test@boardsesh.com';
  const password = process.env.TEST_USER_PASSWORD || 'test';

  // Open user drawer and click "Sign in"
  await page.getByLabel('User menu').click();
  await page.waitForSelector('.MuiDrawer-root .MuiPaper-root', { state: 'visible' });
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForSelector('input#login_email', { state: 'visible' });

  // Fill login form
  await page.locator('input#login_email').fill(email);
  await page.locator('input#login_password').fill(password);
  await page.locator('button[type="submit"]').filter({ hasText: 'Login' }).click();

  // Wait for login modal to close
  await page.waitForSelector('input#login_email', { state: 'hidden', timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Unauthenticated tests
// ---------------------------------------------------------------------------

test.describe('Activity Feed — Unauthenticated', () => {
  test('trending feed loads with items', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Feed items should be visible
    const feedItems = page.locator('[data-testid="activity-feed-items"]');
    await expect(feedItems).toBeVisible({ timeout: 15000 });

    // "Follow climbers" empty state should NOT be visible
    await expect(page.getByText('Follow climbers to see their activity here')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Authenticated tests
// ---------------------------------------------------------------------------

test.describe('Activity Feed — Authenticated', () => {
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  test.skip(
    !testEmail && !testPassword && process.env.CI !== 'true',
    'Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars to run authenticated tests (skipped outside CI)',
  );

  test('activity feed loads without flashing empty state', async ({ page }) => {
    // Login first on a board page (where the user drawer is available)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await loginAsTestUser(page);

    // Install a MutationObserver BEFORE navigating to catch any flash of the empty state
    await page.evaluate(() => {
      (window as unknown as Record<string, boolean>).__emptyStateFlashed = false;
      const observer = new MutationObserver(() => {
        if (document.querySelector('[data-testid="activity-feed-empty-state"]')) {
          (window as unknown as Record<string, boolean>).__emptyStateFlashed = true;
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    // Navigate to home page
    await page.goto('/');

    // Wait for feed items to appear
    const feedItems = page.locator('[data-testid="activity-feed-items"]');
    await expect(feedItems).toBeVisible({ timeout: 20000 });

    // Check that the empty state was never flashed
    const emptyStateFlashed = await page.evaluate(
      () => (window as unknown as Record<string, boolean>).__emptyStateFlashed,
    );
    expect(emptyStateFlashed).toBe(false);
  });

  test('feed persists through sort change', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await loginAsTestUser(page);

    // Navigate to home and wait for feed
    await page.goto('/');
    const feedItems = page.locator('[data-testid="activity-feed-items"]');
    await expect(feedItems).toBeVisible({ timeout: 20000 });

    // Change sort mode by clicking the sort selector
    const sortButton = page.getByRole('button', { name: /new|top|hot|controversial/i });
    if (await sortButton.isVisible()) {
      await sortButton.click();

      // Pick a different sort option from the menu
      const topOption = page.getByRole('menuitem', { name: /top/i });
      if (await topOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await topOption.click();

        // Feed should load items (not show a permanent empty state)
        await expect(feedItems).toBeVisible({ timeout: 15000 });
      }
    }

    // "Follow climbers" empty state should not be visible
    await expect(page.getByText('Follow climbers to see their activity here')).not.toBeVisible();
  });
});

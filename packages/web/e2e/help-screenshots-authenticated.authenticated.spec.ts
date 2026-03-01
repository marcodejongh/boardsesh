/**
 * Authenticated Help Page Screenshot Generation Tests
 *
 * These tests use the pre-authenticated storageState from auth.setup.ts,
 * so no login flow is needed in beforeEach.
 *
 * Run with 1Password CLI:
 *   TEST_USER_EMAIL=$(op read "op://Boardsesh/Boardsesh local/username") \
 *   TEST_USER_PASSWORD=$(op read "op://Boardsesh/Boardsesh local/password") \
 *   npx playwright test e2e/help-screenshots-authenticated.authenticated.spec.ts
 */
import { test, expect } from '@playwright/test';

const SCREENSHOT_DIR = 'public/help';
const boardUrl = '/kilter/original/12x12-square/screw_bolt/40/list';

test.describe('Help Page Screenshots - Authenticated', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  test.skip(!testEmail || !testPassword, 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars to run authenticated tests');

  test.beforeEach(async ({ page }) => {
    await page.goto(boardUrl);
    await page.waitForSelector('#onboarding-climb-card, [data-testid="climb-card"]', { timeout: 30000 })
      .catch(() => page.waitForLoadState('domcontentloaded'));
  });

  test('personal progress filters', async ({ page }) => {
    // Open search drawer to show filters including personal progress
    await page.locator('#onboarding-search-button').click();
    await page.getByText('Grade').first().waitFor({ state: 'visible' });

    // Expand the Progress section
    await page.getByText('Progress').click();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/personal-progress.png` });
  });

  test('party mode active session', async ({ page, context }) => {
    test.slow(); // WebSocket connection setup can be slow in CI

    // Grant geolocation permission so session creation doesn't wait for permission prompt
    await context.grantPermissions(['geolocation']);

    // First add a climb to queue so the queue bar appears
    const climbCard = page.locator('#onboarding-climb-card');
    await climbCard.dblclick();

    // Wait for queue bar
    const queueBar = page.locator('[data-testid="queue-control-bar"]');
    await expect(queueBar).toBeVisible({ timeout: 10000 });

    // Open party mode drawer
    await page.locator('[data-testid="queue-control-bar"]').getByLabel('Party Mode').click();
    await page.locator('[data-swipeable-drawer="true"]:visible').first().waitFor({ timeout: 10000 });

    // Start a party session
    await page.getByRole('button', { name: 'Start Party Mode' }).click();

    // Wait for session to be active - WebSocket connection needs time to establish
    await page.waitForSelector('button:has-text("Leave")', { state: 'visible', timeout: 30000 });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/party-mode-active.png` });

    // Leave the session to clean up
    await page.getByRole('button', { name: 'Leave' }).click();
  });

  test('hold classification wizard', async ({ page }) => {
    // Open user drawer and click Classify Holds
    await page.getByLabel('User menu').click();
    await page.getByText('Classify Holds').waitFor({ state: 'visible' });
    await page.getByText('Classify Holds').click();

    // Wait for wizard content to load
    await page.waitForSelector('.MuiRating-root, .MuiLinearProgress-root', { state: 'visible', timeout: 10000 });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/hold-classification.png` });
  });

  test('settings aurora sync', async ({ page }) => {
    // Navigate to settings page
    await page.goto('/settings');
    // Wait for settings page content to load
    await page.waitForSelector('.MuiCard-root', { state: 'visible' });

    // Scroll to Board Accounts section
    await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll('h4, .MuiCardHeader-title'))
        .find(el => el.textContent?.includes('Board Accounts'));
      if (heading) {
        heading.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-aurora.png` });
  });
});

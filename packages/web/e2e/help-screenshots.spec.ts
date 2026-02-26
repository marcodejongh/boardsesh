/**
 * Help Page Screenshot Generation Tests
 *
 * These tests generate screenshots for the help page documentation.
 * They use a mobile viewport since the help screenshots show the mobile UI.
 *
 * Run all tests (unauthenticated only):
 *   npx playwright test e2e/help-screenshots.spec.ts
 *
 * Run with authenticated tests using 1Password CLI:
 *   TEST_USER_EMAIL=$(op read "op://Boardsesh/Boardsesh local/username") \
 *   TEST_USER_PASSWORD=$(op read "op://Boardsesh/Boardsesh local/password") \
 *   npx playwright test e2e/help-screenshots.spec.ts
 *
 * Prerequisites:
 *   - Dev server running: npm run dev
 *   - For authenticated tests: 1Password CLI installed and signed in
 */
import { test, expect } from '@playwright/test';

const SCREENSHOT_DIR = 'public/help';
const boardUrl = '/kilter/original/12x12-square/screw_bolt/40/list';

test.describe('Help Page Screenshots', () => {
  // Use mobile viewport - help screenshots show mobile UI, and many
  // interactive elements (search pill, drawers) are mobile-only.
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.goto(boardUrl);
    await page.waitForSelector('#onboarding-climb-card, [data-testid="climb-card"]', { timeout: 30000 })
      .catch(() => page.waitForLoadState('networkidle'));
  });

  test('main interface', async ({ page }) => {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/main-interface.png` });
  });

  test('search filters', async ({ page }) => {
    // Open search drawer via the search pill in the header
    await page.locator('#onboarding-search-button').click();
    // Wait for the search form content to appear
    await page.getByText('Grade').first().waitFor({ state: 'visible' });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/search-filters.png` });
  });

  test('search by hold', async ({ page }) => {
    // Open search drawer and expand the "Holds" section
    await page.locator('#onboarding-search-button').click();
    await page.getByText('Grade').first().waitFor({ state: 'visible' });
    // Click the "Holds" collapsible section to expand it (exact match to avoid "Classify Holds" etc.)
    await page.getByText('Holds', { exact: true }).click();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/search-by-hold.png` });
  });

  test('heatmap', async ({ page }) => {
    // Open search drawer and expand the "Holds" section
    await page.locator('#onboarding-search-button').click();
    await page.getByText('Grade').first().waitFor({ state: 'visible' });
    await page.getByText('Holds', { exact: true }).click();

    // Click "Show Heatmap" button within the holds section
    await page.getByRole('button', { name: 'Show Heatmap' }).click();

    // Wait for heatmap loading to complete
    await page.waitForSelector('text=Loading heatmap...', { state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForSelector('button:has-text("Hide Heatmap")', { state: 'visible' });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/heatmap.png` });
  });

  test('climb detail', async ({ page }) => {
    // Double-click first climb to add it to the queue
    const climbCard = page.locator('#onboarding-climb-card');
    await climbCard.dblclick();

    // Wait for queue bar to appear, then click it to open the play drawer
    const queueBar = page.locator('[data-testid="queue-control-bar"]');
    await expect(queueBar).toBeVisible({ timeout: 10000 });
    // Click the queue toggle text to open play drawer with climb details
    await page.locator('#onboarding-queue-toggle').click();
    // Wait for play drawer to open
    await page.locator('[data-swipeable-drawer="true"]:visible').first().waitFor({ timeout: 10000 });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/climb-detail.png` });
  });

  test('party mode modal', async ({ page }) => {
    // First add a climb to queue so the queue bar appears
    const climbCard = page.locator('#onboarding-climb-card');
    await climbCard.dblclick();

    // Wait for queue bar
    const queueBar = page.locator('[data-testid="queue-control-bar"]');
    await expect(queueBar).toBeVisible({ timeout: 10000 });

    // Click party mode button scoped to the queue bar to avoid strict mode violation
    await page.locator('[data-testid="queue-control-bar"]').getByLabel('Party Mode').click();
    await page.locator('[data-swipeable-drawer="true"]:visible').first().waitFor({ timeout: 10000 });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/party-mode.png` });
  });

  test('login modal', async ({ page }) => {
    // Open user drawer
    await page.getByLabel('User menu').click();
    // Wait for user drawer content to appear
    await page.getByRole('button', { name: 'Sign in' }).waitFor({ state: 'visible' });

    // Click "Sign in" button in the user drawer
    await page.getByRole('button', { name: 'Sign in' }).click();
    // Wait for auth modal with login form
    await page.waitForSelector('input#login_email', { state: 'visible' });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/login-modal.png` });
  });
});

// Authenticated tests - requires TEST_USER_EMAIL and TEST_USER_PASSWORD env vars
test.describe('Help Page Screenshots - Authenticated', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  test.skip(!testEmail || !testPassword, 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars to run authenticated tests');

  test.beforeEach(async ({ page }) => {
    await page.goto(boardUrl);
    await page.waitForSelector('#onboarding-climb-card, [data-testid="climb-card"]', { timeout: 30000 })
      .catch(() => page.waitForLoadState('networkidle'));

    // Login via user drawer
    await page.getByLabel('User menu').click();
    await page.getByRole('button', { name: 'Sign in' }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForSelector('input#login_email', { state: 'visible' });

    // Fill login form
    await page.locator('input#login_email').fill(testEmail!);
    await page.locator('input#login_password').fill(testPassword!);
    await page.locator('button[type="submit"]').filter({ hasText: 'Login' }).click();

    // Wait for login to complete - auth modal should close
    await page.waitForSelector('input#login_email', { state: 'hidden', timeout: 10000 });
  });

  test('personal progress filters', async ({ page }) => {
    // Open search drawer to show filters including personal progress
    await page.locator('#onboarding-search-button').click();
    await page.getByText('Grade').first().waitFor({ state: 'visible' });

    // Expand the Progress section
    await page.getByText('Progress').click();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/personal-progress.png` });
  });

  test('party mode active session', async ({ page }) => {
    test.slow(); // WebSocket connection setup can be slow in CI

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

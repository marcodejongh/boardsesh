/**
 * Help Page Screenshot Generation Tests
 *
 * These tests generate screenshots for the help page documentation.
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
import { test } from '@playwright/test';

const SCREENSHOT_DIR = 'public/help';

test.describe('Help Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Start from home, select Kilter board with defaults
    await page.goto('/');

    // Wait for the page to load
    await page.waitForSelector('[role="combobox"]');

    // Click the board dropdown and select Kilter
    await page.locator('input[role="combobox"]').first().click();
    await page.getByRole('option', { name: 'Kilter' }).click();

    // Click Start Climbing button
    await page.getByRole('button', { name: 'Start Climbing' }).click();

    // Wait for the board page to load - wait for climb list or board to render
    await page.waitForURL(/\/kilter\//);
    await page.waitForSelector('[data-testid="board-renderer"], .ant-list-items', { timeout: 10000 }).catch(() => {
      // Fallback: wait for any main content to appear
      return page.waitForSelector('.ant-layout-content', { state: 'visible' });
    });
  });

  test('main interface', async ({ page }) => {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/main-interface.png` });
  });

  test('search filters', async ({ page }) => {
    await page.getByRole('tab', { name: 'Search', exact: true }).click();
    // Wait for search form content to be visible
    await page.waitForSelector('.ant-collapse, .ant-form', { state: 'visible' });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/search-filters.png` });
  });

  test('search by hold', async ({ page }) => {
    await page.getByRole('tab', { name: 'Search by Hold' }).click();
    // Wait for the hold search tab content
    await page.waitForSelector('button:has-text("Show Heatmap"), button:has-text("Hide Heatmap")', { state: 'visible' });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/search-by-hold.png` });
  });

  test('heatmap', async ({ page }) => {
    await page.getByRole('tab', { name: 'Search by Hold' }).click();
    await page.getByRole('button', { name: 'Show Heatmap' }).click();

    // Wait for heatmap loading to complete
    await page.waitForSelector('text=Loading heatmap...', { state: 'hidden', timeout: 10000 }).catch(() => {});
    // Wait for heatmap controls or canvas to be visible
    await page.waitForSelector('button:has-text("Hide Heatmap")', { state: 'visible' });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/heatmap.png` });
  });

  test('climb detail', async ({ page }) => {
    // Click on the first climb's info button
    await page.getByRole('link', { name: 'info-circle' }).first().click();
    await page.waitForURL(/\/view\//);
    // Wait for climb details to load
    await page.waitForSelector('.ant-descriptions, .ant-card-body', { state: 'visible' });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/climb-detail.png` });
  });

  test('party mode modal', async ({ page }) => {
    await page.getByRole('button', { name: 'team' }).click();
    // Wait for drawer content to be visible
    await page.waitForSelector('.ant-drawer-body', { state: 'visible' });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/party-mode.png` });
  });

  test('login modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Login' }).click();
    // Wait for modal with login form to be visible
    await page.waitForSelector('.ant-modal-content', { state: 'visible' });
    await page.waitForSelector('input#login_email', { state: 'visible' });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/login-modal.png` });
  });
});

// Authenticated tests - requires TEST_USER_EMAIL and TEST_USER_PASSWORD env vars
test.describe('Help Page Screenshots - Authenticated', () => {
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  test.skip(!testEmail || !testPassword, 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars to run authenticated tests');

  test.beforeEach(async ({ page }) => {
    // Navigate to board page first
    await page.goto('/');
    await page.waitForSelector('[role="combobox"]');
    await page.locator('input[role="combobox"]').first().click();
    await page.getByRole('option', { name: 'Kilter' }).click();
    await page.getByRole('button', { name: 'Start Climbing' }).click();
    await page.waitForURL(/\/kilter\//);
    await page.waitForSelector('[data-testid="board-renderer"], .ant-list-items', { timeout: 10000 }).catch(() => {
      return page.waitForSelector('.ant-layout-content', { state: 'visible' });
    });

    // Login via auth modal
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForSelector('input#login_email', { state: 'visible' });

    // Fill login form
    await page.locator('input#login_email').fill(testEmail!);
    await page.locator('input#login_password').fill(testPassword!);
    await page.locator('button[type="submit"]').filter({ hasText: 'Login' }).click();

    // Wait for login to complete - modal should close and user button should appear
    await page.waitForSelector('.ant-modal-content', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('button:has(.anticon-user)', { state: 'visible', timeout: 5000 }).catch(() => {
      // Alternative: wait for any indication of logged-in state
      return page.waitForSelector('text=Logout', { state: 'attached' });
    });
  });

  test('personal progress filters', async ({ page }) => {
    // Open search tab to show personal progress filters
    await page.getByRole('tab', { name: 'Search', exact: true }).click();
    await page.waitForSelector('.ant-collapse, .ant-form', { state: 'visible' });

    // Scroll to Personal Progress section
    await page.evaluate(() => {
      const headers = document.querySelectorAll('.ant-collapse-header-text');
      for (const header of headers) {
        if (header.textContent?.includes('Personal Progress')) {
          header.scrollIntoView({ behavior: 'instant', block: 'center' });
          break;
        }
      }
    });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/personal-progress.png` });
  });

  test('party mode active session', async ({ page }) => {
    // Open party mode drawer
    await page.getByRole('button', { name: 'team' }).click();
    await page.waitForSelector('.ant-drawer-body', { state: 'visible' });

    // Start a party session
    await page.getByRole('button', { name: 'Start Party Mode' }).click();

    // Wait for session to be active - look for Leave button or session ID indicator
    await page.waitForSelector('button:has-text("Leave")', { state: 'visible', timeout: 10000 });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/party-mode-active.png` });

    // Leave the session to clean up
    await page.getByRole('button', { name: 'Leave' }).click();
  });

  test('hold classification wizard', async ({ page }) => {
    // Open user menu and click Classify Holds
    await page.locator('button:has(.anticon-user)').first().click();
    await page.waitForSelector('.ant-dropdown', { state: 'visible' });
    await page.getByText('Classify Holds').click();

    // Wait for wizard drawer to open and content to load
    await page.waitForSelector('.ant-drawer-body', { state: 'visible' });
    // Wait for hold content or progress indicator
    await page.waitForSelector('.ant-rate, .ant-progress', { state: 'visible', timeout: 10000 });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/hold-classification.png` });
  });

  test('settings aurora sync', async ({ page }) => {
    // Navigate to settings page
    await page.goto('/settings');
    // Wait for settings page content to load
    await page.waitForSelector('.ant-card', { state: 'visible' });

    // Scroll to Board Accounts section
    await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll('h4, .ant-card-head-title'))
        .find(el => el.textContent?.includes('Board Accounts'));
      if (heading) {
        heading.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-aurora.png` });
  });
});

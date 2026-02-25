import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for the bottom tab bar navigation.
 *
 * These tests verify that the bottom tab bar is always visible,
 * navigation works correctly, active states are displayed, and
 * it coexists properly with the queue control bar.
 */

const boardUrl = '/kilter/original/12x12-square/screw_bolt/40/list';

async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible({ timeout: 15000 });
}

test.describe('Bottom Tab Bar - Visibility', () => {
  test('should be visible on the home page', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible();
  });

  test('should be visible on a board page', async ({ page }) => {
    await page.goto(boardUrl);
    await waitForPageReady(page);
    await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible();
  });

  test('should be visible on the settings page', async ({ page }) => {
    await page.goto('/settings');
    await waitForPageReady(page);
    await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible();
  });

  test('should be visible on the notifications page', async ({ page }) => {
    await page.goto('/notifications');
    await waitForPageReady(page);
    await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible();
  });

  test('should be visible on the my-library page', async ({ page }) => {
    await page.goto('/my-library');
    await waitForPageReady(page);
    await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible();
  });
});

test.describe('Bottom Tab Bar - Navigation', () => {
  test('Home tab should navigate to home page', async ({ page }) => {
    await page.goto(boardUrl);
    await waitForPageReady(page);

    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page).toHaveURL(/localhost:3000\/($|\?)/, { timeout: 15000 });
    await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible();
  });

  test('Climb tab should navigate to board page', async ({ page }) => {
    // First visit a board page to establish board context in IndexedDB
    await page.goto(boardUrl);
    await waitForPageReady(page);

    // Navigate to home
    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page).toHaveURL(/localhost:3000\/($|\?)/, { timeout: 15000 });

    // Now click Climb - should navigate back using last used board
    await page.getByRole('button', { name: 'Climb', exact: true }).click();
    await expect(page).toHaveURL(/\/(kilter|tension)\//, { timeout: 15000 });
    await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible();
  });

  test('Your Library tab should navigate to my-library page', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    await page.getByRole('button', { name: 'Your Library' }).click();
    await expect(page).toHaveURL(/\/my-library/, { timeout: 15000 });
    await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible();
  });

  test('Notifications tab should navigate to notifications page', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    await page.getByRole('button', { name: 'Notifications' }).click();
    await expect(page).toHaveURL(/\/notifications/, { timeout: 15000 });
    await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible();
  });
});

test.describe('Bottom Tab Bar - Active State', () => {
  test('Home tab should be active on home page', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    const homeTab = page.getByRole('button', { name: 'Home' });
    await expect(homeTab).toHaveClass(/Mui-selected/);
  });

  test('Climb tab should be active on board routes', async ({ page }) => {
    await page.goto(boardUrl);
    await waitForPageReady(page);

    const climbTab = page.getByRole('button', { name: 'Climb', exact: true });
    await expect(climbTab).toHaveClass(/Mui-selected/);
  });

  test('Your Library tab should be active on my-library page', async ({ page }) => {
    await page.goto('/my-library');
    await waitForPageReady(page);

    const libraryTab = page.getByRole('button', { name: 'Your Library' });
    await expect(libraryTab).toHaveClass(/Mui-selected/);
  });

  test('Notifications tab should be active on notifications page', async ({ page }) => {
    await page.goto('/notifications');
    await waitForPageReady(page);

    const notificationsTab = page.getByRole('button', { name: 'Notifications' });
    await expect(notificationsTab).toHaveClass(/Mui-selected/);
  });
});

test.describe('Bottom Tab Bar - Queue Integration', () => {
  test('queue bar and bottom tab bar should coexist', async ({ page }) => {
    await page.goto(boardUrl);
    await page
      .waitForSelector('#onboarding-climb-card, [data-testid="climb-card"]', { timeout: 30000 })
      .catch(() => page.waitForLoadState('networkidle'));

    // Add a climb to the queue
    const climbCard = page.locator('#onboarding-climb-card');
    await expect(climbCard).toBeVisible({ timeout: 15000 });
    await climbCard.dblclick();

    // Both bars should be visible
    await expect(page.locator('[data-testid="queue-control-bar"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible();
  });

  test('queue bar should persist with correct climb across tab navigations', async ({ page }) => {
    await page.goto(boardUrl);
    await page
      .waitForSelector('#onboarding-climb-card, [data-testid="climb-card"]', { timeout: 30000 })
      .catch(() => page.waitForLoadState('networkidle'));

    // Add a climb to the queue
    const climbCard = page.locator('#onboarding-climb-card');
    await expect(climbCard).toBeVisible({ timeout: 15000 });
    await climbCard.dblclick();

    // Capture the climb name
    await expect(page.locator('[data-testid="queue-control-bar"]')).toBeVisible({ timeout: 10000 });
    const queueToggle = page.locator('#onboarding-queue-toggle');
    await expect(queueToggle).toBeVisible({ timeout: 5000 });
    const climbName = ((await queueToggle.textContent()) ?? '').trim();
    expect(climbName).toBeTruthy();

    // Navigate to Home
    await page.getByRole('button', { name: 'Home' }).last().click();
    await expect(page).toHaveURL(/localhost:3000\/($|\?)/, { timeout: 15000 });
    await expect(page.locator('[data-testid="queue-control-bar"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="queue-control-bar"]')).toContainText(climbName);
    await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible();

    // Navigate to Your Library
    await page.getByRole('button', { name: 'Your Library' }).click();
    await expect(page).toHaveURL(/\/my-library/, { timeout: 15000 });
    await expect(page.locator('[data-testid="queue-control-bar"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="queue-control-bar"]')).toContainText(climbName);
    await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible();

    // Navigate to Notifications
    await page.getByRole('button', { name: 'Notifications' }).click();
    await expect(page).toHaveURL(/\/notifications/, { timeout: 15000 });
    await expect(page.locator('[data-testid="queue-control-bar"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="queue-control-bar"]')).toContainText(climbName);
    await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible();

    // Navigate back to Climb
    await page.getByRole('button', { name: 'Climb', exact: true }).click();
    await expect(page).toHaveURL(/\/kilter\//, { timeout: 20000 });
    await expect(page.locator('[data-testid="queue-control-bar"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="queue-control-bar"]')).toContainText(climbName, { timeout: 15000 });
    await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible();
  });
});

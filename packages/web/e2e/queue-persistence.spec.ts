import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for queue persistence across navigation.
 *
 * These tests verify that the queue state is preserved when navigating
 * away from the board page and back.
 */

// Helper to wait for the page to be ready
async function waitForBoardPage(page: Page) {
  // Wait for the queue control bar to be visible
  await page.waitForSelector('[data-testid="queue-control-bar"]', { timeout: 30000 }).catch(() => {
    // Fallback: wait for any content to load
    return page.waitForLoadState('networkidle');
  });
}

// Helper to add a climb to the queue
async function addClimbToQueue(page: Page) {
  // Click on a climb card to add it to queue
  const climbCard = page.locator('[data-testid="climb-card"]').first();
  if (await climbCard.isVisible()) {
    await climbCard.click();
    // Wait for the climb to be added
    await page.waitForTimeout(500);
  }
}

test.describe('Queue Persistence - Local Mode', () => {
  // Use a known board configuration for testing
  const boardUrl = '/kilter/original/12x12-square/screw_bolt/40/list';

  test.beforeEach(async ({ page }) => {
    // Navigate to the board page
    await page.goto(boardUrl);
    await waitForBoardPage(page);
  });

  test('queue should persist when navigating to settings and back', async ({ page }) => {
    // Get initial queue state
    const initialQueueCount = await page.locator('[data-testid="queue-item"]').count();

    // Add a climb to the queue if none exist
    if (initialQueueCount === 0) {
      await addClimbToQueue(page);
    }

    // Verify queue has items
    const queueCountBefore = await page.locator('[data-testid="queue-item"]').count();
    expect(queueCountBefore).toBeGreaterThan(0);

    // Navigate to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Verify we're on settings page
    await expect(page).toHaveURL(/\/settings/);

    // Navigate back to the board
    await page.goto(boardUrl);
    await waitForBoardPage(page);

    // Verify queue items are preserved
    const queueCountAfter = await page.locator('[data-testid="queue-item"]').count();
    expect(queueCountAfter).toBe(queueCountBefore);
  });

  test('global bar should appear when navigating away with queue items', async ({ page }) => {
    // Add a climb to the queue
    await addClimbToQueue(page);

    // Verify queue has items
    const queueCount = await page.locator('[data-testid="queue-item"]').count();
    if (queueCount === 0) {
      test.skip();
      return;
    }

    // Navigate to settings (or any non-board page)
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Check for queue control bar (same unified component used everywhere)
    const globalBar = page.locator('[data-testid="queue-control-bar"]');
    await expect(globalBar).toBeVisible({ timeout: 5000 });
  });

  test('queue control bar should persist correct climb across all pages', async ({ page }) => {
    // Wait for the first climb card to render
    const climbCard = page.locator('#onboarding-climb-card');
    await expect(climbCard).toBeVisible({ timeout: 15000 });

    // Double-click the first climb to set it as current
    await climbCard.dblclick();

    // Wait for queue control bar to appear with the climb
    const queueBar = page.locator('[data-testid="queue-control-bar"]');
    await expect(queueBar).toBeVisible({ timeout: 10000 });

    // Capture the climb name from the queue bar
    const queueToggle = page.locator('#onboarding-queue-toggle');
    await expect(queueToggle).toBeVisible({ timeout: 5000 });
    const climbName = (await queueToggle.textContent())?.trim();
    expect(climbName).toBeTruthy();

    // Helper to verify queue bar shows the correct climb on any page
    const verifyQueueBarShowsClimb = async (timeout = 5000) => {
      const bar = page.locator('[data-testid="queue-control-bar"]');
      await expect(bar).toBeVisible({ timeout: 10000 });
      await expect(bar).toContainText(climbName!, { timeout });
    };

    // 1. Navigate to Home via bottom tab bar (client-side navigation preserves React state)
    // Use last() in case both board-route and root bars briefly coexist during transition
    await page.getByRole('button', { name: 'Home' }).last().click();
    await expect(page).toHaveURL(/localhost:3000\/($|\?)/, { timeout: 15000 });
    await verifyQueueBarShowsClimb();

    // 2. Navigate to Settings via user drawer (client-side Link navigation)
    await page.getByLabel('User menu').click();
    const settingsLink = page.locator('a[href="/settings"]');
    await expect(settingsLink).toBeVisible({ timeout: 5000 });
    // Wait for drawer slide animation to settle before clicking
    await page.waitForTimeout(500);
    await Promise.all([
      page.waitForURL(/\/settings/, { timeout: 15000 }),
      settingsLink.click(),
    ]);
    await verifyQueueBarShowsClimb();

    // 3. Navigate to Your Library via bottom tab bar
    await page.getByRole('button', { name: 'Your Library' }).click();
    await expect(page).toHaveURL(/\/my-library/, { timeout: 15000 });
    await verifyQueueBarShowsClimb();

    // 4. Navigate to Notifications via bottom tab bar
    await page.getByRole('button', { name: 'Notifications' }).click();
    await expect(page).toHaveURL(/\/notifications/, { timeout: 15000 });
    await verifyQueueBarShowsClimb();

    // 5. Navigate back to climb list via bottom tab bar
    // Longer timeout: board route re-mounts its own queue bar and restores from IndexedDB
    await page.getByRole('button', { name: 'Climb', exact: true }).click();
    await expect(page).toHaveURL(/\/kilter\//, { timeout: 20000 });
    await verifyQueueBarShowsClimb(15000);
  });

  test('clicking global bar should navigate back to board', async ({ page }) => {
    // Add a climb to the queue
    await addClimbToQueue(page);

    // Verify queue has items
    const queueCount = await page.locator('[data-testid="queue-item"]').count();
    if (queueCount === 0) {
      test.skip();
      return;
    }

    // Navigate to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Click the queue control bar
    const globalBar = page.locator('[data-testid="queue-control-bar"]');
    if (await globalBar.isVisible()) {
      await globalBar.click();

      // Verify we're back on a board page
      await expect(page).toHaveURL(/\/(kilter|tension)\//);
    }
  });
});

test.describe('Queue Persistence - Board Switch', () => {
  test('queue should clear when switching to different board configuration', async ({ page }) => {
    const boardUrl1 = '/kilter/original/12x12-square/screw_bolt/40/list';
    const boardUrl2 = '/kilter/original/12x12-square/screw_bolt/45/list'; // Different angle

    // Navigate to first board
    await page.goto(boardUrl1);
    await waitForBoardPage(page);

    // Add a climb to the queue
    await addClimbToQueue(page);

    // Get queue count
    const queueCountOnBoard1 = await page.locator('[data-testid="queue-item"]').count();

    // Navigate to different board configuration
    await page.goto(boardUrl2);
    await waitForBoardPage(page);

    // Queue should be empty (cleared on board switch)
    const queueCountOnBoard2 = await page.locator('[data-testid="queue-item"]').count();

    // If we had items before, they should be cleared
    if (queueCountOnBoard1 > 0) {
      expect(queueCountOnBoard2).toBe(0);
    }
  });
});

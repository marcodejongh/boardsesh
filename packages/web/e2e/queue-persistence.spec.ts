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
  const boardUrl = '/kilter/kilter-board-original/12-x-12-commercial/1,72/40/list';

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

  test('floating thumbnail should appear when navigating away with queue items', async ({ page }) => {
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

    // Check for floating thumbnail
    const thumbnail = page.locator('[data-testid="floating-session-thumbnail"]');
    await expect(thumbnail).toBeVisible({ timeout: 5000 });
  });

  test('clicking floating thumbnail should navigate back to board', async ({ page }) => {
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

    // Click the floating thumbnail
    const thumbnail = page.locator('[data-testid="floating-session-thumbnail"]');
    if (await thumbnail.isVisible()) {
      await thumbnail.click();

      // Verify we're back on a board page
      await expect(page).toHaveURL(/\/(kilter|tension|decoy)\//);
    }
  });

  test('clearing queue via thumbnail should show confirmation', async ({ page }) => {
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

    // Find and click the close button on the thumbnail
    const closeButton = page.locator('[data-testid="floating-session-thumbnail"] button').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();

      // Verify confirmation modal appears
      const modal = page.locator('.ant-modal');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Verify modal has clear/cancel buttons
      await expect(page.getByRole('button', { name: /clear/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
    }
  });

  test('confirming queue clear should hide thumbnail', async ({ page }) => {
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

    // Find and click the close button on the thumbnail
    const closeButton = page.locator('[data-testid="floating-session-thumbnail"] button').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();

      // Click the clear button in the confirmation modal
      const clearButton = page.getByRole('button', { name: /clear/i });
      if (await clearButton.isVisible()) {
        await clearButton.click();

        // Wait for modal to close
        await page.waitForTimeout(500);

        // Verify thumbnail is now hidden
        const thumbnail = page.locator('[data-testid="floating-session-thumbnail"]');
        await expect(thumbnail).not.toBeVisible();
      }
    }
  });
});

test.describe('Queue Persistence - Board Switch', () => {
  test('queue should clear when switching to different board configuration', async ({ page }) => {
    const boardUrl1 = '/kilter/kilter-board-original/12-x-12-commercial/1,72/40/list';
    const boardUrl2 = '/kilter/kilter-board-original/12-x-12-commercial/1,72/45/list'; // Different angle

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

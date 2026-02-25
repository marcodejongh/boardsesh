import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for queue persistence across navigation.
 *
 * These tests verify that the queue state is preserved when navigating
 * away from the board page and back, using the queue bridge architecture.
 */

// Helper to wait for the board page to be ready
async function waitForBoardPage(page: Page) {
  await page
    .waitForSelector('#onboarding-climb-card, [data-testid="climb-card"]', {
      timeout: 30000,
    })
    .catch(() => {
      return page.waitForLoadState('networkidle');
    });
}

// Helper to add a climb to the queue via double-click (list mode requires double-click)
async function addClimbToQueue(page: Page) {
  const climbCard = page.locator('#onboarding-climb-card');
  await expect(climbCard).toBeVisible({ timeout: 15000 });
  await climbCard.dblclick();
  await page.waitForSelector('[data-testid="queue-control-bar"]', { timeout: 10000 });
}

// Helper to verify the queue bar is visible (meaning queue has items)
async function verifyQueueHasItems(page: Page) {
  await expect(page.locator('[data-testid="queue-control-bar"]')).toBeVisible({ timeout: 10000 });
}

// Helper to get the current climb name from the queue toggle button
async function getQueueClimbName(page: Page): Promise<string> {
  const queueToggle = page.locator('#onboarding-queue-toggle');
  await expect(queueToggle).toBeVisible({ timeout: 5000 });
  return ((await queueToggle.textContent()) ?? '').trim();
}

test.describe('Queue Persistence - Local Mode', () => {
  const boardUrl = '/kilter/original/12x12-square/screw_bolt/40/list';

  test.beforeEach(async ({ page }) => {
    await page.goto(boardUrl);
    await waitForBoardPage(page);
  });

  test('queue should persist when navigating to home and back', async ({ page }) => {
    // Add a climb to the queue
    await addClimbToQueue(page);

    // Verify queue bar is visible and capture the climb name
    await verifyQueueHasItems(page);
    const climbNameBefore = await getQueueClimbName(page);
    expect(climbNameBefore).toBeTruthy();

    // Navigate to home via bottom tab bar (client-side navigation preserves state)
    await page.getByRole('button', { name: 'Home' }).last().click();
    await expect(page).toHaveURL(/localhost:3000\/($|\?)/, { timeout: 15000 });

    // Queue bar should still be visible on home page
    await verifyQueueHasItems(page);

    // Navigate back to the board via bottom tab bar
    await page.getByRole('button', { name: 'Climb', exact: true }).click();
    await expect(page).toHaveURL(/\/kilter\//, { timeout: 20000 });

    // Verify queue bar is still visible with the same climb
    await verifyQueueHasItems(page);
    const climbNameAfter = await getQueueClimbName(page);
    expect(climbNameAfter).toBe(climbNameBefore);
  });

  test('global bar should appear when navigating away with queue items', async ({ page }) => {
    // Add a climb to the queue
    await addClimbToQueue(page);

    // Verify queue bar is visible
    await verifyQueueHasItems(page);

    // Navigate to home via bottom tab bar (client-side navigation)
    await page.getByRole('button', { name: 'Home' }).last().click();
    await expect(page).toHaveURL(/localhost:3000\/($|\?)/, { timeout: 15000 });

    // Check for queue control bar on the non-board page
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
    await page.getByRole('button', { name: 'Home' }).last().click();
    await expect(page).toHaveURL(/localhost:3000\/($|\?)/, { timeout: 15000 });
    await verifyQueueBarShowsClimb();

    // 2. Navigate to Settings via user drawer (client-side Link navigation)
    await page.getByLabel('User menu').click();
    const settingsLink = page.locator('a[href="/settings"]');
    await expect(settingsLink).toBeVisible({ timeout: 5000 });
    // Wait for drawer slide animation to settle before clicking
    await page.waitForTimeout(500);
    await Promise.all([page.waitForURL(/\/settings/, { timeout: 15000 }), settingsLink.click()]);
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

  test('clicking global bar thumbnail should navigate back to board', async ({ page }) => {
    // Add a climb to the queue
    await addClimbToQueue(page);

    // Verify queue bar is visible
    await verifyQueueHasItems(page);

    // Navigate to home via bottom tab bar (client-side navigation preserves queue state)
    await page.getByRole('button', { name: 'Home' }).last().click();
    await expect(page).toHaveURL(/localhost:3000\/($|\?)/, { timeout: 15000 });

    // Click the thumbnail link within the queue bar (not the bar itself, which opens the play drawer)
    const queueBar = page.locator('[data-testid="queue-control-bar"]');
    await expect(queueBar).toBeVisible({ timeout: 5000 });
    const thumbnailLink = queueBar.locator('a').first();
    await thumbnailLink.click();

    // Verify we're back on a board page
    await expect(page).toHaveURL(/\/(kilter|tension)\//, { timeout: 10000 });
  });
});

test.describe('Queue Persistence - Board Switch', () => {
  test('queue should persist across angle changes within same board', async ({ page }) => {
    const boardUrl1 = '/kilter/original/12x12-square/screw_bolt/40/list';
    const boardUrl2 = '/kilter/original/12x12-square/screw_bolt/45/list'; // Different angle

    // Navigate to first board and add a climb
    await page.goto(boardUrl1);
    await waitForBoardPage(page);
    await addClimbToQueue(page);

    // Verify queue bar is visible and capture climb name
    await verifyQueueHasItems(page);
    const climbName = await getQueueClimbName(page);
    expect(climbName).toBeTruthy();

    // Navigate to different angle
    await page.goto(boardUrl2);
    await waitForBoardPage(page);

    // Queue bar should still be visible (queue bridge persists across angle changes)
    await verifyQueueHasItems(page);
  });
});

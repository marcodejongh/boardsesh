import { test, expect } from '@playwright/test';

/**
 * E2E tests for activity feed infinite scroll.
 *
 * These tests verify that the activity feed renders items and
 * that infinite scroll pagination works correctly.
 */

test.describe('Activity Feed - Unauthenticated', () => {
  test('renders initial feed items', async ({ page }) => {
    await page.goto('/');

    // The Activity tab should be active by default
    const activityTab = page.getByRole('tab', { name: 'Activity' });
    await expect(activityTab).toBeVisible({ timeout: 15000 });
    await expect(activityTab).toHaveAttribute('aria-selected', 'true');

    // Wait for feed items to render
    const feedItems = page.locator('[data-testid="activity-feed-item"]');
    await expect(feedItems.first()).toBeVisible({ timeout: 30000 });

    // Should have multiple items (page size is 20)
    const count = await feedItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('infinite scroll loads more items', async ({ page }) => {
    await page.goto('/');

    // Wait for initial items to render
    const feedItems = page.locator('[data-testid="activity-feed-item"]');
    await expect(feedItems.first()).toBeVisible({ timeout: 30000 });

    const initialCount = await feedItems.count();
    expect(initialCount).toBeGreaterThan(0);

    // Scroll the sentinel element into view to trigger loading more
    const sentinel = page.locator('[data-testid="activity-feed-sentinel"]');
    await sentinel.scrollIntoViewIfNeeded();

    // Wait for more items to appear
    await expect(async () => {
      const newCount = await feedItems.count();
      expect(newCount).toBeGreaterThan(initialCount);
    }).toPass({ timeout: 15000 });
  });

  test('sort mode change reloads feed', async ({ page }) => {
    await page.goto('/');

    // Wait for initial items
    const feedItems = page.locator('[data-testid="activity-feed-item"]');
    await expect(feedItems.first()).toBeVisible({ timeout: 30000 });

    // Click the "Top" sort button — this triggers router.push which
    // updates the URL and causes ActivityFeed to refetch with new sortBy
    const topButton = page.getByRole('button', { name: 'Top' });
    await expect(topButton).toBeVisible({ timeout: 5000 });
    await topButton.click();

    // Verify the URL updated with the sort parameter
    await expect(page).toHaveURL(/sort=top/, { timeout: 10000 });

    // Feed items should still render after the sort change
    await expect(feedItems.first()).toBeVisible({ timeout: 15000 });
  });
});

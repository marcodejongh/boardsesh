import { test, expect } from '@playwright/test';

/**
 * Authenticated E2E tests for the home page sessions feed.
 *
 * These tests use the pre-authenticated storageState from auth.setup.ts,
 * so no login flow is needed in beforeEach.
 */

test.describe('Sessions Feed - Authenticated', () => {
  test('renders personalized feed without sign-in alert', async ({ page }) => {
    await page.goto('/');

    // The Sessions tab should be active by default
    const sessionsTab = page.getByRole('tab', { name: 'Sessions' });
    await expect(sessionsTab).toBeVisible({ timeout: 15000 });
    await expect(sessionsTab).toHaveAttribute('aria-selected', 'true');

    // Wait for feed items to render
    const feedItems = page.locator('[data-testid="activity-feed-item"]');
    await expect(feedItems.first()).toBeVisible({ timeout: 30000 });

    // Should NOT show the "Sign in" alert
    await expect(page.getByText('Sign in to see a personalized feed')).not.toBeVisible();
  });

  test('infinite scroll pagination works with authenticated feed', async ({ page }) => {
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
});

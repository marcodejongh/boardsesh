import { test, expect } from '@playwright/test';

/**
 * E2E tests for the home page feed tabs (Sessions, Proposals, Comments).
 *
 * These tests verify that each feed tab renders correctly,
 * infinite scroll works, and the board filter applies across tabs.
 */

test.describe('Sessions Feed - Unauthenticated', () => {
  test('renders Sessions tab as default', async ({ page }) => {
    await page.goto('/');

    // The Sessions tab should be active by default
    const sessionsTab = page.getByRole('tab', { name: 'Sessions' });
    await expect(sessionsTab).toBeVisible({ timeout: 15000 });
    await expect(sessionsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('renders initial feed items', async ({ page }) => {
    await page.goto('/');

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
});

test.describe('Proposals Feed', () => {
  test('renders proposals when tab is clicked', async ({ page }) => {
    await page.goto('/');

    // Click the Proposals tab
    const proposalsTab = page.getByRole('tab', { name: 'Proposals' });
    await expect(proposalsTab).toBeVisible({ timeout: 15000 });
    await proposalsTab.click();

    // Verify the URL updated with the tab parameter
    await expect(page).toHaveURL(/tab=proposals/, { timeout: 10000 });

    // Wait for either proposals or empty state to render
    const proposalFeed = page.locator('[data-testid="proposal-feed"]');
    await expect(proposalFeed).toBeVisible({ timeout: 15000 });
  });

  test('can navigate directly to proposals tab', async ({ page }) => {
    await page.goto('/?tab=proposals');

    const proposalsTab = page.getByRole('tab', { name: 'Proposals' });
    await expect(proposalsTab).toHaveAttribute('aria-selected', 'true', { timeout: 15000 });

    const proposalFeed = page.locator('[data-testid="proposal-feed"]');
    await expect(proposalFeed).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Comments Feed', () => {
  test('renders comments when tab is clicked', async ({ page }) => {
    await page.goto('/');

    // Click the Comments tab
    const commentsTab = page.getByRole('tab', { name: 'Comments' });
    await expect(commentsTab).toBeVisible({ timeout: 15000 });
    await commentsTab.click();

    // Verify the URL updated with the tab parameter
    await expect(page).toHaveURL(/tab=comments/, { timeout: 10000 });

    // Wait for either comments or empty state to render
    const commentFeed = page.locator('[data-testid="comment-feed"]');
    await expect(commentFeed).toBeVisible({ timeout: 15000 });
  });

  test('can navigate directly to comments tab', async ({ page }) => {
    await page.goto('/?tab=comments');

    const commentsTab = page.getByRole('tab', { name: 'Comments' });
    await expect(commentsTab).toHaveAttribute('aria-selected', 'true', { timeout: 15000 });

    const commentFeed = page.locator('[data-testid="comment-feed"]');
    await expect(commentFeed).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Tab Navigation', () => {
  test('all three tabs are visible', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('tab', { name: 'Sessions' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('tab', { name: 'Proposals' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Comments' })).toBeVisible();
  });

  test('tab switching preserves board filter in URL', async ({ page }) => {
    // Start with a board filter
    await page.goto('/?board=test-board-uuid');

    // Switch to Proposals tab
    const proposalsTab = page.getByRole('tab', { name: 'Proposals' });
    await expect(proposalsTab).toBeVisible({ timeout: 15000 });
    await proposalsTab.click();

    // Board filter should be preserved in the URL
    await expect(page).toHaveURL(/board=test-board-uuid/, { timeout: 10000 });
    await expect(page).toHaveURL(/tab=proposals/, { timeout: 10000 });

    // Switch to Comments tab
    const commentsTab = page.getByRole('tab', { name: 'Comments' });
    await commentsTab.click();

    // Board filter should still be preserved
    await expect(page).toHaveURL(/board=test-board-uuid/, { timeout: 10000 });
    await expect(page).toHaveURL(/tab=comments/, { timeout: 10000 });
  });

  test('sessions tab does not have sort buttons', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load
    const sessionsTab = page.getByRole('tab', { name: 'Sessions' });
    await expect(sessionsTab).toBeVisible({ timeout: 15000 });

    // Sort buttons (Top, Hot, Controversial) should NOT exist
    await expect(page.getByRole('button', { name: 'Top' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Hot' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Controversial' })).not.toBeVisible();
  });
});

test.describe('Sessions Feed - Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    // Log in via the auth login form
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill('test@boardsesh.com');
    await page.getByLabel('Password').fill('test');
    await page.getByRole('button', { name: 'Login' }).click();

    // Wait for redirect to home page after login
    await page.waitForURL('/', { timeout: 15000 });
  });

  test('renders personalized feed without sign-in alert', async ({ page }) => {
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

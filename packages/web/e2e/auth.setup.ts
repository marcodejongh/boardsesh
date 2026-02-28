import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth', 'user.json');

setup('authenticate', async ({ page }) => {
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  setup.skip(!testEmail || !testPassword, 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars');

  await page.goto('/auth/login');
  await page.getByLabel('Email').fill(testEmail!);
  await page.getByLabel('Password').fill(testPassword!);
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for redirect to home page after login
  await page.waitForURL('/', { timeout: 15000 });

  // Save signed-in state
  await page.context().storageState({ path: authFile });
});

import { test, expect } from '@playwright/test';

test('short rest modal opens without crash', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('text=Short Rest');
  
  // Click Short Rest button
  await page.click('text=Short Rest');
  
  // Wait a bit to see if it crashes
  await page.waitForTimeout(1000);
  
  // Check if modal appeared (contains "Take Short Rest" button)
  const hasModal = await page.locator('text=Take Short Rest').isVisible().catch(() => false);
  console.log('Modal visible:', hasModal);
  
  // Check for any error overlay
  const hasError = await page.locator('text=error').isVisible().catch(() => false);
  console.log('Has error:', hasError);
  
  expect(hasModal).toBe(true);
});

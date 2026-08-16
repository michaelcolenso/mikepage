import { expect, test } from '@playwright/test';

test('bookmark garden loads core surfaces', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('[data-testid="intro-guide"]')).toBeVisible();
	await expect(page.locator('[data-testid="active-lens"]')).toBeVisible();
});

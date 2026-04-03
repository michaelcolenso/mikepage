import { expect, test } from '@playwright/test';

test('shows intro guide on first load', async ({ page }) => {
	await page.goto('/mikepage/');
	await expect(page.getByText('A garden of saved ideas.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Start from a bloom' })).toBeVisible();
});

test('honors focus and lens query params for deterministic state', async ({ page }) => {
	await page.goto('/mikepage/?focus=test-seed&lens=closest');
	await expect(page.locator('[data-testid="focus-rail"]')).toBeVisible({ timeout: 20000 });
	await expect(page.locator('[data-testid="active-lens"]')).toHaveText('Closest');
});

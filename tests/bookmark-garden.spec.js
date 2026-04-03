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

test('renders selected bookmark summary and related cards', async ({ page }) => {
	await page.goto('/mikepage/?focus=test-seed&lens=closest');
	await expect(page.locator('[data-testid="selected-title"]')).not.toHaveText('', { timeout: 20000 });
	await expect(page.locator('[data-testid="related-card"]').first()).toBeVisible({ timeout: 20000 });
	await expect(page.getByText(/Why this path:/)).toBeVisible();
});

test('switches lens modes from the UI', async ({ page }) => {
	await page.goto('/mikepage/?focus=test-seed&lens=closest');
	await page.getByRole('button', { name: 'Surprising' }).click();
	await expect(page.locator('[data-testid="active-lens"]')).toHaveText('Surprising');
});

test('clears focus and returns to resting state', async ({ page }) => {
	await page.goto('/mikepage/?focus=test-seed&lens=closest');
	await page.getByRole('button', { name: /^Close$/ }).click();
	await expect(page.locator('[data-testid="focus-rail"]')).toHaveCount(0);
	await expect(page.locator('[data-testid="intro-guide"]')).toHaveCount(0);
});

test('uses a bottom-sheet layout on small screens', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/mikepage/?focus=test-seed&lens=closest');
	await expect(page.locator('[data-testid="focus-rail"]')).toHaveClass(/mobile/);
});

test('keeps the garden readable in reduced motion mode', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/mikepage/?focus=test-seed&lens=closest');
	await expect(page.locator('[data-testid="focus-rail"]')).toBeVisible();
	await expect(page.getByText(/Why this path:/)).toBeVisible();
});

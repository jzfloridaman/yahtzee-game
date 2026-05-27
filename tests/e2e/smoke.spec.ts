import { test, expect } from '@playwright/test';

// Sanity checks that the app boots, the new mobile shell renders, and the
// puzzle flow at least starts up. Live HMR runs in docker compose service
// `web` — this spec just talks to whatever baseURL is set.
test('main menu renders and applies the rainbow theme', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#app')).toBeVisible();
    // Top-level mode cards from the refreshed menu.
    await expect(page.getByText('Single Player')).toBeVisible();
    await expect(page.getByText('Local Multi Player')).toBeVisible();
    await expect(page.getByText('Online Multi Player')).toBeVisible();
    // Body should carry the rainbow mode theme class by default.
    await expect(page.locator('body')).toHaveClass(/mode-rainbow/);
});

test('hamburger opens the bottom-sheet drawer with audio settings', async ({ page }) => {
    await page.goto('/');
    await page.locator('.hamburger-btn').click();
    await expect(page.locator('.sheet')).toBeVisible();
    await expect(page.getByText('Audio Settings')).toBeVisible();
    // Tap outside should close.
    await page.locator('.sheet-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('.sheet')).toHaveCount(0);
});

test('starting a puzzle game swaps to mode-puzzle and shows scorecard', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Single Player').click();
    await page.getByText('Puzzle — Random').click();
    // Body class should switch to mode-puzzle.
    await expect(page.locator('body')).toHaveClass(/mode-puzzle/);
    // The scorecard grid + sticky action zone should be present.
    await expect(page.locator('#scorecard')).toBeVisible();
    await expect(page.locator('.action-zone')).toBeVisible();
    await expect(page.locator('#roll-button')).toBeVisible();
    // Dice tray should have 5 CSS pip dice (pip elements inside).
    await expect(page.locator('#dice-container .die')).toHaveCount(5);
});

import { test } from '@playwright/test';

// Capture mid-roll + post-roll screenshots so the 3D tumble can be eyeballed
// without sitting in front of the browser.
test.use({ viewport: { width: 430, height: 932 } });

test('dice roll snapshots', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Single Player').click();
    await page.getByText('Puzzle — Random').click();
    await page.waitForTimeout(700);

    // Pre-roll: blank cubes
    await page.locator('#dice-container').screenshot({ path: 'tests/e2e/screenshots/dice-00-preroll.png' });

    // Trigger the roll. The .roll class persists for ~1s; the animation
    // itself is 700ms with multi-axis tumble.
    await page.locator('#roll-button').click();
    // Mid-animation snapshots
    await page.waitForTimeout(150);
    await page.locator('#dice-container').screenshot({ path: 'tests/e2e/screenshots/dice-01-rolling-early.png' });
    await page.waitForTimeout(250);
    await page.locator('#dice-container').screenshot({ path: 'tests/e2e/screenshots/dice-02-rolling-mid.png' });
    await page.waitForTimeout(600);
    // Post-roll: settled on rolled values
    await page.locator('#dice-container').screenshot({ path: 'tests/e2e/screenshots/dice-03-settled.png' });

    // Tap a die to hold it — verifies the lift + accent glow
    await page.locator('#dice-container .die').first().click();
    await page.waitForTimeout(200);
    await page.locator('#dice-container').screenshot({ path: 'tests/e2e/screenshots/dice-04-held.png' });
});

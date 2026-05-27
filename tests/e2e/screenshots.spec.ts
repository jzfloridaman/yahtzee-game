import { test } from '@playwright/test';

// Captures a set of reference screenshots at common viewports for visual
// review. Output lands in tests/e2e/screenshots/ (gitignored).
//
// Run via:
//   docker compose run --rm playwright npx playwright test tests/e2e/screenshots.spec.ts
//
// On host: `BASE_URL=http://localhost:5173 npx playwright test tests/e2e/screenshots.spec.ts`

const VIEWPORTS = [
    { name: 'iphone-se',      width: 375,  height: 667  },
    { name: 'iphone-15-promax', width: 430, height: 932  },
    { name: 'desktop',        width: 1440, height: 900  },
];

for (const vp of VIEWPORTS) {
    test.describe(`viewport ${vp.name} (${vp.width}x${vp.height})`, () => {
        test.use({ viewport: { width: vp.width, height: vp.height } });

        test('main menu', async ({ page }) => {
            await page.goto('/');
            await page.waitForTimeout(700);
            await page.screenshot({ path: `tests/e2e/screenshots/${vp.name}-01-menu.png`, fullPage: false });
        });

        test('single player submenu open', async ({ page }) => {
            await page.goto('/');
            await page.getByText('Single Player').click();
            await page.waitForTimeout(300);
            await page.screenshot({ path: `tests/e2e/screenshots/${vp.name}-02-single-player.png` });
        });

        test('puzzle gameplay', async ({ page }) => {
            await page.goto('/');
            await page.getByText('Single Player').click();
            await page.getByText('Puzzle — Random').click();
            await page.waitForTimeout(900);
            await page.screenshot({ path: `tests/e2e/screenshots/${vp.name}-03-puzzle-board.png` });
        });

        test('adventure level select', async ({ page }) => {
            await page.goto('/');
            await page.getByText('Single Player').click();
            await page.getByText('Puzzle — Adventure').click();
            await page.waitForTimeout(700);
            await page.screenshot({ path: `tests/e2e/screenshots/${vp.name}-04-adventure.png` });
        });
    });
}

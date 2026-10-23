import { chromium } from 'playwright';
import * as path from 'path';

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

function hasIntersection(r1: Rect, r2: Rect): boolean {
  return !(
    r1.right <= r2.left ||
    r1.left >= r2.right ||
    r1.bottom <= r2.top ||
    r1.top >= r2.bottom
  );
}

async function runHeroOverlapTest() {
  const artifactDir = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\e6e05e19-2948-43a2-884a-5247e105ee13';
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });

  const viewports = [
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1920, height: 1080, name: '1920x1080' },
  ];

  const modes = ['light', 'dark'] as const;

  console.log('--- STARTING HERO SHOWCASE OVERLAP TEST ---');

  for (const vp of viewports) {
    for (const mode of modes) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: mode,
      });
      const page = await context.newPage();

      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

      // If dark mode, ensure dark class on documentElement
      if (mode === 'dark') {
        await page.evaluate(() => {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        });
      } else {
        await page.evaluate(() => {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        });
      }

      await page.waitForTimeout(500);

      // Locate container, paper, text blocks, and floating cards
      const containerBox = await page.locator('[data-testid="hero-showcase-box"]').boundingBox();
      const paperBox = await page.locator('[data-testid="hero-paper"]').boundingBox();

      if (!containerBox || !paperBox) {
        throw new Error(`Could not find hero-showcase-box or hero-paper at ${vp.name} (${mode})`);
      }

      // Check that paper is not clipped by container
      // Note: container is 520x420, paper is 300x340 rotated -2deg
      const tol = 5;
      const paperWithinContainer =
        paperBox.x >= containerBox.x - tol &&
        paperBox.x + paperBox.width <= containerBox.x + containerBox.width + tol &&
        paperBox.y >= containerBox.y - tol &&
        paperBox.y + paperBox.height <= containerBox.y + containerBox.height + tol;

      console.log(`[${vp.name} | ${mode}] Paper within container: ${paperWithinContainer}`);
      if (!paperWithinContainer) {
        console.warn(`Container box:`, containerBox, `Paper box:`, paperBox);
      }

      // Read bounding rects of paper text blocks
      const textBlockIds = [
        'hero-paper-name',
        'hero-paper-title',
        'hero-paper-contact',
        'hero-paper-heading-exp',
        'hero-paper-heading-edu',
      ];

      const textRects: Record<string, Rect> = {};
      for (const id of textBlockIds) {
        const rect = await page.locator(`[data-testid="${id}"]`).boundingBox();
        if (rect) {
          textRects[id] = {
            left: rect.x,
            right: rect.x + rect.width,
            top: rect.y,
            bottom: rect.y + rect.height,
            width: rect.width,
            height: rect.height,
          };
        }
      }

      // Read bounding rects of floating cards
      const cardIds = [
        'hero-card-score',
        'hero-card-ats',
        'hero-card-skills',
        'hero-card-prompt',
      ];

      const cardRects: Record<string, Rect> = {};
      for (const id of cardIds) {
        const rect = await page.locator(`[data-testid="${id}"]`).boundingBox();
        if (rect) {
          cardRects[id] = {
            left: rect.x,
            right: rect.x + rect.width,
            top: rect.y,
            bottom: rect.y + rect.height,
            width: rect.width,
            height: rect.height,
          };
        }
      }

      // Assert zero intersection between every card and every paper text block
      let overlapCount = 0;
      for (const [cId, cRect] of Object.entries(cardRects)) {
        for (const [tId, tRect] of Object.entries(textRects)) {
          if (hasIntersection(cRect, tRect)) {
            console.error(`OVERLAP DETECTED at ${vp.name} (${mode}): ${cId} intersects ${tId}`);
            overlapCount++;
          }
        }
      }

      console.log(`[${vp.name} | ${mode}] Overlap count between cards and paper text: ${overlapCount}`);

      if (overlapCount > 0) {
        throw new Error(`Test failed: ${overlapCount} intersections found at ${vp.name} (${mode})`);
      }

      // Save screenshot for 1440x900 (both light and dark)
      if (vp.width === 1440) {
        const screenshotPath = path.join(artifactDir, `hero-showcase-${mode}.png`);
        const showcaseElem = page.locator('[data-testid="hero-showcase-box"]');
        await showcaseElem.screenshot({ path: screenshotPath });
        console.log(`Saved screenshot: ${screenshotPath}`);

        // Also take full hero section screenshot
        const heroPath = path.join(artifactDir, `hero-full-${mode}.png`);
        await page.screenshot({ path: heroPath, fullPage: false });
        console.log(`Saved hero full screenshot: ${heroPath}`);
      }

      await context.close();
    }
  }

  await browser.close();
  console.log('--- ALL HERO OVERLAP TESTS PASSED (0 OVERLAPS) ---');
}

runHeroOverlapTest().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  const artifactDir = 'C:/Users/hp/.gemini/antigravity/brain/e6e05e19-2948-43a2-884a-5247e105ee13';
  const pdfPath = path.resolve(process.cwd(), 'resume.pdf');
  const weakFixturePath = path.resolve(process.cwd(), 'tests/fixtures/weak-resume.json');

  const envPath = path.resolve(process.cwd(), '.env');
  let apiKey = '';
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim();
        if (k === 'VITE_GEMINI_API_KEY') {
          apiKey = v.replace(/^["']|["']$/g, '').trim();
        }
      }
    }
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173');

  // Inject API key into localStorage
  await page.evaluate(({ key }) => {
    if (key) {
      localStorage.setItem('resumecraft_gemini_api_key', key);
    }
  }, { key: apiKey });

  // ---------------------------------------------------------------------
  // RUN 1: WEAK FIXTURE (REAL AI RUN)
  // ---------------------------------------------------------------------
  console.log('\n2. Testing Real AI Review on Weak Fixture (Upload JSON)...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);

  const fileInputWeak = page.locator('input[type="file"]').first();
  await fileInputWeak.setInputFiles(weakFixturePath);

  console.log('Waiting for upload review screen (Weak Fixture)...');
  await page.waitForSelector('button:has-text("Save as new resume")', { timeout: 15000 });
  await page.waitForTimeout(600);

  console.log('Saving as new resume...');
  await page.getByRole('button', { name: /save as new resume/i }).click();

  console.log('Waiting for editor route...');
  await page.waitForFunction(() => window.location.pathname.startsWith('/editor/res_'), { timeout: 10000 });
  await page.waitForTimeout(1500);

  console.log('Opening Suggestions panel...');
  const suggestionsBtnWeak = page.locator('button').filter({ hasText: /Suggestions/i }).first();
  await suggestionsBtnWeak.scrollIntoViewIfNeeded();
  await suggestionsBtnWeak.click();
  await page.waitForTimeout(600);

  console.log('Triggering real AI Review on weak fixture...');
  const reviewBtnWeak = page.locator('[data-testid="btn-review-resume"]').first();
  await reviewBtnWeak.waitFor({ state: 'visible', timeout: 5000 });
  await reviewBtnWeak.click();

  console.log('Waiting for real AI review completion...');
  await page.waitForSelector('span:has-text("Reviewing"), svg.animate-spin', { state: 'attached', timeout: 5000 }).catch(() => {});
  await page.waitForSelector('span:has-text("Reviewing"), svg.animate-spin', { state: 'detached', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const panelWeak = page.locator('div.card').filter({ hasText: /Suggestions/i }).first();
  await panelWeak.scrollIntoViewIfNeeded();
  const weakShotPath = path.join(artifactDir, 'ai-suggestions-weak-real.png');
  console.log(`Saving ${weakShotPath} [Source: Real AI]...`);
  await panelWeak.screenshot({ path: weakShotPath });

  // Click Apply on first suggestion to verify apply & undo
  console.log('Clicking Apply on weak fixture suggestion...');
  const applyBtn = panelWeak.locator('button:has-text("Apply")').first();
  if (await applyBtn.isVisible()) {
    await applyBtn.click();
    await page.waitForTimeout(800);
    const appliedShotPath = path.join(artifactDir, 'editor-applied-real.png');
    await page.screenshot({ path: appliedShotPath });
    console.log(`Saving ${appliedShotPath} [Source: Real AI]...`);

    console.log('Pressing Control+z to undo...');
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(800);
    const undoneShotPath = path.join(artifactDir, 'editor-undone-real.png');
    await page.screenshot({ path: undoneShotPath });
    console.log(`Saving ${undoneShotPath} [Source: Real AI]...`);
  }

  // ---------------------------------------------------------------------
  // RUN 2: ./resume.pdf (REAL AI RUN)
  // ---------------------------------------------------------------------
  console.log('\n3. Testing Real AI Review on ./resume.pdf...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);

  console.log('Uploading resume.pdf...');
  const fileInputPdf = page.locator('input[type="file"]').first();
  await fileInputPdf.setInputFiles(pdfPath);

  await page.waitForSelector('button:has-text("Save as new resume")', { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /save as new resume/i }).click();

  await page.waitForFunction(() => window.location.pathname.startsWith('/editor/res_'), { timeout: 10000 });
  await page.waitForTimeout(1500);

  console.log('Opening Suggestions panel for resume.pdf...');
  const suggestionsBtnPdf = page.locator('button').filter({ hasText: /Suggestions/i }).first();
  await suggestionsBtnPdf.scrollIntoViewIfNeeded();
  await suggestionsBtnPdf.click();
  await page.waitForTimeout(600);

  console.log('Triggering real AI Review on resume.pdf...');
  const reviewBtnPdf = page.locator('[data-testid="btn-review-resume"]').first();
  await reviewBtnPdf.waitFor({ state: 'visible', timeout: 5000 });
  await reviewBtnPdf.click();

  console.log('Waiting for real AI review completion on resume.pdf...');
  await page.waitForSelector('span:has-text("Reviewing"), svg.animate-spin', { state: 'attached', timeout: 5000 }).catch(() => {});
  await page.waitForSelector('span:has-text("Reviewing"), svg.animate-spin', { state: 'detached', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const panelPdf = page.locator('div.card').filter({ hasText: /Suggestions/i }).first();
  await panelPdf.scrollIntoViewIfNeeded();

  // If there are details (probe table or rejected reasons), open them so they are visible in screenshot
  const probeDetails = panelPdf.locator('details').first();
  if (await probeDetails.isVisible()) {
    await probeDetails.click().catch(() => {});
  }
  await page.waitForTimeout(400);

  const pdfShotPath = path.join(artifactDir, 'ai-suggestions-resume-real.png');
  console.log(`Saving ${pdfShotPath} [Source: Real AI]...`);
  await panelPdf.screenshot({ path: pdfShotPath });

  console.log('\nAll real screenshots captured successfully!');
  await browser.close();
}

main().catch((err) => {
  console.error('Error during real screenshot capture:', err);
  process.exit(1);
});

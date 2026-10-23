import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  const artifactDir = 'C:/Users/hp/.gemini/antigravity/brain/e6e05e19-2948-43a2-884a-5247e105ee13';
  const pdfPath = path.resolve(process.cwd(), 'resume.pdf');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173');

  const envPath = path.resolve(process.cwd(), '.env');
  let apiKey = process.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey && fs.existsSync(envPath)) {
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

  // Inject API key and let model be dynamically picked
  await page.evaluate((key) => {
    if (key) {
      localStorage.setItem('resumecraft_gemini_api_key', key);
    }
    localStorage.removeItem('resumecraft_gemini_model');
  }, apiKey);

  await page.reload();
  await page.waitForTimeout(1000);

  // Upload resume.pdf via file input on Home
  console.log('2. Setting input files for resume.pdf...');
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(pdfPath);

  // Wait for upload review screen
  console.log('3. Waiting for review screen...');
  await page.waitForSelector('button:has-text("Save as new resume")', { timeout: 15000 });
  await page.waitForTimeout(800);

  // Click "Save as new resume"
  console.log('4. Clicking Save as new resume...');
  const saveBtn = page.getByRole('button', { name: /save as new resume/i });
  await saveBtn.click();

  // Wait for editor to load
  console.log('5. Waiting for client-side route change to /editor/res_...');
  await page.waitForFunction(() => window.location.pathname.startsWith('/editor/res_'), { timeout: 10000 });
  await page.waitForTimeout(1500);

  // Locate Suggestions panel header
  console.log('6. Locating Suggestions panel...');
  const suggestionsHeader = page.locator('button').filter({ hasText: /Suggestions/i }).first();
  await suggestionsHeader.waitFor({ state: 'visible', timeout: 10000 });

  // Scroll to Suggestions panel
  await suggestionsHeader.scrollIntoViewIfNeeded();

  // Expand panel
  console.log('7. Expanding Suggestions panel...');
  await suggestionsHeader.click();
  await page.waitForTimeout(600);

  // Click "Review resume with AI" button
  console.log('8. Clicking "Review resume with AI"...');
  const reviewBtn = page.locator('button:has-text("Review resume with AI")');
  await reviewBtn.waitFor({ state: 'visible', timeout: 5000 });
  await reviewBtn.click();

  // Wait for review completion (up to 40s)
  console.log('9. Waiting for AI review to complete...');
  await page.waitForTimeout(1000);
  await page.waitForSelector('span:has-text("Reviewing"), svg.animate-spin', { state: 'attached', timeout: 5000 }).catch(() => {});
  await page.waitForSelector('span:has-text("Reviewing"), svg.animate-spin', { state: 'detached', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Locate the suggestions panel card container
  const panel = page.locator('div.card').filter({ hasText: /Suggestions/i }).first();
  const screenshotPath = path.join(artifactDir, 'ai-suggestions.png');

  console.log(`10. Taking screenshot to ${screenshotPath}...`);
  if (await panel.isVisible()) {
    await panel.scrollIntoViewIfNeeded();
    await panel.screenshot({ path: screenshotPath });
  } else {
    await page.screenshot({ path: screenshotPath, fullPage: true });
  }

  // Also take full editor screenshot
  const editorPath = path.join(artifactDir, 'editor-with-ai-review.png');
  await page.screenshot({ path: editorPath, fullPage: false });

  console.log('Screenshot captured successfully!');
  await browser.close();
}

main().catch((err) => {
  console.error('Error capturing screenshot:', err);
  process.exit(1);
});

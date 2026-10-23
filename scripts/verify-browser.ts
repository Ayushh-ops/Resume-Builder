import { chromium } from 'playwright';
import * as path from 'path';

async function main() {
  const artifactDir = 'C:/Users/hp/.gemini/antigravity/brain/e6e05e19-2948-43a2-884a-5247e105ee13';
  const pdfPath = path.resolve(process.cwd(), 'resume.pdf');

  console.log('Launching browser...');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    console.log('Chromium default launch failed, trying with channel: chrome...', e);
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    console.log(`[Browser Console ${msg.type()}]:`, msg.text());
  });
  page.on('pageerror', (err) => {
    console.log('[Browser PageError]:', err);
  });

  console.log('Navigating to http://localhost:5173/...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Clear localStorage so displayResumes is 0 and HeroShowcase is visible
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500); // Wait for score count-up to 86

  // 1. Screenshot Home (with HeroShowcase)
  console.log('Capturing Home screenshot with HeroShowcase...');
  const homeScreenshot = path.join(artifactDir, 'home.png');
  await page.screenshot({ path: homeScreenshot, fullPage: true });

  // 2. Upload resume.pdf via file input on Home
  console.log('Setting input files for resume.pdf...');
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(pdfPath);

  // 3. Wait for upload review screen
  console.log('Waiting for review screen...');
  await page.waitForSelector('button:has-text("Save as new resume")', { timeout: 15000 });
  await page.waitForTimeout(800);

  // 4. Screenshot Upload Review (showing checklist, chip "Use: Data Analyst Intern", confidence)
  console.log('Capturing Upload Review screenshot...');
  const reviewScreenshot = path.join(artifactDir, 'upload-review.png');
  await page.screenshot({ path: reviewScreenshot, fullPage: true });

  // 5. Click "Save as new resume"
  console.log('Clicking Save as new resume...');
  const saveBtn = page.getByRole('button', { name: /save as new resume/i });
  await saveBtn.click();

  // 6. Wait for editor to load
  console.log('Waiting for client-side route change to /editor/res_...');
  await page.waitForFunction(() => window.location.pathname.startsWith('/editor/res_'), { timeout: 10000 });
  await page.waitForTimeout(1200);

  // 7. Screenshot Editor (showing Suggestions panel, Sections with Layers icon, and Live Preview)
  console.log('Capturing Editor screenshot...');
  const editorScreenshot = path.join(artifactDir, 'editor.png');
  await page.screenshot({ path: editorScreenshot, fullPage: true });

  console.log('Verification finished successfully!');
  await browser.close();
}

main().catch((err) => {
  console.error('Browser verify failed:', err);
  process.exit(1);
});

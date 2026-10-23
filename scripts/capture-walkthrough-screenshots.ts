import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  const artifactDir = 'C:/Users/hp/.gemini/antigravity/brain/e6e05e19-2948-43a2-884a-5247e105ee13';
  const pdfPath = path.resolve(process.cwd(), 'resume.pdf');

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

  // Inject API key and working model
  await page.evaluate(({ key }) => {
    if (key) {
      localStorage.setItem('resumecraft_gemini_api_key', key);
    }
    localStorage.setItem('resumecraft_gemini_model', 'gemini-3.5-flash-lite');
  }, { key: apiKey });

  await page.reload();
  await page.waitForTimeout(1000);

  // Upload resume.pdf
  console.log('2. Uploading resume.pdf...');
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(pdfPath);

  // Wait for review screen
  console.log('3. Waiting for upload review screen...');
  await page.waitForSelector('button:has-text("Save as new resume")', { timeout: 15000 });
  await page.waitForTimeout(600);

  // Click Save as new resume
  console.log('4. Navigating to editor...');
  await page.getByRole('button', { name: /save as new resume/i }).click();
  await page.waitForFunction(() => window.location.pathname.startsWith('/editor/res_'), { timeout: 10000 });
  await page.waitForTimeout(1500);

  // Populate AI suggestions in sessionStorage to simulate verified review suggestion
  const mockSuggestion = {
    id: 'ai-rev-verified-1',
    section: 'experience',
    targetType: 'bullet',
    issue: 'weak_verb',
    title: 'Strengthen Action Verb & Technical Scope',
    before: 'Analyzed 10,000+ financial records using Python (Pandas, NumPy) and SQL to detect market trends',
    after: 'Engineered automated financial pipelines analyzing 10,000+ records using Python and SQL to identify market trends',
    explanation: 'Replaces generic analysis with an engineered automated pipeline, preserving verified metrics and tools.',
    expIdx: 0,
    bulletIdx: 0,
  };

  await page.evaluate((sugg) => {
    sessionStorage.setItem('resumecraft_ai_review_suggestions', JSON.stringify([sugg]));
  }, mockSuggestion);

  // Reload editor to pick up the suggestions
  await page.reload();
  await page.waitForTimeout(1500);

  // Locate and expand Suggestions panel
  console.log('5. Locating and opening Suggestions panel...');
  const suggestionsBtn = page.locator('button').filter({ hasText: /Suggestions/i }).first();
  await suggestionsBtn.scrollIntoViewIfNeeded();
  await suggestionsBtn.click();
  await page.waitForTimeout(600);

  // 1. Capture ai-suggestions.png
  console.log('6. Taking ai-suggestions.png...');
  const panel = page.locator('div.card').filter({ hasText: /Suggestions/i }).first();
  await panel.scrollIntoViewIfNeeded();
  await panel.screenshot({ path: path.join(artifactDir, 'ai-suggestions.png') });

  // Read current bullet value before Apply
  const experienceSection = page.locator('text=Professional Experience').first();
  await experienceSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  // Click Apply on the AI suggestion card
  console.log('7. Clicking Apply on AI suggestion...');
  const applyBtn = panel.locator('button:has-text("Apply")').first();
  await applyBtn.click();
  await page.waitForTimeout(800);

  // 2. Capture editor-applied.png
  console.log('8. Taking editor-applied.png...');
  const appliedInput = page.locator(`input[value*="Engineered automated financial pipelines"]`).first();
  if (await appliedInput.isVisible()) {
    await appliedInput.scrollIntoViewIfNeeded();
  }
  await page.screenshot({ path: path.join(artifactDir, 'editor-applied.png') });

  // 3. Press Ctrl+Z to undo
  console.log('9. Pressing Control+z to undo...');
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(800);

  // Capture editor-undone.png
  console.log('10. Taking editor-undone.png...');
  const undoneInput = page.locator(`input[value*="Analyzed 10,000+ financial records"]`).first();
  if (await undoneInput.isVisible()) {
    await undoneInput.scrollIntoViewIfNeeded();
  }
  await page.screenshot({ path: path.join(artifactDir, 'editor-undone.png') });

  console.log('Done! All screenshots captured.');
  await browser.close();
}

main().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});

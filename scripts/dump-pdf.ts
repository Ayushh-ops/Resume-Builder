import * as fs from 'fs';
import * as path from 'path';
// In node, pdfjs-dist standard or legacy build can be loaded
import * as pdfjsLib from 'pdfjs-dist';

async function main() {
  const pdfPath = path.resolve(process.cwd(), 'resume.pdf');
  const debugDir = path.resolve(process.cwd(), 'debug');
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;

  const rawItems: any[] = [];
  const linesByPage: { page: number; y: number; text: string }[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    interface ItemInfo {
      page: number;
      str: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fontName: string;
      fontSize: number;
      hasEOL: boolean;
    }

    const pageItems: ItemInfo[] = [];

    for (const item of textContent.items) {
      if ('str' in item) {
        const tx = item.transform;
        const x = Array.isArray(tx) ? tx[4] : 0;
        const y = Array.isArray(tx) ? tx[5] : 0;
        const fontSize = Array.isArray(tx)
          ? Math.round(Math.hypot(tx[0], tx[1])) || Math.round(Math.abs(tx[0])) || 12
          : 12;
        const itemObj: ItemInfo = {
          page: pageNum,
          str: item.str,
          x,
          y,
          width: item.width || 0,
          height: item.height || 0,
          fontName: item.fontName || '',
          fontSize,
          hasEOL: Boolean(item.hasEOL),
        };
        rawItems.push(itemObj);
        pageItems.push(itemObj);
      }
    }

    // Group by y-group
    // Group tolerance max(2, 0.4*fontSize) or +-2
    const sorted = [...pageItems].sort((a, b) => b.y - a.y || a.x - b.x);
    interface LineGroup {
      y: number;
      fontSize: number;
      items: ItemInfo[];
    }
    const lines: LineGroup[] = [];
    for (const it of sorted) {
      const tol = Math.max(2, 0.4 * it.fontSize);
      const match = lines.find((l) => Math.abs(l.y - it.y) <= tol);
      if (match) {
        match.items.push(it);
      } else {
        lines.push({ y: it.y, fontSize: it.fontSize, items: [it] });
      }
    }

    for (const l of lines) {
      l.items.sort((a, b) => a.x - b.x);
      // Join items in line
      let lineStr = '';
      let prevEnd = -99999;
      for (const it of l.items) {
        const gap = it.x - prevEnd;
        if (lineStr === '') {
          lineStr = it.str;
        } else {
          if (gap > 0.2 * it.fontSize && !lineStr.endsWith(' ') && !it.str.startsWith(' ')) {
            lineStr += ' ' + it.str;
          } else {
            lineStr += it.str;
          }
        }
        prevEnd = Math.max(prevEnd, it.x + it.width);
      }
      linesByPage.push({ page: pageNum, y: l.y, text: lineStr });
    }
  }

  fs.writeFileSync(
    path.join(debugDir, 'raw-items.json'),
    JSON.stringify(rawItems, null, 2),
    'utf-8'
  );

  const rawLinesTxt = linesByPage.map((l) => `[p${l.page} y=${l.y.toFixed(1)}] ${l.text}`).join('\n');
  fs.writeFileSync(path.join(debugDir, 'raw-lines.txt'), rawLinesTxt, 'utf-8');

  console.log(`Extracted ${rawItems.length} items and ${linesByPage.length} lines.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

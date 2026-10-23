import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import type { Line, Segment } from './types';

// Setup worker in browser environment
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  } catch {
    // Ignore worker initialization errors
  }
}

interface RawPdfItem {
  page: number;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  bold: boolean;
  linkUrl?: string;
}

export async function extractLinesFromPdf(data: ArrayBuffer | Uint8Array): Promise<Line[]> {
  const uint8 = data instanceof Uint8Array
    ? new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
    : new Uint8Array(data);
  const loadingTask = pdfjsLib.getDocument({
    data: uint8,
    useSystemFonts: true,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const allLines: Line[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    let linkAnnots: Array<{ url: string; rect: [number, number, number, number] }> = [];
    try {
      const annotations = await page.getAnnotations();
      linkAnnots = (annotations || [])
        .filter((a: any) => a.subtype === 'Link' && (a.url || a.unsafeUrl) && Array.isArray(a.rect) && a.rect.length === 4)
        .map((a: any) => ({
          url: (a.url || a.unsafeUrl || '').trim(),
          rect: a.rect as [number, number, number, number],
        }));
    } catch {
      // Ignore annotations errors if any
    }
    const rawItems: RawPdfItem[] = [];

    for (const item of textContent.items) {
      if ('str' in item && typeof item.str === 'string' && item.str.length > 0) {
        const tx = item.transform;
        const x = Array.isArray(tx) ? tx[4] : 0;
        const y = Array.isArray(tx) ? tx[5] : 0;
        const fontSize = Array.isArray(tx)
          ? Math.round(Math.hypot(tx[0], tx[1])) || Math.round(Math.abs(tx[0])) || 12
          : 12;
        const fontName = ('fontName' in item && typeof item.fontName === 'string' ? item.fontName : '').toLowerCase();
        const bold = fontName.includes('bold') || fontName.includes('black') || fontName.includes('heavy') || fontName.includes('bolder');

        const itemWidth = item.width || 0;
        let linkUrl: string | undefined;
        for (const la of linkAnnots) {
          const [rx1, ry1, rx2, ry2] = la.rect;
          const xMin = Math.min(rx1, rx2);
          const xMax = Math.max(rx1, rx2);
          const yMin = Math.min(ry1, ry2);
          const yMax = Math.max(ry1, ry2);
          const yOverlaps = y >= yMin - 4 && y <= yMax + 4;
          const xOverlaps = x < xMax + 4 && (x + itemWidth) > xMin - 4;
          if (yOverlaps && xOverlaps) {
            linkUrl = la.url;
            break;
          }
        }

        rawItems.push({
          page: pageNum,
          str: item.str,
          x,
          y,
          width: itemWidth,
          height: item.height || 0,
          fontSize,
          bold,
          linkUrl,
        });
      }
    }

    // Sort descending by y (top of page in PDF has higher y), then ascending by x
    rawItems.sort((a, b) => b.y - a.y || a.x - b.x);

    // Group by baseline y with tolerance max(2, 0.4 * fontSize). Never drop items.
    interface YGroup {
      y: number;
      fontSize: number;
      items: RawPdfItem[];
    }
    const yGroups: YGroup[] = [];

    for (const item of rawItems) {
      const tol = Math.max(2, 0.4 * item.fontSize);
      const matchedGroup = yGroups.find((g) => Math.abs(g.y - item.y) <= tol);
      if (matchedGroup) {
        matchedGroup.items.push(item);
      } else {
        yGroups.push({ y: item.y, fontSize: item.fontSize, items: [item] });
      }
    }

    const unmergedLines: Line[] = [];

    for (const group of yGroups) {
      group.items.sort((a, b) => a.x - b.x);

      // Cluster items into segments when gap > 3 * fontSize (left = content, right = date/location)
      // Add a space between items in segment when gap > 0.2 * fontSize
      const segments: Segment[] = [];
      let currentSegItems: RawPdfItem[] = [];

      for (let k = 0; k < group.items.length; k++) {
        const item = group.items[k];
        if (currentSegItems.length === 0) {
          currentSegItems.push(item);
          continue;
        }

        const prev = currentSegItems[currentSegItems.length - 1];
        const prevEnd = prev.x + prev.width;
        const gap = item.x - prevEnd;

        if (gap > 3 * item.fontSize || item.linkUrl !== prev.linkUrl) {
          // Finish current segment
          segments.push(buildSegment(currentSegItems));
          currentSegItems = [item];
        } else {
          currentSegItems.push(item);
        }
      }

      if (currentSegItems.length > 0) {
        segments.push(buildSegment(currentSegItems));
      }

      const lineText = segments.map((s) => s.text).join('   ').trim();
      const maxFont = Math.max(...group.items.map((it) => it.fontSize));

      const lineLinks = segments
        .filter((s) => s.linkUrl)
        .map((s) => ({ url: s.linkUrl!, text: s.text, x0: s.x0, x1: s.x1 }));

      if (lineText) {
        unmergedLines.push({
          page: pageNum,
          y: group.y,
          segments,
          text: lineText,
          maxFont,
          links: lineLinks.length > 0 ? lineLinks : undefined,
        });
      }
    }

    // Merge wrapped lines only when:
    // 1. Previous line does not end with . : ;
    // 2. Next line starts lowercase and is NOT a bullet
    // 3. Remove a trailing hyphen only if the next line starts lowercase
    const mergedLines: Line[] = [];
    for (let j = 0; j < unmergedLines.length; j++) {
      const cur = unmergedLines[j];
      if (mergedLines.length === 0) {
        mergedLines.push(cur);
        continue;
      }

      const prevIdx = mergedLines.length - 1;
      const prev = mergedLines[prevIdx];
      const prevText = prev.text.trim();
      const curText = cur.text.trim();

      const prevEndsPunct = /[.:;]$/.test(prevText);
      const prevEndsHyphen = prevText.endsWith('-');
      const nextStartsLower = /^[a-z]/.test(curText);
      const nextIsBullet = /^[•·⁃◦*]\s*|^-\s+/.test(curText);

      const combinedSegments = [...prev.segments, ...cur.segments];
      const combinedLinks = [
        ...(prev.links || []),
        ...(cur.links || []),
      ];

      if (prevEndsHyphen && nextStartsLower) {
        // Strip trailing hyphen and join
        const newText = prevText.replace(/-$/, '') + curText;
        mergedLines[prevIdx] = {
          ...prev,
          text: newText,
          segments: combinedSegments,
          links: combinedLinks.length > 0 ? combinedLinks : undefined,
          maxFont: Math.max(prev.maxFont, cur.maxFont),
        };
      } else if (!prevEndsPunct && nextStartsLower && !nextIsBullet) {
        // Normal wrap continuation
        const newText = prevText + ' ' + curText;
        mergedLines[prevIdx] = {
          ...prev,
          text: newText,
          segments: combinedSegments,
          links: combinedLinks.length > 0 ? combinedLinks : undefined,
          maxFont: Math.max(prev.maxFont, cur.maxFont),
        };
      } else {
        mergedLines.push(cur);
      }
    }

    allLines.push(...mergedLines);
  }

  return allLines;
}

function buildSegment(items: RawPdfItem[]): Segment {
  let segText = '';
  let prevEnd = -99999;
  let maxFont = 12;
  let isBold = false;
  let linkUrl: string | undefined;
  const x0 = items[0].x;
  let x1 = items[0].x + items[0].width;

  for (const it of items) {
    if (it.fontSize > maxFont) maxFont = it.fontSize;
    if (it.bold) isBold = true;
    if (it.linkUrl) linkUrl = it.linkUrl;
    x1 = Math.max(x1, it.x + it.width);

    const gap = it.x - prevEnd;
    if (segText === '') {
      segText = it.str;
    } else {
      if (gap > 0.2 * it.fontSize && !segText.endsWith(' ') && !it.str.startsWith(' ')) {
        segText += ' ' + it.str;
      } else {
        segText += it.str;
      }
    }
    prevEnd = Math.max(prevEnd, it.x + it.width);
  }

  const trimmed = segText.trim();
  return {
    text: trimmed,
    x0,
    x1,
    fontSize: maxFont,
    bold: isBold,
    linkUrl,
    linkLabel: linkUrl ? trimmed : undefined,
  };
}

export async function extractLinesFromDocx(arrayBuffer: ArrayBuffer): Promise<Line[]> {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return extractLinesFromPlainText(result.value);
}

export function extractLinesFromPlainText(rawText: string): Line[] {
  const rawLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lines: Line[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const text = rawLines[i];
    lines.push({
      page: 1,
      y: 1000 - i * 15,
      text,
      maxFont: 12,
      segments: [
        {
          text,
          x0: 40,
          x1: 500,
          fontSize: 12,
          bold: false,
        },
      ],
    });
  }

  return lines;
}

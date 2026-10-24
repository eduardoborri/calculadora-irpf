import * as pdfjsLib from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
// Vite-specific import: resolves the worker script to a served URL.
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const SAME_LINE_Y_TOLERANCE = 2;
// Horizontal gap (PDF units) above which two items are treated as separate
// columns and joined with a wide separator, like a layout-mode extraction.
// The parser relies on this to tell "label    value" columns apart from
// words of the same label.
const COLUMN_GAP = 6;
const COLUMN_SEPARATOR = "   ";

interface PositionedItem {
  text: string;
  x: number;
  y: number;
  width: number;
}

/**
 * Reconstructs a page's text in visual reading order (row by row, left to
 * right) from each item's x/y position, instead of the raw PDF
 * content-stream order.
 *
 * This matters specifically for DIRPF PDFs: the Receita Federal's PDF
 * generator draws form labels and their values as separate text passes, so
 * joining items in stream order dumps every label first and every value
 * afterwards, with no way to tell which value belongs to which label.
 * Sorting by position (row by y, then column by x) puts "label ... valor"
 * back on the same line, which is what the regex matchers in
 * dirpfParser.ts rely on. Confirmed against a real exported declaration.
 */
function reconstructReadingOrder(items: PositionedItem[]): string {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PositionedItem[][] = [];

  for (const item of sorted) {
    const line = lines.find((l) => Math.abs(l[0].y - item.y) <= SAME_LINE_Y_TOLERANCE);
    if (line) {
      line.push(item);
    } else {
      lines.push([item]);
    }
  }

  return lines
    .map((line) => {
      const ordered = line.sort((a, b) => a.x - b.x);
      return ordered
        .map((item, idx) => {
          if (idx === 0) return item.text;
          const prev = ordered[idx - 1];
          const gap = item.x - (prev.x + prev.width);
          return (gap > COLUMN_GAP ? COLUMN_SEPARATOR : " ") + item.text;
        })
        .join("");
    })
    .join("\n");
}

// Extracts every page of a PDF as reading-order text, entirely in the
// browser — the file never leaves the device.
export async function loadPdf(file: File) {
  const buffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: buffer }).promise;
}

export async function extractPdfPages(file: File): Promise<string[]> {
  const pdf = await loadPdf(file);
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const items: PositionedItem[] = content.items
      .filter((item): item is TextItem => "str" in item && item.str.trim().length > 0)
      .map((item) => ({ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width }));

    pages.push(reconstructReadingOrder(items));
  }

  return pages;
}

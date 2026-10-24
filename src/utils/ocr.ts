import { createWorker } from "tesseract.js";
import { loadPdf } from "./pdfText";

// Rendering scale for OCR: ~2.5x the PDF size gives ~180 dpi, enough for the
// small print of the declaration without making each page slow to read.
const RENDER_SCALE = 2.5;

interface OcrWord {
  text: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface OcrProgress {
  page: number;
  totalPages: number;
  stage: "loading" | "reading";
}

/**
 * OCR fallback for declarations without a text layer (scanned, or text
 * flattened into vector outlines). Every page is rendered to a canvas with
 * pdf.js and read by Tesseract (Portuguese), all inside the browser — only
 * the Tesseract engine and language data are downloaded, the PDF never
 * leaves the device. The output mimics extractPdfPages(): one string per
 * page, lines in reading order, columns separated by wide gaps, so the same
 * regex parser can be used.
 */
export async function ocrPdfPages(file: File, onProgress?: (p: OcrProgress) => void): Promise<string[]> {
  const pdf = await loadPdf(file);
  onProgress?.({ page: 0, totalPages: pdf.numPages, stage: "loading" });
  const worker = await createWorker("por");
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      onProgress?.({ page: pageNumber, totalPages: pdf.numPages, stage: "reading" });
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas 2D indisponível");
      await page.render({ canvasContext: context, viewport }).promise;

      const { data } = await worker.recognize(canvas);
      const words: OcrWord[] = (data.words ?? []).map((w) => ({
        text: normalizeNumericToken(w.text),
        x0: w.bbox.x0,
        x1: w.bbox.x1,
        y0: w.bbox.y0,
        y1: w.bbox.y1,
      }));
      pages.push(wordsToLines(words));
    }
  } finally {
    await worker.terminate();
  }
  return pages;
}

// Groups OCR words into lines (by vertical overlap) and joins them left to
// right, with a wide separator where the horizontal gap looks like a column
// break rather than a space between words.
function wordsToLines(words: OcrWord[]): string {
  if (words.length === 0) return "";
  const heights = words.map((w) => w.y1 - w.y0).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] || 10;

  const sorted = [...words].sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2);
  const lines: OcrWord[][] = [];
  for (const word of sorted) {
    const center = (word.y0 + word.y1) / 2;
    const line = lines.find((l) => Math.abs((l[0].y0 + l[0].y1) / 2 - center) <= medianHeight * 0.5);
    if (line) line.push(word);
    else lines.push([word]);
  }

  return lines
    .sort((a, b) => a[0].y0 - b[0].y0)
    .map((line) => {
      const ordered = line.sort((a, b) => a.x0 - b.x0);
      return ordered
        .map((w, idx) => (idx === 0 ? w.text : (w.x0 - ordered[idx - 1].x1 > medianHeight * 1.2 ? "   " : " ") + w.text))
        .join("");
    })
    .join("\n");
}

// Fixes the usual OCR confusions inside amounts (O→0, l/I→1) without touching
// ordinary words: only tokens that are digits plus those look-alikes.
function normalizeNumericToken(token: string): string {
  if (!/\d/.test(token) || !/^[\dOoIl.,\-/]+$/.test(token)) return token;
  return token.replace(/[Oo]/g, "0").replace(/[Il]/g, "1");
}

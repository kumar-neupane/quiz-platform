// server/services/pdfParser.ts
// OCR-aware parser for two-column MCQ PDFs + “Answer Key” grid.
// Keeps your exported types + function name (extractQuestionsFromPDF).

import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";

/** Parsed question structure (unchanged) */
export interface ParsedQuestion {
  questionNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
}

/* ----------------------------- Config ----------------------------- */

const CFG = {
  // layout
  yTolText: 2.5,
  yTolOCR: 6,
  splitMargin: 18, // protect mid split between columns
  // OCR
  dpi: 300,
  lang: "eng",
  psm: 6,
  oem: 1,
  // detection
  headerAnswerKey: /answer\s*key/i,
  // question/option regex
  qNum: /^\s*(\d{1,3})\s*[.)-]\s*(.*)$/,
  opt: /^\s*([a-e])[.)-]\s*(.*)$/i, // a–e just in case; we’ll only keep A–D later
};

type Word = { str: string; x: number; y: number; w: number; h: number; page: number; pageWidth: number };
type Line = { y: number; page: number; pageWidth: number; text: string; items: Word[] };

const clean = (s: string) =>
  s.replace(/\u00A0/g, " ").replace(/[|¦]/g, " ").replace(/\s+/g, " ").replace(/^[\s:.-]+|[\s:.-]+$/g, "").trim();

/* ----------------------- pdf.js text extraction ------------------- */

async function wordsFromText(pdfPath: string): Promise<Word[]> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  try {
    const pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true, disableWorker: true }).promise;
    const words: Word[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent({ includeMarkedContent: true });
      for (const it of tc.items as any[]) {
        const str = it.str || "";
        if (!str) continue;
        const tf: number[] = it.transform;
        const x = tf[4], yTop = vp.height - tf[5];
        words.push({ str, x, y: yTop, w: it.width || 0, h: it.height || 0, page: p, pageWidth: vp.width });
      }
    }
    return words;
  } catch (e: any) {
    // encrypted PDFs will throw PasswordException — skip gracefully
    if (e?.name?.toLowerCase?.() === "passwordexception") {
      console.warn(`  🔒 Encrypted PDF (skipping text layer): ${path.basename(pdfPath)}`);
      return [];
    }
    console.warn(`  ⚠️ Text layer read failed: ${e?.message || e}`);
    return [];
  }
}

/* ------------------------------ OCR ------------------------------- */

async function renderPageToPNG(page: any, scale: number) {
  const vp = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx as any, viewport: vp }).promise;
  return { buf: canvas.toBuffer("image/png"), width: vp.width, height: vp.height };
}

async function wordsFromOCR(pdfPath: string): Promise<Word[]> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true, disableWorker: true }).promise;

  const langPath = fs.existsSync("./tessdata") ? "./tessdata" : undefined;
  const worker = await createWorker({ langPath, logger: () => {} });
  await worker.loadLanguage(CFG.lang);
  await worker.initialize(CFG.lang);
  await worker.setParameters({
    tessedit_pageseg_mode: String(CFG.psm),
    tessedit_ocr_engine_mode: String(CFG.oem),
  });

  const scale = CFG.dpi / 72;
  const out: Word[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const { buf, width } = await renderPageToPNG(page, scale);
    const { data: res } = await worker.recognize(buf);
    for (const w of res.words || []) {
      if (!w?.text) continue;
      const x0 = w.bbox?.x0 ?? 0, y0 = w.bbox?.y0 ?? 0;
      const x1 = w.bbox?.x1 ?? x0, y1 = w.bbox?.y1 ?? y0;
      out.push({ str: w.text, x: x0, y: y0, w: x1 - x0, h: y1 - y0, page: p, pageWidth: width });
    }
  }
  await worker.terminate();
  return out;
}

/* ---------------------------- grouping ---------------------------- */

function groupIntoLines(words: Word[], yTol: number): Line[] {
  const byPg = new Map<number, Word[]>();
  for (const w of words) {
    if (!byPg.has(w.page)) byPg.set(w.page, []);
    byPg.get(w.page)!.push(w);
  }
  const lines: Line[] = [];
  for (const [page, arr] of byPg) {
    arr.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const pageWidth = arr[0]?.pageWidth ?? 0;
    for (const w of arr) {
      let L = lines.find(l => l.page === page && Math.abs(l.y - w.y) <= yTol);
      if (!L) { L = { y: w.y, page, pageWidth, text: "", items: [] }; lines.push(L); }
      L.items.push(w);
    }
  }
  for (const L of lines) {
    L.items.sort((a, b) => a.x - b.x);
    L.text = clean(L.items.map(i => i.str).join(" "));
  }
  lines.sort((a, b) => a.page - b.page || a.y - b.y);
  return lines;
}

function splitTwoColumns(lines: Line[]): { left: Line[]; right: Line[] } {
  const left: Line[] = [], right: Line[] = [];
  for (const L of lines) {
    const mid = (L.pageWidth || 0) / 2;
    const m = CFG.splitMargin;
    const firstX = L.items[0]?.x ?? 0;
    const last = L.items[L.items.length - 1];
    const lastRight = last ? last.x + last.w : 0;
    const spans = firstX < mid - m && lastRight > mid + m; // headers etc.
    (spans || firstX <= mid ? left : right).push(L);
  }
  left.sort((a, b) => a.page - b.page || a.y - b.y);
  right.sort((a, b) => a.page - b.page || a.y - b.y);
  return { left, right };
}

/* ------------------------- question parsing ----------------------- */

function parseQuestions(linesAll: Line[], maxPage?: number) {
  const lines = typeof maxPage === "number" ? linesAll.filter(l => l.page <= maxPage) : linesAll;
  const { left, right } = splitTwoColumns(lines);
  const ordered = [...left, ...right]; // read left column then right column

  type Building = {
    number?: number;
    stem: string;
    options: Record<string, string>;
  };

  const out: { number: number; stem: string; options: Record<string, string> }[] = [];
  let cur: Building | null = null;

  for (const L of ordered) {
    const t = L.text;

    const qm = t.match(CFG.qNum);
    if (qm) {
      if (cur && cur.number && Object.keys(cur.options).length) out.push(cur as any);
      cur = { number: parseInt(qm[1], 10), stem: clean(qm[2]), options: {} };
      continue;
    }
    if (!cur) continue;

    if (!Object.keys(cur.options).length && !/^\s*[a-e][.)-]\s+/i.test(t)) {
      cur.stem = clean(cur.stem + " " + t);
      continue;
    }

    const om = t.match(CFG.opt);
    if (om) {
      const k = om[1].toLowerCase();
      cur.options[k] = clean(om[2]);
      continue;
    }

    if (Object.keys(cur.options).length) {
      const keys = Object.keys(cur.options);
      if (keys.length) {
        const last = keys[keys.length - 1];
        cur.options[last] = clean(cur.options[last] + " " + t);
      }
    }
  }
  if (cur && cur.number && Object.keys(cur.options).length) out.push(cur as any);
  return out;
}

/* -------------------------- answer key ---------------------------- */

function findAnswerKeyStart(lines: Line[]): { page: number; y: number } | null {
  // Prefer explicit header
  const header = lines.find(l => CFG.headerAnswerKey.test(l.text));
  if (header) return { page: header.page, y: header.y };

  // Fallback: dense rows of “1.b 2.c 3.a …”
  const pairRe = /(\d{1,3})\s*[.)-]?\s*([A-Ea-e])\b/g;
  for (const l of lines) {
    let c = 0, m: RegExpExecArray | null;
    while ((m = pairRe.exec(l.text)) !== null) c++;
    if (c >= 6) return { page: l.page, y: l.y };
  }
  return null;
}

function parseAnswerKey(lines: Line[], startPage: number): Map<number, string> {
  const key = new Map<number, string>();
  const pairRe = /(\d{1,3})\s*[.)-]?\s*([A-Ea-e])\b/g;
  const keyLines = lines.filter(l => l.page === startPage || l.page === startPage + 1); // key fits in 1–2 pages
  for (const L of keyLines) {
    let m: RegExpExecArray | null;
    while ((m = pairRe.exec(L.text)) !== null) key.set(parseInt(m[1], 10), m[2].toUpperCase());
  }
  return key;
}

/* ----------------------------- main ------------------------------- */

export async function extractQuestionsFromPDF(pdfPath: string): Promise<ParsedQuestion[]> {
  // 1) try text layer
  let words = await wordsFromText(pdfPath);
  let lines = groupIntoLines(words, CFG.yTolText);

  // 2) find the answer key; if not seen, OCR everything
  let start = findAnswerKeyStart(lines);
  if (!start) {
    try {
      words = await wordsFromOCR(pdfPath);
      lines = groupIntoLines(words, CFG.yTolOCR);
      start = findAnswerKeyStart(lines);
    } catch (e: any) {
      console.warn(`  ⚠️ OCR failed on ${path.basename(pdfPath)}: ${e?.message || e}`);
      return [];
    }
  }

  // Build key from start page (or from last pages if still missing)
  const maxPage = Math.max(0, ...lines.map(l => l.page));
  const key = start
    ? parseAnswerKey(lines, start.page)
    : parseAnswerKey(lines.filter(l => l.page >= maxPage - 2), maxPage - 2);

  // Parse questions from pages BEFORE the key
  const qs = parseQuestions(lines, (start?.page ?? maxPage) - 1);

  // Shape to your interface and keep only A–D with an answer
  const out: ParsedQuestion[] = [];
  for (const q of qs) {
    const ans = key.get(q.number);
    if (!ans) continue; // skip if no answer found
    const A = q.options["a"] || "";
    const B = q.options["b"] || "";
    const C = q.options["c"] || "";
    const D = q.options["d"] || "";
    if (!A || !B || !C || !D) continue;

    out.push({
      questionNumber: q.number,
      questionText: q.stem,
      optionA: A,
      optionB: B,
      optionC: C,
      optionD: D,
      correctAnswer: (ans as "A" | "B" | "C" | "D"),
    });
  }

  if (!out.length) {
    console.warn("No questions parsed from PDF. Text extraction may have failed.");
  }
  return out;
}

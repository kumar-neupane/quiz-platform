// server/services/pdfParser.ts
// Gemini-powered PDF extractor for MCQs + final "Answer Key" grid.
// No native OCR deps. Works on Vercel as-is.

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

/** Output shape used by the rest of your app */
export interface ParsedQuestion {
  questionNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
}

/** (optional) local text extraction hook – return "" to force AI fallback */
export async function extractTextFromPDF(_pdfPath: string): Promise<string> {
  return "";
}

/** simple regex parser kept for future text-based PDFs */
export function parseQuestionsFromText(text: string): ParsedQuestion[] {
  const out: ParsedQuestion[] = [];
  if (!text?.trim()) return out;

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let cur: Partial<ParsedQuestion> | null = null;
  let opts = 0;

  for (const line of lines) {
    const qm = line.match(/^(\d+)\.\s+(.+)$/);
    if (qm) {
      if (
        cur && cur.questionText && cur.optionA && cur.optionB &&
        cur.optionC && cur.optionD && cur.correctAnswer
      ) out.push(cur as ParsedQuestion);

      cur = { questionNumber: parseInt(qm[1], 10), questionText: qm[2] };
      opts = 0;
      continue;
    }
    if (!cur) continue;

    const om = line.match(/^([a-d])\.\s+(.+)$/i);
    if (om) {
      const k = om[1].toUpperCase() as "A" | "B" | "C" | "D";
      const v = om[2];
      if (k === "A") cur.optionA = v;
      if (k === "B") cur.optionB = v;
      if (k === "C") cur.optionC = v;
      if (k === "D") cur.optionD = v;
      opts++;
      continue;
    }

    const am = line.match(/^(?:Answer|Ans|Correct Answer)[:\s]*([A-D])\b/i);
    if (am && opts >= 4) cur.correctAnswer = am[1].toUpperCase() as any;
  }

  if (
    cur && cur.questionText && cur.optionA && cur.optionB &&
    cur.optionC && cur.optionD && cur.correctAnswer
  ) out.push(cur as ParsedQuestion);

  return out;
}

/* ---------------- Gemini fallback (file upload + structured JSON) ---------------- */

const GEMINI_KEY = process.env.GEMINI_API_KEY ?? "";
const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;
const fileMgr = GEMINI_KEY ? new GoogleAIFileManager(GEMINI_KEY) : null;

async function geminiExtractQuestionsFromPDF(pdfPath: string): Promise<ParsedQuestion[]> {
  if (!genAI || !fileMgr) {
    console.warn("GEMINI_API_KEY not set; Gemini extraction skipped.");
    return [];
  }

  // 1) Upload PDF to Google AI file store
  const uploaded = await fileMgr.uploadFile(pdfPath, {
    mimeType: "application/pdf",
    displayName: path.basename(pdfPath),
  });

  // 2) Response must be strict JSON of known shape
  const responseSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            number: { type: "integer" },
            stem:   { type: "string" },
            options: {
              type: "object",
              additionalProperties: false,
              properties: {
                A: { type: "string" },
                B: { type: "string" },
                C: { type: "string" },
                D: { type: "string" }
              },
              required: ["A","B","C","D"]
            },
            correctAnswer: { type: "string", enum: ["A","B","C","D"] }
          },
          required: ["number","stem","options","correctAnswer"]
        }
      }
    },
    required: ["questions"]
  } as const;

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash", // fast + inexpensive
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema
    }
  });

  const prompt =
`You are reading a multi-page MCQ exam PDF. Extract ONLY the multiple-choice
questions that appear BEFORE any solutions/explanations.

Rules:
- Each question has exactly four options (a/b/c/d). Normalize to A,B,C,D.
- If an "Answer Key" table exists (e.g., "1.b 2.b 3.d ..."), use it to set
  correctAnswer for each question number.
- If both per-question answers and a final key exist, prefer the final key.
- Join wrapped lines of stems/options into one line.
- Do NOT include explanations or solution steps.`;

  const result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        { fileData: { fileUri: uploaded.file.uri, mimeType: uploaded.file.mimeType } }
      ]
    }]
  });

  // 3) SDK returns JSON text because we set responseMimeType: application/json
  const jsonText = result.response.text();
  let parsed: any = {};
  try { parsed = JSON.parse(jsonText || "{}"); }
  catch { parsed = { questions: [] }; }

  const items: any[] = Array.isArray(parsed?.questions) ? parsed.questions : [];
  const out: ParsedQuestion[] = [];
  for (const q of items) {
    if (!q || !q.stem) continue;
    out.push({
      questionNumber: q.number ?? 0,
      questionText: q.stem,
      optionA: q.options?.A ?? "",
      optionB: q.options?.B ?? "",
      optionC: q.options?.C ?? "",
      optionD: q.options?.D ?? "",
      correctAnswer: (q.correctAnswer ?? "A")
    });
  }
  return out;
}

/* ---------------- public entry: try text → fallback to Gemini --------------- */

export async function extractQuestionsFromPDF(pdfPath: string): Promise<ParsedQuestion[]> {
  // try local (currently blank) → then Gemini
  const text = await extractTextFromPDF(pdfPath);
  let questions = parseQuestionsFromText(text);

  if (!questions.length) {
    try {
      questions = await geminiExtractQuestionsFromPDF(pdfPath);
      if (!questions.length) {
        console.warn(`No questions parsed from ${path.basename(pdfPath)}.`);
      }
    } catch (err) {
      console.error("Gemini extraction failed:", err);
    }
  }
  return questions;
}

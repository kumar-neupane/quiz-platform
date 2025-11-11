// api/parse.ts  — Vercel Serverless Function
import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import { extractQuestionsFromPDF } from '../server/services/pdfParser';

async function readBody(req: VercelRequest): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  const body = await readBody(req);
  const url: string | undefined = body?.url;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Body must be { "url": "<public pdf url>" }' });
  }

  try {
    // 1) fetch the PDF
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Download failed: ${r.status} ${r.statusText}`);
    const buf = Buffer.from(await r.arrayBuffer());

    // 2) write to /tmp (writeable in Vercel functions)
    const tmpPath = path.join('/tmp', `quiz-${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, buf);

    // 3) parse with your Gemini-backed extractor
    const questions = await extractQuestionsFromPDF(tmpPath);

    // 4) cleanup & reply
    try { fs.unlinkSync(tmpPath); } catch {}
    return res.status(200).json({ count: questions.length, questions });
  } catch (err: any) {
    console.error('parse error:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}

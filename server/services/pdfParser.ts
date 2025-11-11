#!/usr/bin/env node

/**
 * Process PDFs from quizzes-source folder and create quizzes in the database
 * Usage: node scripts/process-quizzes.mjs
 */

import "dotenv/config"; // Load .env file
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Import the new advanced parser function
// NOTE: The new parser is a .ts file, so we use tsx
import { parsePdfToQA } from '../server/services/pdfParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUIZZES_SOURCE_DIR = path.join(__dirname, '../quizzes-source');
const PROCESSED_DIR = path.join(QUIZZES_SOURCE_DIR, 'processed');

async function ensureDirectories() {
  if (!fs.existsSync(QUIZZES_SOURCE_DIR)) {
    fs.mkdirSync(QUIZZES_SOURCE_DIR, { recursive: true });
    console.log(`Created directory: ${QUIZZES_SOURCE_DIR}`);
  }
  if (!fs.existsSync(PROCESSED_DIR)) {
    fs.mkdirSync(PROCESSED_DIR, { recursive: true });
    console.log(`Created directory: ${PROCESSED_DIR}`);
  }
}

async function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set. Please create a .env file.");
  }

  const pool = new Pool({
    connectionString: connectionString,
  });

  const db = drizzle(pool);
  return { db, pool };
}

async function createQuizFromPDF(filePath, { db, pool }) {
  try {
    console.log(`\nProcessing: ${path.basename(filePath)}`);

    // Use the new advanced parser to get Question/Answer pairs
    // The new parser returns an array of { question: string, answer: string }
    const qaPairs = await parsePdfToQA(filePath);

    if (qaPairs.length === 0) {
      console.warn(`  ⚠️  No question/answer pairs extracted from ${path.basename(filePath)}`);
      return false;
    }

    // --- Database Insertion Logic ---
    
    const client = await pool.connect();
    
    // Create quiz title from filename
    const fileName = path.basename(filePath, '.pdf');
    const quizTitle = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Insert quiz
    const quizQuery = 'INSERT INTO quizzes (title, description, "totalQuestions", "timeLimit", "passingScore", "isPublished", "providerId") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id';
    const quizResult = await client.query(quizQuery, [quizTitle, `Quiz from ${fileName}`, qaPairs.length, 3600, 50, true, 1]);
    
    const quizId = quizResult.rows[0].id;
    console.log(`  ✓ Created quiz: "${quizTitle}" (ID: ${quizId})`);

    // Insert questions
    // NOTE: We are making a massive assumption here: that the question text contains the options
    // and the answer text is the correct option letter (A, B, C, D).
    const questionQuery = 'INSERT INTO questions ("quizId", "questionNumber", "questionText", "optionA", "optionB", "optionC", "optionD", "correctAnswer", explanation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    
    for (let i = 0; i < qaPairs.length; i++) {
      const pair = qaPairs[i];
      
      // Since the new parser only gives Q and A text, we use placeholders for options
      // and the answer text as the correct answer.
      
      await client.query(questionQuery, [
        quizId, 
        i + 1, 
        pair.question, 
        'Option A', // Placeholder
        'Option B', // Placeholder
        'Option C', // Placeholder
        'Option D', // Placeholder
        pair.answer.toUpperCase().charAt(0), // Use the first letter of the answer as the correct option
        `Answer Key: ${pair.answer}` // Use the full answer text as an explanation
      ]);
    }

    client.release();
    
    console.log(`  ✓ Added ${qaPairs.length} questions`);

    // Move file to processed folder
    const processedPath = path.join(PROCESSED_DIR, path.basename(filePath));
    fs.renameSync(filePath, processedPath);
    console.log(`  ✓ Moved to processed folder`);

    return true;
  } catch (error) {
    console.error(`  ✗ Error processing ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🎯 Quiz Platform - PDF Processor');
    console.log('================================\n');

    await ensureDirectories();

    const files = fs.readdirSync(QUIZZES_SOURCE_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));

    if (files.length === 0) {
      console.log(`No PDF files found in ${QUIZZES_SOURCE_DIR}`);
      return;
    }

    console.log(`Found ${files.length} PDF file(s) to process\n`);

    const { db, pool } = await getDatabase();

    let successCount = 0;
    for (const file of files) {
      const filePath = path.join(QUIZZES_SOURCE_DIR, file);
      const success = await createQuizFromPDF(filePath, { db, pool });
      if (success) successCount++;
    }

    await pool.end();

    console.log(`\n================================`);
    console.log(`✓ Processing complete: ${successCount}/${files.length} quizzes created`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

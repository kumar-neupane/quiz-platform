#!/usr/bin/env node

import "dotenv/config";/**
 * Process PDFs from quizzes-source folder and create quizzes in the database
 * Usage: node scripts/process-quizzes.mjs
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/node-postgres'; // Import the correct Drizzle driver
import { Pool } from 'pg'; // Import the PostgreSQL client

// Import the PDF parser
import { extractQuestionsFromPDF, parseQuestionsFromText } from '../server/services/pdfParser.js';

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
  // Use the DATABASE_URL from the environment variable
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set. Please create a .env file.");
  }

  // Create a PostgreSQL pool
  const pool = new Pool({
    connectionString: connectionString,
  });

  // Create a Drizzle connection
  const db = drizzle(pool);
  return { db, pool };
}

async function createQuizFromPDF(filePath, { db, pool }) {
  try {
    console.log(`\nProcessing: ${path.basename(filePath)}`);

    // Extract questions from PDF
    const questions = await extractQuestionsFromPDF(filePath);

    if (questions.length === 0) {
      console.warn(`  ⚠️  No questions extracted from ${path.basename(filePath)}`);
      return false;
    }

    // Create quiz title from filename
    const fileName = path.basename(filePath, '.pdf');
    const quizTitle = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // --- Drizzle ORM Insert Logic (Simplified for raw SQL) ---
    
    const client = await pool.connect();
    
    // Insert quiz
    const quizQuery = 'INSERT INTO quizzes (title, description, "totalQuestions", "timeLimit", "passingScore", "isPublished", "providerId") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id';
    const quizResult = await client.query(quizQuery, [quizTitle, `Quiz from ${fileName}`, questions.length, 3600, 50, true, 1]);
    
    const quizId = quizResult.rows[0].id;
    console.log(`  ✓ Created quiz: "${quizTitle}" (ID: ${quizId})`);

    // Insert questions
    const questionQuery = 'INSERT INTO questions ("quizId", "questionNumber", "questionText", "optionA", "optionB", "optionC", "optionD", "correctAnswer", explanation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await client.query(questionQuery, [quizId, i + 1, q.questionText, q.optionA, q.optionB, q.optionC, q.optionD, q.correctAnswer, '']);
    }

    client.release();
    
    console.log(`  ✓ Added ${questions.length} questions`);

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

    // Get PDF files from quizzes-source
    const files = fs.readdirSync(QUIZZES_SOURCE_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));

    if (files.length === 0) {
      console.log(`No PDF files found in ${QUIZZES_SOURCE_DIR}`);
      console.log(`\nTo create quizzes:`);
      console.log(`1. Place PDF files in: ${QUIZZES_SOURCE_DIR}`);
      console.log(`2. Run this script again`);
      return;
    }

    console.log(`Found ${files.length} PDF file(s) to process\n`);

    // Connect to database
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

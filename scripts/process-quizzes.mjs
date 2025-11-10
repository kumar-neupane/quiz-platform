#!/usr/bin/env node

/**
 * Process PDFs from quizzes-source folder and create quizzes in the database
 * Usage: node scripts/process-quizzes.mjs
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the PDF parser
import { extractQuestionsFromPDF, parseQuestionsFromText } from '../server/services/pdfParser.js';

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
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quiz_platform',
  });
  return connection;
}

async function createQuizFromPDF(filePath, connection) {
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

    // Insert quiz
    const [quizResult] = await connection.execute(
      'INSERT INTO quizzes (title, description, totalQuestions, timeLimit, passingScore, isPublished, providerId) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [quizTitle, `Quiz from ${fileName}`, questions.length, 3600, 50, true, 1]
    );

    const quizId = quizResult.insertId;
    console.log(`  ✓ Created quiz: "${quizTitle}" (ID: ${quizId})`);

    // Insert questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await connection.execute(
        'INSERT INTO questions (quizId, questionNumber, questionText, optionA, optionB, optionC, optionD, correctAnswer, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [quizId, i + 1, q.questionText, q.optionA, q.optionB, q.optionC, q.optionD, q.correctAnswer, '']
      );
    }

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
    const connection = await getDatabase();

    let successCount = 0;
    for (const file of files) {
      const filePath = path.join(QUIZZES_SOURCE_DIR, file);
      const success = await createQuizFromPDF(filePath, connection);
      if (success) successCount++;
    }

    await connection.end();

    console.log(`\n================================`);
    console.log(`✓ Processing complete: ${successCount}/${files.length} quizzes created`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

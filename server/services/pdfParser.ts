import * as fs from 'fs';
import { PDFParse } from 'pdf-parse';

/**
 * Parsed question structure extracted from PDF
 */
export interface ParsedQuestion {
  questionNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D' | null; // Corrected to allow null
}

/**
 * Extract text from PDF using pdf-parse
 * @param pdfPath - Path to the PDF file
 * @returns Extracted text content
 */
export async function extractTextFromPDF(pdfPath: string): Promise<string> {
  try {
    const fileBuffer = fs.readFileSync(pdfPath);
    const pdfParser = new PDFParse({ data: fileBuffer });
    const textResult = await pdfParser.getText();
    await pdfParser.destroy();
    return textResult.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Parse extracted text into structured questions
 * This parser looks for patterns like:
 * 1. Question text
 * a Option A (Modified to be more flexible)
 * b Option B
 * c Option C
 * d Option D
 * 
 * @param text - Raw text extracted from PDF
 * @returns Array of parsed questions
 */
export function parseQuestionsFromText(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  
  // Split text into lines and clean up
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let currentQuestion: Partial<ParsedQuestion> | null = null;
  let optionCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line starts with a number followed by period (question number)
    const questionMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (questionMatch) {
      // Save previous question if valid (only requires all options to be present)
      if (currentQuestion && 
          currentQuestion.questionText && 
          currentQuestion.optionA && 
          currentQuestion.optionB && 
          currentQuestion.optionC && 
          currentQuestion.optionD) {
        // Set correctAnswer to null if not found
        currentQuestion.correctAnswer = currentQuestion.correctAnswer || null;
        questions.push(currentQuestion as ParsedQuestion);
      }
      
      // Start new question
      currentQuestion = {
        questionNumber: parseInt(questionMatch[1]),
        questionText: questionMatch[2],
      };
      optionCount = 0;
      continue;
    }
    
    // Check for options (a, b, c, d) - MODIFIED REGEX
    if (currentQuestion && optionCount < 4) {
      // Matches: a. Option Text OR a Option Text
      const optionMatch = line.match(/^([a-d])[\.\s]+\s*(.+)$/i);
      if (optionMatch) {
        const optionLetter = optionMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        const optionText = optionMatch[2];
        
        if (optionLetter === 'A') {
          currentQuestion.optionA = optionText;
          optionCount++;
        } else if (optionLetter === 'B') {
          currentQuestion.optionB = optionText;
          optionCount++;
        } else if (optionLetter === 'C') {
          currentQuestion.optionC = optionText;
          optionCount++;
        } else if (optionLetter === 'D') {
          currentQuestion.optionD = optionText;
          optionCount++;
        }
      }
    }
    
    // Check for answer indicator (Answer: A or similar) - RETAINED FOR FUTURE USE
    if (currentQuestion && optionCount === 4 && !currentQuestion.correctAnswer) {
      const answerMatch = line.match(/^(?:Answer|Ans|Correct Answer|Answer:)[\s:]*([A-D])/i);
      if (answerMatch) {
        currentQuestion.correctAnswer = answerMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      }
    }
  }
  
  // Add last question if valid (only requires all options to be present)
  if (currentQuestion && 
      currentQuestion.questionText && 
      currentQuestion.optionA && 
      currentQuestion.optionB && 
      currentQuestion.optionC && 
      currentQuestion.optionD) {
    // Set correctAnswer to null if not found
    currentQuestion.correctAnswer = currentQuestion.correctAnswer || null;
    questions.push(currentQuestion as ParsedQuestion);
  }
  
  return questions;
}

/**
 * Main function to extract and parse questions from PDF
 * @param pdfPath - Path to the PDF file
 * @returns Array of parsed questions
 */
export async function extractQuestionsFromPDF(pdfPath: string): Promise<ParsedQuestion[]> {
  try {
    const text = await extractTextFromPDF(pdfPath);
    const questions = parseQuestionsFromText(text);
    
    if (questions.length === 0) {
      console.warn('No questions parsed from PDF. Text extraction may have failed.');
    }
    
    return questions;
  } catch (error) {
    console.error('Error extracting questions from PDF:', error);
    throw error;
  }
}

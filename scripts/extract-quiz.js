const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const path = require('path');

async function extractQuizFromPDF(pdfPath) {
  const dataBuffer = await fs.readFile(pdfPath);
  const data = await pdfParse(dataBuffer);

  const lines = data.text.split('\n').map(line => line.trim()).filter(line => line);
  const questions = [];
  let currentQuestion = null;

  for (let line of lines) {
    if (/^\d+\./.test(line)) { // Detect question number (e.g., "1.", "2.")
      if (currentQuestion) questions.push(currentQuestion);
      currentQuestion = { question: line.replace(/^\d+\.\s*/, ''), options: [], correct: '', explanation: '' };
    } else if (currentQuestion && /^[a-d]\.\s/.test(line)) { // Detect options (e.g., "a.", "b.")
      currentQuestion.options.push(line.replace(/^[a-d]\.\s/, '$& ').replace(/\s+/g, ' '));
      if (!currentQuestion.correct && line.toLowerCase().includes('answer') && /[a-d]/i.test(line)) {
        currentQuestion.correct = line.match(/[a-d]/i)[0].toUpperCase();
      }
    } else if (currentQuestion && !currentQuestion.explanation && line.toLowerCase().includes('explanation')) {
      currentQuestion.explanation = line.replace(/.*explanation[:\s]*/i, '').trim() || 'Explanation not provided.';
    }
  }
  if (currentQuestion) questions.push(currentQuestion);

  // Tag based on filename or content
  const tag = pdfPath.includes('Shift') ? 'physics' : pdfPath.includes('Set') ? 'math' : 'general';
  return { tag, questions };
}

async function processPDFs() {
  const pdfDir = path.join(__dirname, '../quizzes-source');
  const outputDir = path.join(__dirname, '../public/data');
  await fs.mkdir(outputDir, { recursive: true });

  const files = await fs.readdir(pdfDir);
  for (let file of files) {
    if (file.endsWith('.pdf')) {
      const pdfPath = path.join(pdfDir, file);
      const { tag, questions } = await extractQuizFromPDF(pdfPath);
      const jsonContent = JSON.stringify({ tag, questions }, null, 2);
      const outputPath = path.join(outputDir, `${path.basename(file, '.pdf')}.json`);
      await fs.writeFile(outputPath, jsonContent, 'utf8');
      console.log(`Saved ${outputPath}`);
    }
  }
}

processPDFs().catch(console.error);

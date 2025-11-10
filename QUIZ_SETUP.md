# Quiz Platform Setup Guide

## Overview

This is a public-facing quiz platform where:
- **Users** can browse and take quizzes (no uploads, no admin features visible)
- **PDFs are automatically processed** from a designated folder and converted to quizzes
- **No authentication required** - anyone can take quizzes

## How to Add Quizzes

### Step 1: Prepare Your PDF Files

Your PDF files should contain questions in this format:

```
1. What is the capital of France?
a. London
b. Paris
c. Berlin
d. Madrid
Answer: B

2. What is 2 + 2?
a. 3
b. 4
c. 5
d. 6
Answer: B
```

**Format Requirements:**
- Questions numbered: `1.`, `2.`, `3.`, etc.
- Options labeled: `a.`, `b.`, `c.`, `d.`
- Answer indicator: `Answer: A` or `Ans: A` (case-insensitive)
- One question per section

### Step 2: Place PDFs in the Source Folder

Copy your PDF files to the `quizzes-source/` folder:

```bash
cp your-quiz.pdf /path/to/quiz_platform/quizzes-source/
```

### Step 3: Process the PDFs

Run the processing script to automatically create quizzes from the PDFs:

```bash
cd /path/to/quiz_platform
node scripts/process-quizzes.mjs
```

**What happens:**
1. Script reads all PDFs from `quizzes-source/`
2. Extracts questions and answers
3. Creates quizzes in the database
4. Moves processed PDFs to `quizzes-source/processed/`

### Step 4: Verify Quizzes Were Created

Visit your quiz platform and check the "Available Quizzes" page. Your new quizzes should appear automatically.

## File Structure

```
quiz_platform/
├── quizzes-source/          ← Place your PDF files here
│   └── processed/           ← Processed PDFs are moved here
├── scripts/
│   └── process-quizzes.mjs  ← Run this to process PDFs
├── client/                  ← Frontend (public quiz interface)
├── server/                  ← Backend (quiz logic)
└── drizzle/                 ← Database schema
```

## Deployment to GitHub Pages

### Option 1: Static Export (Recommended for GitHub Pages)

1. Build the project:
   ```bash
   pnpm build
   ```

2. Deploy the `dist/` folder to GitHub Pages

### Option 2: Full Stack Deployment

If you want the backend processing:

1. Use a hosting service that supports Node.js (e.g., Vercel, Railway, Heroku)
2. Set up the database
3. Deploy the entire application

## Database Setup

The platform uses MySQL/TiDB. Ensure your database has these tables:

- `users` - User accounts
- `quizzes` - Quiz metadata
- `questions` - Quiz questions
- `quiz_attempts` - User quiz attempts
- `user_responses` - User answers

Run migrations:
```bash
pnpm db:push
```

## Troubleshooting

### PDFs Not Processing

1. Check PDF format matches the requirements above
2. Ensure PDF contains readable text (not scanned images)
3. Check console output for specific errors:
   ```bash
   node scripts/process-quizzes.mjs
   ```

### Questions Not Extracted

- Verify the PDF has clear question numbering (1., 2., 3., etc.)
- Ensure options are labeled a., b., c., d.
- Check that answers are marked with "Answer:" or "Ans:"

### Database Connection Error

- Verify `DATABASE_URL` environment variable is set
- Check database credentials in `.env`
- Ensure database server is running

## Features

✅ **Automatic PDF Processing** - Drop PDFs in a folder, they become quizzes
✅ **Timed Quizzes** - Configurable time limits per quiz
✅ **Instant Results** - Users see scores and detailed answer reviews immediately
✅ **No Authentication Required** - Public access for all users
✅ **Responsive Design** - Works on desktop, tablet, and mobile
✅ **Multiple Quizzes** - Support unlimited quizzes

## Example Usage

```bash
# 1. Add a PDF to the source folder
cp exam-questions.pdf quizzes-source/

# 2. Process it
node scripts/process-quizzes.mjs

# Output:
# 🎯 Quiz Platform - PDF Processor
# ================================
# 
# Found 1 PDF file(s) to process
# 
# Processing: exam-questions.pdf
#   ✓ Created quiz: "Exam Questions" (ID: 1)
#   ✓ Added 50 questions
#   ✓ Moved to processed folder
# 
# ================================
# ✓ Processing complete: 1/1 quizzes created

# 3. Visit the platform - your quiz is now available!
```

## Support

For issues or questions, check:
1. Console output from the processing script
2. Database logs
3. Browser console for frontend errors

---

**Happy quizzing! 🎓**

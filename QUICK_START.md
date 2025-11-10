# Quick Start: Deploy Quiz Platform in 5 Minutes

## TL;DR - Fast Deployment Steps

### 1. Push to GitHub (2 minutes)

```bash
cd /home/ubuntu/quiz_platform

# Initialize and push to GitHub
git init
git add .
git commit -m "Quiz platform"
git remote add origin https://github.com/YOUR_USERNAME/quiz-platform.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel (2 minutes)

1. Go to https://vercel.com
2. Click "Sign Up" → "Continue with GitHub"
3. Click "New Project"
4. Select your `quiz-platform` repository
5. Click "Deploy"

**That's it! Your platform is live at `https://quiz-platform.vercel.app`**

### 3. Set Up Database (1 minute)

1. In Vercel dashboard, go to "Storage" tab
2. Click "Create Database" → "Postgres"
3. Copy the connection string
4. Go to Settings → Environment Variables
5. Add `DATABASE_URL` with the connection string
6. Redeploy

### 4. Add Quizzes

```bash
# Add PDF to quizzes-source/
cp your-quiz.pdf quizzes-source/

# Process it
node scripts/process-quizzes.mjs

# Push to GitHub (auto-deploys)
git add .
git commit -m "Add quizzes"
git push origin main
```

## What You Get

✅ **Live Quiz Platform** - Accessible worldwide  
✅ **Free Forever** - No charges, no credit card  
✅ **Auto-Deploys** - Push to GitHub, Vercel deploys automatically  
✅ **Free Database** - PostgreSQL included  
✅ **Timed Quizzes** - With countdown timer  
✅ **Instant Results** - Score and answer review  

## Your URLs

- **Platform**: `https://quiz-platform.vercel.app`
- **GitHub**: `https://github.com/YOUR_USERNAME/quiz-platform`

## PDF Format

Your PDFs should look like:

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

## Troubleshooting

**Build failed?** → Check Vercel logs in Deployments tab  
**Database error?** → Verify DATABASE_URL in Environment Variables  
**Quizzes not showing?** → Run `node scripts/process-quizzes.mjs` locally  

## Full Guides

- **Detailed Vercel Setup**: See `VERCEL_DEPLOYMENT.md`
- **PDF Format & Processing**: See `QUIZ_SETUP.md`
- **GitHub Deployment**: See `GITHUB_DEPLOYMENT.md`

---

**Questions?** Check the detailed guides or Vercel's documentation at https://vercel.com/docs

**Ready to deploy?** Go to Step 1 above! 🚀

# Deploy Quiz Platform to Vercel (Free)

This guide will help you deploy the quiz platform to **Vercel** completely free with no credit card required.

## Why Vercel?

✅ **100% Free** - No charges for hobby/personal projects  
✅ **No Credit Card** - Sign up with GitHub account only  
✅ **Automatic Deployments** - Push to GitHub, Vercel deploys automatically  
✅ **Full-Stack Support** - Node.js backend + database  
✅ **Free Database** - PostgreSQL included  
✅ **Custom Domain** - Free subdomain like `quiz-platform.vercel.app`  

## Step 1: Push Your Project to GitHub

### Create a GitHub Repository

1. Go to https://github.com/new
2. Create a new repository named `quiz-platform`
3. Choose "Public"
4. Click "Create repository"

### Push Your Code

```bash
cd /home/ubuntu/quiz_platform

# Initialize git if not already done
git init
git add .
git commit -m "Initial commit: Quiz platform"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/quiz-platform.git
git branch -M main
git push -u origin main
```

## Step 2: Sign Up on Vercel

1. Go to https://vercel.com
2. Click "Sign Up"
3. Choose "Continue with GitHub"
4. Authorize Vercel to access your GitHub account
5. Complete the signup

## Step 3: Deploy Your Project

### Import Project from GitHub

1. After signing up, you'll see the Vercel dashboard
2. Click "New Project" or "Add New..."
3. Click "Import Git Repository"
4. Find and select `quiz-platform` repository
5. Click "Import"

### Configure Project

1. **Framework Preset**: Select "Vite"
2. **Root Directory**: Leave as `.` (root)
3. **Build Command**: `pnpm build`
4. **Output Directory**: `dist`
5. **Install Command**: `pnpm install`

### Environment Variables

You'll need to set up environment variables for the database. Skip this for now - we'll set it up in the next step.

Click "Deploy" - Vercel will start building your project!

## Step 4: Set Up Free PostgreSQL Database

Vercel offers free PostgreSQL through **Vercel Postgres**. Here's how:

### Create Database

1. Go to your Vercel project dashboard
2. Click the "Storage" tab
3. Click "Create Database"
4. Choose "Postgres"
5. Click "Create"
6. Accept the terms and create

### Get Connection String

1. After database is created, click on it
2. Go to the ".env.local" tab
3. Copy the `POSTGRES_PRISMA_URL` (this is your connection string)

### Add to Vercel Environment Variables

1. Go to your project Settings
2. Click "Environment Variables"
3. Add a new variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Paste the connection string you copied
4. Click "Save"

## Step 5: Deploy Database Schema

Your database is created but empty. You need to run migrations:

### Option A: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Link your project:
```bash
cd /home/ubuntu/quiz_platform
vercel link
```

3. Pull environment variables:
```bash
vercel env pull
```

4. Run migrations:
```bash
pnpm db:push
```

5. Push changes:
```bash
git add .
git commit -m "Database schema"
git push origin main
```

Vercel will automatically redeploy!

### Option B: Manual via Vercel Dashboard

1. Go to Vercel project → Settings → Environment Variables
2. Add all variables from your `.env` file
3. Trigger a redeploy by pushing a commit to GitHub

## Step 6: Add Your PDFs and Create Quizzes

### Local Setup

1. Clone your repository:
```bash
git clone https://github.com/YOUR_USERNAME/quiz-platform.git
cd quiz-platform
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
# Create .env.local file with your database URL
echo "DATABASE_URL=your_connection_string_here" > .env.local
```

### Process PDFs

1. Add PDF files to `quizzes-source/` folder
2. Run the processing script:
```bash
node scripts/process-quizzes.mjs
```

3. Commit and push:
```bash
git add quizzes-source/processed/
git commit -m "Add new quizzes"
git push origin main
```

Vercel will automatically rebuild and deploy!

## Step 7: Access Your Quiz Platform

Your platform will be live at:

```
https://quiz-platform.vercel.app
```

(Replace `quiz-platform` with your actual project name)

## Adding More Quizzes

To add new quizzes:

1. **Locally**:
```bash
# Add PDF to quizzes-source/
cp your-quiz.pdf quizzes-source/

# Process it
node scripts/process-quizzes.mjs

# Push to GitHub
git add quizzes-source/
git commit -m "Add new quizzes"
git push origin main
```

2. **Vercel automatically rebuilds** and deploys your changes

## Troubleshooting

### Build Failed

Check the build logs:
1. Go to Vercel dashboard
2. Click on your project
3. Go to "Deployments" tab
4. Click the failed deployment
5. Check the logs for errors

### Database Connection Error

- Verify `DATABASE_URL` is set in Environment Variables
- Check the connection string is correct
- Ensure database is created in Vercel Postgres

### Quizzes Not Showing

- Verify PDFs were processed: `node scripts/process-quizzes.mjs`
- Check database has quiz data
- Verify deployment was successful

## Monitoring Your Deployment

### View Logs

```bash
# Install Vercel CLI
npm install -g vercel

# View logs
vercel logs
```

### Check Deployments

1. Go to Vercel dashboard
2. Click your project
3. Go to "Deployments" tab
4. See all deployments and their status

## Cost Breakdown

| Service | Cost |
|---------|------|
| Vercel Hosting | **Free** |
| Vercel Postgres | **Free** (up to 3 databases) |
| Custom Domain | **Free** (vercel.app subdomain) |
| **Total** | **$0** |

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Deploy to Vercel
3. ✅ Set up PostgreSQL database
4. ✅ Run migrations
5. ✅ Add PDFs and create quizzes
6. ✅ Share your quiz platform URL!

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Community**: https://vercel.com/community
- **Postgres Docs**: https://vercel.com/docs/storage/postgres

---

**Your quiz platform is now live and free! 🚀**

Questions? Check the troubleshooting section or visit Vercel's documentation.

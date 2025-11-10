# Deploy Quiz Platform to GitHub Pages

This guide will help you deploy the quiz platform to GitHub Pages for free hosting.

## Prerequisites

- GitHub account (free)
- Git installed on your computer
- Node.js and npm/pnpm installed

## Step 1: Create a New GitHub Repository

### Option A: New Repository (Recommended)

1. Go to https://github.com/new
2. Create a new repository named `quiz-platform` (or any name you prefer)
3. Choose "Public" (so it's accessible to everyone)
4. **Do NOT** initialize with README, .gitignore, or license
5. Click "Create repository"

### Option B: Use Existing Repository

If you want to add this to your existing `kumar-neupane.github.io` repo:
- You can host it at `kumar-neupane.github.io/quiz` (subdirectory)
- This requires additional configuration (see "Deploy to Subdirectory" section below)

## Step 2: Prepare Your Local Project

### Clone the Repository

```bash
# Navigate to where you want to store the project
cd ~/projects

# Clone your new repository
git clone https://github.com/YOUR_USERNAME/quiz-platform.git
cd quiz-platform
```

### Copy Project Files

Copy all files from the quiz_platform folder to your cloned repository:

```bash
# From the quiz-platform directory
cp -r /home/ubuntu/quiz_platform/* .
```

## Step 3: Install Dependencies

```bash
# Install all required packages
pnpm install
# or if you use npm:
npm install
```

## Step 4: Build the Project

```bash
# Build for production
pnpm build
# or:
npm run build
```

This creates a `dist/` folder with all the static files ready for deployment.

## Step 5: Configure for GitHub Pages

### Edit `vite.config.ts`

Open `vite.config.ts` and ensure it has the correct base path:

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/',  // For root domain deployment
  // OR
  base: '/quiz-platform/',  // If deploying to subdirectory
})
```

### For Root Domain (e.g., quiz-platform.github.io)

Use `base: '/'`

### For Subdirectory (e.g., yoursite.com/quiz)

Use `base: '/quiz-platform/'`

## Step 6: Deploy to GitHub Pages

### Method 1: Using GitHub Actions (Automated - Recommended)

1. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

2. Commit and push:

```bash
git add .
git commit -m "Initial commit: Quiz platform"
git push origin main
```

3. GitHub Actions will automatically build and deploy!

### Method 2: Manual Deployment

1. Build the project:
```bash
pnpm build
```

2. Create a `gh-pages` branch:
```bash
git checkout --orphan gh-pages
git rm -rf .
```

3. Copy the dist folder contents:
```bash
cp -r dist/* .
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages
```

4. Switch back to main:
```bash
git checkout main
```

## Step 7: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Source", select:
   - Branch: `gh-pages` (or `main` if using Actions)
   - Folder: `/ (root)`
4. Click **Save**

GitHub will show you the URL where your site is deployed (usually `https://YOUR_USERNAME.github.io/quiz-platform`)

## Step 8: Add Your PDFs

Once deployed:

1. Clone your repository locally:
```bash
git clone https://github.com/YOUR_USERNAME/quiz-platform.git
cd quiz-platform
```

2. Place PDF files in `quizzes-source/` folder:
```bash
cp your-quiz.pdf quizzes-source/
```

3. Process the PDFs:
```bash
node scripts/process-quizzes.mjs
```

4. Commit and push:
```bash
git add quizzes-source/
git commit -m "Add new quizzes"
git push origin main
```

## Accessing Your Quiz Platform

After deployment, your quiz platform will be available at:

- **Root domain**: `https://YOUR_USERNAME.github.io/quiz-platform`
- **Custom domain**: If you set up a custom domain in GitHub Pages settings

## Updating Quizzes

To add more quizzes:

1. Add PDF files to `quizzes-source/`
2. Run: `node scripts/process-quizzes.mjs`
3. Commit and push changes
4. GitHub Actions will automatically rebuild and deploy

## Troubleshooting

### Site Not Showing

- Wait 1-2 minutes after pushing
- Check GitHub Actions tab to see if build succeeded
- Verify GitHub Pages is enabled in Settings

### PDFs Not Processing

- Ensure PDF format matches requirements in QUIZ_SETUP.md
- Check console output: `node scripts/process-quizzes.mjs`

### Database Issues

- GitHub Pages is static hosting - it doesn't support databases
- **Solution**: Pre-process all PDFs locally and commit the quiz data to the repository

## Database Solution for GitHub Pages

Since GitHub Pages is static, you need to:

1. **Process all PDFs locally** before deploying
2. **Export quiz data** as JSON
3. **Commit the JSON** to the repository
4. **Load quizzes from JSON** in the frontend

Would you like me to modify the platform to use JSON instead of a database?

## Summary

| Step | Command |
|------|---------|
| Clone repo | `git clone https://github.com/YOUR_USERNAME/quiz-platform.git` |
| Install deps | `pnpm install` |
| Add PDFs | Place files in `quizzes-source/` |
| Process PDFs | `node scripts/process-quizzes.mjs` |
| Build | `pnpm build` |
| Deploy | `git push origin main` (if using GitHub Actions) |

---

**Your quiz platform will be live in minutes! 🚀**

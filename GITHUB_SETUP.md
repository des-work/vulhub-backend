# GitHub Repository Setup Instructions

Follow these steps to create and push the backend repository to GitHub.

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `vulhub-backend`
3. Description: `NestJS backend API for VulHub Leaderboard`
4. Visibility: **Public** (recommended) or **Private** (your choice)
5. **Do NOT** initialize with README, .gitignore, or license (we already have these)
6. Click **Create repository**

## Step 2: Add Remote and Push

Copy the commands below. Replace `YOUR_USERNAME` with your GitHub username.

```bash
cd /c/Users/desmo/GA\ Projects/vulhub-backend

# Add GitHub as remote
git remote add origin https://github.com/YOUR_USERNAME/vulhub-backend.git

# Rename branch to main
git branch -M main

# Push to GitHub
git push -u origin main
```

**Expected output**:
```
Enumerating objects: ...
Counting objects: ...
Compressing objects: ...
Writing objects: ...
...
* [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

## Step 3: Verify

1. Go to https://github.com/YOUR_USERNAME/vulhub-backend
2. You should see:
   - ✅ README.md
   - ✅ DEPLOYMENT.md
   - ✅ .gitignore
   - ✅ src/ folder
   - ✅ prisma/ folder
   - ✅ package.json

## Next: Deploy to Railway

Once verified, follow `DEPLOYMENT.md` to deploy to Railway.

---

## Troubleshooting

**Error: "fatal: not a git repository"**
- Make sure you're in the correct directory: `/c/Users/desmo/GA\ Projects/vulhub-backend`
- Check that `.git` folder exists: `ls -la .git`

**Error: "remote origin already exists"**
- Run: `git remote remove origin`
- Then retry: `git remote add origin https://github.com/YOUR_USERNAME/vulhub-backend.git`

**Error: "fatal: 'origin' does not appear to be a 'git' repository"**
- Make sure you used HTTPS URL format: `https://github.com/YOUR_USERNAME/vulhub-backend.git`
- Not SSH format: `git@github.com:YOUR_USERNAME/vulhub-backend.git`


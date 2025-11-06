# 🚀 START HERE: Backend Deployment in 20 Minutes

This is your backend repository, ready to deploy. Follow these steps to go live.

---

## ⏱️ Timeline: 20 Minutes to Live

| Step | Time | What | Who |
|------|------|------|-----|
| 1 | 5 min | Create GitHub repo | YOU |
| 2 | 1 min | Push code | Automated |
| 3 | 10 min | Deploy to Railway | Railway |
| 4 | 5 min | Update Frontend URL | YOU |

---

## Step 1️⃣: Create GitHub Repository (5 mins)

### You Do This:

1. Go to https://github.com/new
2. Fill in:
   - **Repository name**: `vulhub-backend`
   - **Description**: `NestJS backend for VulHub`
   - **Visibility**: Public (recommended)
3. **Don't** initialize with README (we already have it)
4. Click **Create repository**

### You Should Now See:

A blank repo with instructions to push existing code.

---

## Step 2️⃣: Push Code to GitHub (1 min)

### Run This Command:

Open Git Bash/Terminal in this directory and run:

```bash
# Navigate to backend directory (if not already there)
cd /c/Users/desmo/GA\ Projects/vulhub-backend

# Add GitHub as remote
git remote add origin https://github.com/YOUR_USERNAME/vulhub-backend.git

# Rename branch
git branch -M main

# Push code
git push -u origin main
```

**Replace `YOUR_USERNAME` with YOUR actual GitHub username**

### You Should See:

```
Enumerating objects: ...
Counting objects: ...
...
* [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

---

## Step 3️⃣: Deploy to Railway (10 mins)

### What Railway Does (Automatically):

1. Detects Node.js/NestJS
2. Installs dependencies
3. Builds the app
4. Runs migrations
5. Starts the server

### You Do This:

1. Go to https://railway.app
2. Sign up (free account)
3. Create new project
4. Select "Deploy from GitHub"
5. Choose your `vulhub-backend` repo
6. Railway auto-builds and deploys
7. Wait for green "Deployment successful" message

### You Get:

A live backend URL like:
```
https://your-app-production.up.railway.app
```

---

## Step 4️⃣: Connect Frontend to Backend (5 mins)

### Update Frontend URL:

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Click your frontend project
3. Settings → Environment Variables
4. Find `NEXT_PUBLIC_API_URL`
5. Update to your Railway domain:
   ```
   https://your-app-production.up.railway.app/api/v1
   ```
6. Save and redeploy

### Frontend Will Now:

- Connect to your backend
- Support user login
- Load leaderboard data
- Work end-to-end ✅

---

## 🧪 Verify It Works

### Check Backend Health:

```bash
# Replace with your Railway domain
curl https://your-app-production.up.railway.app/health

# Should return:
# {"status":"ok"}
```

### Test Frontend:

1. Visit your Vercel URL
2. Try logging in
3. Check leaderboard loads
4. No errors in browser console

---

## 📚 Reference Files

All documentation is in this directory:

- `GITHUB_SETUP.md` - Detailed GitHub steps (if you get stuck)
- `DEPLOYMENT.md` - Railway detailed guide
- `README.md` - Backend overview
- `.env.example` - Environment variables reference

---

## ⚠️ Common Issues

### "fatal: remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/vulhub-backend.git
```

### Railway build fails
- Check Railway logs
- Verify environment variables are set
- Make sure database URL is correct

### Frontend can't call backend
- Check CORS_ORIGIN in Railway env vars
- Verify backend domain in NEXT_PUBLIC_API_URL
- Check browser console for errors

---

## 🎯 You're Here

✅ Backend code ready  
✅ Git configured  
✅ Documentation complete  

🔲 Create GitHub repo  
🔲 Push code  
🔲 Deploy to Railway  
🔲 Connect frontend  

---

## Next Action

**Do this now**:

1. Go to https://github.com/new
2. Create repo: `vulhub-backend`
3. Run the push commands from **Step 2** above
4. Tell me when done!

---

## 🚀 Let's Go!

You're ~20 minutes away from a fully deployed, live app.

Create that GitHub repo and let's finish this! 💪


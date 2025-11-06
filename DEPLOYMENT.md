# Backend Deployment Guide (Railway)

## Quick Start

### 1. Create GitHub Repository

1. Go to https://github.com/new
2. Create repo: `vulhub-backend`
3. Make it **Public** or **Private** (your choice)
4. Don't initialize with README (we already have one)

### 2. Push to GitHub

```bash
# From the vulhub-backend directory
git remote add origin https://github.com/YOUR_USERNAME/vulhub-backend.git
git branch -M main
git push -u origin main
```

### 3. Deploy to Railway

**Prerequisites**: 
- Railway account (sign up at https://railway.app)
- GitHub repo pushed

**Steps**:

1. Go to https://railway.app
2. Click **New Project**
3. Select **Deploy from GitHub**
4. Connect GitHub account (if not already connected)
5. Select `vulhub-backend` repo
6. Railway will auto-detect Node.js and build
7. Wait for build to complete

### 4. Configure Environment Variables

In Railway Dashboard → Your Project → Variables:

```env
# Database
DATABASE_URL=file:./prisma/prod.db

# Environment
NODE_ENV=production

# JWT Configuration
JWT_SECRET=GENERATE_A_RANDOM_STRING_HERE
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=GENERATE_A_DIFFERENT_RANDOM_STRING_HERE
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URL (for CORS)
CORS_ORIGIN=https://your-app-name.vercel.app
```

**To generate random secrets**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Get Your Railway Domain

Once deployed:
1. Go to Railway Dashboard
2. Click your project
3. Click the **Deployments** tab
4. You'll see a URL like: `https://your-app-production.up.railway.app`
5. Copy this domain

### 6. Run Database Migrations

Option A: Via Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Run migrations
railway run npm run prisma:deploy
```

Option B: Via Railway Dashboard
1. Click your project
2. Click **Shell**
3. Run: `npm run prisma:deploy`

---

## Health Check

Verify deployment is working:

```bash
# Replace with your Railway domain
curl https://your-app-production.up.railway.app/health

# Expected response:
# {"status":"ok"}
```

---

## Logs

View real-time logs:
1. Railway Dashboard → Your Project → Logs
2. Check for any errors
3. Look for "Health check passed" message

---

## Troubleshooting

### Build Fails
- Check Railway logs
- Verify all environment variables are set
- Ensure package.json has correct scripts

### Migration Fails
- Check Railway logs
- Verify DATABASE_URL is set
- Try running locally first: `npm run prisma:deploy`

### Can't Connect from Frontend
- Check CORS_ORIGIN matches your Vercel domain exactly
- Verify Railway domain is accessible (curl it)
- Check browser console for CORS errors

---

## Local Development

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local

# Run migrations
npm run prisma:migrate

# Start development server
npm run start:dev
```

---

## Next Steps

After deployment:
1. Get your Railway domain
2. Update frontend `NEXT_PUBLIC_API_URL` in Vercel
3. Redeploy frontend
4. Test end-to-end


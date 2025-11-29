# Migration to Independent Supabase & Vercel System

This guide walks you through setting up your own independent Supabase backend and Vercel frontend deployment, with fully automated CI/CD via GitHub Actions.

## 🎯 What You'll Get

After completing this guide, you'll have:
- ✅ Your own Supabase project with all database tables and functions
- ✅ Your own Vercel deployment with custom domain support
- ✅ Automated deployments on every push to main
- ✅ Preview deployments for every pull request
- ✅ Automated database migrations

## 📋 Prerequisites

1. **GitHub Account** (free) - [github.com](https://github.com)
2. **Supabase Account** (free tier available) - [supabase.com](https://supabase.com)
3. **Vercel Account** (free tier available) - [vercel.com](https://vercel.com)
4. **Node.js 18+** installed locally - [nodejs.org](https://nodejs.org)

## 🚀 Step-by-Step Setup

### Step 1: Fork the Repository

1. Go to the repository on GitHub
2. Click the **"Fork"** button in the top right
3. This creates a copy under your GitHub account

### Step 2: Set Up Supabase

#### 2.1 Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click **"New Project"**
3. Fill in:
   - **Project Name**: `oricol-helpdesk` (or your choice)
   - **Database Password**: (save this securely - you'll need it later)
   - **Region**: Choose closest to your users
4. Click **"Create new project"**
5. Wait ~2 minutes for project creation

#### 2.2 Get Your Supabase Credentials

From your Supabase project dashboard:

1. Go to **Settings** → **API**
2. Note down:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (long JWT token)
3. Go to **Settings** → **General**
4. Note down:
   - **Project Reference ID** (e.g., `xxxxx`)
5. Go to [Account Tokens](https://supabase.com/dashboard/account/tokens)
6. Create a new token named `GitHub Actions`
7. Note down the **Access Token**

#### 2.3 Update Supabase Config

Edit `supabase/config.toml` in your forked repository:

```toml
# Replace with your Supabase project ID
project_id = "your-project-reference-id"
```

#### 2.4 Apply Database Migrations

**Option A: Using Supabase CLI (Recommended)**

```bash
# Clone your forked repository
git clone https://github.com/YOUR_USERNAME/oricol-ticket-flow.git
cd oricol-ticket-flow

# Install dependencies
npm install

# Install Supabase CLI globally
npm install -g supabase

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply all migrations
npx supabase db push
```

**Option B: Manual SQL Execution**

1. Go to your Supabase project
2. Click **SQL Editor** in the left sidebar
3. Run each migration file from `supabase/migrations/` in chronological order
4. Files are named with timestamps - run them oldest to newest

### Step 3: Set Up Vercel

#### 3.1 Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"**
4. Choose your forked repository
5. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

#### 3.2 Configure Vercel Environment Variables

In your Vercel project:
1. Go to **Settings** → **Environment Variables**
2. Add:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon key |
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project reference ID |

#### 3.3 Get Vercel Credentials

1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Create a new token named `GitHub Actions`
3. Note down the **Vercel Token**
4. In your Vercel project, go to **Settings** → **General**
5. Note down:
   - **Project ID**
   - **Team ID** (if applicable, otherwise use your personal account ID)

### Step 4: Configure GitHub Secrets

Go to your forked repository:
1. Click **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"** for each:

#### Supabase Secrets

| Secret Name | Value |
|-------------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon key |
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project reference ID |
| `SUPABASE_ACCESS_TOKEN` | Your Supabase access token |
| `SUPABASE_DB_PASSWORD` | Your Supabase database password |

#### Vercel Secrets

| Secret Name | Value |
|-------------|-------|
| `VERCEL_TOKEN` | Your Vercel token |
| `VERCEL_ORG_ID` | Your Vercel team/org ID |
| `VERCEL_PROJECT_ID` | Your Vercel project ID |

### Step 5: Configure Local Development

Create a `.env` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-ref
```

### Step 6: Test Everything

#### 6.1 Test Local Development

```bash
npm install
npm run dev
```

Visit http://localhost:8080 and verify the app loads.

#### 6.2 Test GitHub Actions

1. Make a small change (e.g., update README)
2. Commit and push to a new branch
3. Create a pull request
4. Check the **Actions** tab - workflows should run
5. Vercel should comment with a preview URL

#### 6.3 Test Production Deployment

1. Merge the pull request to main
2. Check **Actions** tab for deployment status
3. Visit your Vercel production URL

## ✅ GitHub Secrets Checklist

Use this checklist to verify all secrets are configured:

### Required for Vercel Deployment
- [ ] `VERCEL_TOKEN`
- [ ] `VERCEL_ORG_ID`
- [ ] `VERCEL_PROJECT_ID`
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] `VITE_SUPABASE_PROJECT_ID`

### Required for Database Migrations
- [ ] `SUPABASE_ACCESS_TOKEN`
- [ ] `SUPABASE_DB_PASSWORD`

## 🔄 Automated Workflows

After setup, these workflows run automatically:

| Trigger | Workflow | Action |
|---------|----------|--------|
| Push to any branch | CI | Lint, build, test |
| Push to `main` with migrations | Deploy Migrations | Apply database changes |
| Push to `main` | Deploy to Vercel | Production deployment |
| Pull request | Deploy to Vercel | Preview deployment |

## 🔧 Troubleshooting

### Build Fails

1. Check workflow logs in GitHub Actions
2. Verify all secrets are set correctly
3. Test locally with `npm run build`

### Database Connection Issues

1. Verify Supabase project is active (free tier pauses after 7 days)
2. Check environment variables are correct
3. Verify API keys haven't been rotated

### Deployment Fails

1. Check Vercel dashboard for detailed logs
2. Verify Vercel token is still valid
3. Ensure project is correctly linked

## 📚 Related Documentation

- [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) - Detailed Vercel setup
- [AUTOMATED_MIGRATION_SETUP.md](./AUTOMATED_MIGRATION_SETUP.md) - Database automation
- [GITHUB_SUPABASE_DEPLOYMENT.md](./GITHUB_SUPABASE_DEPLOYMENT.md) - Supabase setup
- [README.md](./README.md) - Project overview

## 🎉 You're Done!

Your app is now running on your own independent infrastructure:

- **Backend**: Supabase (your project)
- **Frontend**: Vercel (your deployment)
- **CI/CD**: GitHub Actions (automated)

Any changes pushed to your repository will automatically:
1. Run tests and linting
2. Apply database migrations (if any)
3. Deploy to Vercel

---

**Last Updated**: November 2025

# Vercel Deployment Guide

This guide explains how to deploy the Oricol Helpdesk app to Vercel with automated CI/CD via GitHub Actions.

## 🎯 Overview

Vercel provides:
- **Free Tier**: 100GB bandwidth/month, unlimited deployments
- **Preview Deployments**: Every PR gets a unique preview URL
- **Instant Rollbacks**: One-click rollbacks to any previous deployment
- **Edge Network**: Fast global CDN for optimal performance

## ⚡ Quick Setup (10 minutes)

### Step 1: Create a Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up for free with your GitHub account
3. This automatically links your GitHub account to Vercel

### Step 2: Import Your Project to Vercel

1. From the Vercel dashboard, click **"Add New..."** → **"Project"**
2. Select **"Import Git Repository"**
3. Choose your forked repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`

### Step 3: Configure Environment Variables in Vercel

1. In your Vercel project, go to **Settings** → **Environment Variables**
2. Add the following variables:

| Variable | Value | Environments |
|----------|-------|--------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g., `https://xxx.supabase.co`) | Production, Preview, Development |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key | Production, Preview, Development |
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project reference ID | Production, Preview, Development |

**Where to find these values:**
1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Go to **Settings** → **API**
4. Copy the **Project URL**, **anon public** key, and **Project Reference ID** (from Settings → General)

### Step 4: Get Vercel Credentials for GitHub Actions

To enable automated deployments via GitHub Actions:

1. **Get Your Vercel Token:**
   - Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - Click **"Create"**
   - Name it: `GitHub Actions - oricol-helpdesk`
   - Click **"Create Token"**
   - **Copy the token** (you won't see it again!)

2. **Get Your Vercel Org ID and Project ID:**
   - In your Vercel project dashboard
   - Go to **Settings** → **General**
   - Find **Project ID** and **Team ID** (Org ID)
   - If you don't see Team ID, look in your Vercel account settings

### Step 5: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** for each:

| Secret Name | Value |
|-------------|-------|
| `VERCEL_TOKEN` | Token from Step 4.1 |
| `VERCEL_ORG_ID` | Team ID / Org ID from Step 4.2 |
| `VERCEL_PROJECT_ID` | Project ID from Step 4.2 |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project reference ID |

### Step 6: Verify Deployment

1. Go to **Actions** tab in your GitHub repo
2. Find the **"Deploy to Vercel"** workflow
3. Click **"Run workflow"** dropdown
4. Select `main` branch
5. Click **"Run workflow"**

If successful ✅, your app is now deployed!

## 🔄 How It Works

### Automatic Deployments

| Event | Action |
|-------|--------|
| Push to `main` | Deploy to production |
| Open/update PR | Deploy preview (unique URL) |
| Merge PR to `main` | Deploy to production |
| Database migrations | Wait for completion, then deploy |

### Preview Deployments

Every pull request automatically gets:
- A unique preview URL
- Comment on the PR with the preview link
- Isolated environment for testing

### Integration with Database Migrations

The Vercel deployment workflow is configured to wait for database migrations to complete before deploying. This ensures your database schema is always in sync with your code.

## 📋 GitHub Secrets Checklist

Make sure you have all these secrets configured:

### For Vercel Deployment
- [ ] `VERCEL_TOKEN` - Vercel authentication token
- [ ] `VERCEL_ORG_ID` - Your Vercel organization/team ID
- [ ] `VERCEL_PROJECT_ID` - Your Vercel project ID

### For Supabase (shared with other workflows)
- [ ] `VITE_SUPABASE_URL` - Supabase project URL
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key
- [ ] `VITE_SUPABASE_PROJECT_ID` - Supabase project reference ID

### For Database Migrations (if using automated migrations)
- [ ] `SUPABASE_ACCESS_TOKEN` - Supabase access token
- [ ] `SUPABASE_DB_PASSWORD` - Database password

## 🔧 Troubleshooting

### "Missing required secrets" Error

**Cause**: One or more secrets are not configured

**Fix**: 
1. Check all secrets are added in GitHub → Settings → Secrets
2. Verify secret names match exactly (case-sensitive)
3. Ensure no trailing spaces in secret values

### "Build failed" Error

**Cause**: Build process failed

**Fix**:
1. Check the workflow logs for specific errors
2. Test locally with `npm run build`
3. Ensure all environment variables are set correctly

### "Deployment failed" Error

**Cause**: Vercel deployment failed

**Fix**:
1. Check Vercel dashboard for detailed error logs
2. Verify your Vercel token is still valid
3. Ensure project is correctly linked

### Preview URL Not Posted on PR

**Cause**: GitHub Actions permissions issue

**Fix**:
1. Go to repository Settings → Actions → General
2. Under "Workflow permissions", enable "Read and write permissions"
3. Re-run the workflow

## 🚀 Custom Domain Setup

### Add Your Domain to Vercel

1. In Vercel project, go to **Settings** → **Domains**
2. Add your custom domain (e.g., `helpdesk.yourdomain.com`)
3. Follow Vercel's DNS configuration instructions
4. Wait for DNS propagation (usually 1-24 hours)

### SSL Certificate

Vercel automatically provisions and renews SSL certificates for custom domains.

## 📈 Monitoring

### Vercel Dashboard

- View deployment history
- Check build logs
- Monitor bandwidth usage
- View error analytics

### GitHub Actions

- View workflow run history
- Check for failed deployments
- Debug build issues

## 💰 Cost Breakdown

**Vercel Free Tier (Hobby):**
- 100GB bandwidth/month
- Unlimited deployments
- Unlimited preview deployments
- Automatic HTTPS
- Edge functions: 1M requests/month

**When to upgrade:**
- If you exceed bandwidth limits
- Need team features
- Require advanced analytics

## 🔐 Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Use GitHub Secrets** - For CI/CD automation
3. **Rotate tokens regularly** - Update Vercel and Supabase tokens periodically
4. **Review deployments** - Monitor for unexpected deployments
5. **Limit token scopes** - Use minimal permissions needed

## 📚 Related Documentation

- **[GITHUB_SUPABASE_DEPLOYMENT.md](./GITHUB_SUPABASE_DEPLOYMENT.md)** - Complete Supabase setup
- **[AUTOMATED_MIGRATION_SETUP.md](./AUTOMATED_MIGRATION_SETUP.md)** - Database migration automation
- **[README.md](./README.md)** - Project overview
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Alternative deployment options

## ✅ Summary

After completing this setup:

1. ✅ Push to `main` → Auto-deploy to production
2. ✅ Open PR → Auto-deploy preview with unique URL
3. ✅ Merge PR → Auto-deploy to production after migrations
4. ✅ Database changes → Auto-apply migrations before deployment

**Your app is now fully automated with Vercel!** 🎉

---

**Last Updated**: November 2025
**Status**: Ready to use after secrets are configured
